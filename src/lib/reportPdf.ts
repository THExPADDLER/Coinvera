import { jsPDF } from "jspdf";
import { money, usdt } from "./desk";
import { getWalletDepositHoldUntil } from "./wallet";
import type { CustomerUser, DeskOrder, WalletDeposit, WalletLedgerEntry, WalletWithdrawal } from "./types";

interface ReportInput {
  customers: CustomerUser[];
  deposits: WalletDeposit[];
  from: string;
  generatedBy: string;
  ledger: WalletLedgerEntry[];
  orders: DeskOrder[];
  to: string;
  withdrawals: WalletWithdrawal[];
}

interface TableColumn<T> {
  header: string;
  width: number;
  value: (row: T) => string;
}

const page = {
  margin: 12,
  width: 297,
  height: 210
};

const colors = {
  ink: [13, 28, 25] as const,
  muted: [91, 112, 106] as const,
  teal: [0, 160, 119] as const,
  tealDark: [0, 80, 68] as const,
  line: [215, 229, 224] as const,
  pale: [241, 250, 247] as const,
  blue: [47, 100, 167] as const
};

export function downloadAdminReportPdf(input: ReportInput) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const customerByMobile = new Map(input.customers.map((customer) => [customer.mobile, customer]));
  const rangeLabel = `${formatDate(input.from)} to ${formatDate(input.to)}`;
  const fileRange = `${input.from}_to_${input.to}`;

  const totals = {
    usdtReceived: input.deposits.filter((deposit) => deposit.status !== "Rejected").reduce((sum, deposit) => sum + deposit.amount, 0),
    usdtSent:
      input.withdrawals.filter((withdrawal) => withdrawal.status === "Completed").reduce((sum, withdrawal) => sum + withdrawal.amount, 0) +
      input.orders.filter((order) => order.mode === "buy" && ["USDT Released", "Completed"].includes(order.status)).reduce((sum, order) => sum + order.amount, 0),
    inrReceived: input.orders.filter((order) => order.mode === "buy" && order.status !== "Cancelled").reduce((sum, order) => sum + order.inr, 0),
    inrSent: input.orders.filter((order) => order.mode === "sell" && order.status !== "Cancelled").reduce((sum, order) => sum + order.inr, 0)
  };
  const exposure = buildExposure(input);
  const estimatedProfit = totals.inrReceived - totals.inrSent;
  const netUsdt = totals.usdtReceived - totals.usdtSent;

  drawCover(doc, rangeLabel, input.generatedBy);
  let y = 48;
  y = drawKpis(doc, y, [
    ["USDT Received", usdt(totals.usdtReceived), "Verified and pending non-rejected deposits"],
    ["USDT Sent", usdt(totals.usdtSent), "Completed withdrawals and released buy orders"],
    ["INR Received", money(totals.inrReceived), "Buy orders excluding cancelled"],
    ["INR Sent", money(totals.inrSent), "Sell payouts excluding cancelled"]
  ]);
  y = drawKpis(doc, y + 2, [
    ["Est. Profit / Net INR", money(estimatedProfit), "Cash inflow minus cash outflow for selected period"],
    ["Net USDT Movement", usdt(netUsdt), "USDT received minus sent in selected period"],
    ["Funds Stuck", `${money(exposure.totalInrStuck)} / ${usdt(exposure.totalUsdtStuck)}`, "Pending, locked, or waiting settlement"],
    ["Open Exposure", `${input.orders.filter((order) => !["Completed", "Cancelled"].includes(order.status)).length} orders`, "Orders not completed or cancelled yet"]
  ]);

  y = drawMiniSummary(doc, y + 7, [
    ["Orders", String(input.orders.length)],
    ["Wallet deposits", String(input.deposits.length)],
    ["Wallet withdrawals", String(input.withdrawals.length)],
    ["Ledger entries", String(input.ledger.length)],
    ["Report type", "Financial"]
  ]);

  y += 5;
  y = drawTable(doc, y, "Profit & Funds Exposure", exposure.rows, [
    { header: "Area", width: 50, value: (row) => row.area },
    { header: "Status", width: 44, value: (row) => row.status },
    { header: "USDT", width: 26, value: (row) => row.usdt ? numberText(row.usdt) : "-" },
    { header: "INR", width: 32, value: (row) => row.inr ? money(row.inr) : "-" },
    { header: "Meaning", width: 121, value: (row) => row.note }
  ]);

  y = drawTable(doc, y, "Orders", input.orders, [
    { header: "Order ID", width: 24, value: (order) => order.id },
    { header: "Date", width: 28, value: (order) => shortDateTime(order.createdAt) },
    { header: "Type", width: 16, value: (order) => order.mode.toUpperCase() },
    { header: "Customer", width: 42, value: (order) => customerLabel(customerByMobile, order.customerMobile || order.phone, order.name) },
    { header: "USDT", width: 20, value: (order) => numberText(order.amount) },
    { header: "Rate", width: 22, value: (order) => money(order.rate) },
    { header: "INR", width: 26, value: (order) => money(order.inr) },
    { header: "Status", width: 30, value: (order) => order.status },
    { header: "Network", width: 34, value: (order) => order.network || "-" },
    { header: "Staff", width: 31, value: (order) => order.assignedStaffId || "Unassigned" }
  ]);

  y = drawTable(doc, y + 4, "Wallet Deposits", input.deposits, [
    { header: "Deposit ID", width: 26, value: (deposit) => deposit.id },
    { header: "Date", width: 28, value: (deposit) => shortDateTime(deposit.createdAt) },
    { header: "Customer", width: 43, value: (deposit) => customerLabel(customerByMobile, deposit.customerMobile, deposit.customerName) },
    { header: "USDT", width: 22, value: (deposit) => numberText(deposit.amount) },
    { header: "Network", width: 32, value: (deposit) => deposit.network },
    { header: "Status", width: 31, value: (deposit) => deposit.status },
    { header: "Hold Until", width: 28, value: (deposit) => shortDateTime(getWalletDepositHoldUntil(deposit)) },
    { header: "TX Hash", width: 54, value: (deposit) => compact(deposit.txHash, 34) }
  ]);

  y = drawTable(doc, y + 4, "Wallet Withdrawals / Direct Wallet Transfers", input.withdrawals, [
    { header: "Withdrawal ID", width: 30, value: (withdrawal) => withdrawal.id },
    { header: "Date", width: 28, value: (withdrawal) => shortDateTime(withdrawal.createdAt) },
    { header: "Customer", width: 44, value: (withdrawal) => customerLabel(customerByMobile, withdrawal.customerMobile, withdrawal.customerName) },
    { header: "USDT", width: 22, value: (withdrawal) => numberText(withdrawal.amount) },
    { header: "Network", width: 31, value: (withdrawal) => withdrawal.network },
    { header: "Status", width: 28, value: (withdrawal) => withdrawal.status },
    { header: "Address", width: 58, value: (withdrawal) => compact(withdrawal.address, 36) },
    { header: "TX / Ref", width: 32, value: (withdrawal) => compact(withdrawal.txHash || "-", 20) }
  ]);

  y = drawTable(doc, y + 4, "Wallet Ledger", input.ledger, [
    { header: "Date", width: 29, value: (entry) => shortDateTime(entry.at) },
    { header: "Type", width: 36, value: (entry) => entry.type.replaceAll("_", " ") },
    { header: "Customer", width: 42, value: (entry) => customerLabel(customerByMobile, entry.customerMobile) },
    { header: "USDT", width: 22, value: (entry) => numberText(entry.amount) },
    { header: "Order", width: 24, value: (entry) => entry.orderId || "-" },
    { header: "Deposit", width: 24, value: (entry) => entry.depositId || "-" },
    { header: "Withdrawal", width: 28, value: (entry) => entry.withdrawalId || "-" },
    { header: "Note", width: 68, value: (entry) => entry.note }
  ]);

  drawPageNumbers(doc);
  doc.save(`coinvera-financial-report-${fileRange}.pdf`);
}

function drawCover(doc: jsPDF, rangeLabel: string, generatedBy: string) {
  doc.setFillColor(...colors.ink);
  doc.rect(0, 0, page.width, 36, "F");
  doc.setFillColor(...colors.teal);
  doc.rect(0, 35.2, page.width, 1.4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("COINVERA FINANCIAL REPORT", page.margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(219, 244, 238);
  doc.text(`Period: ${rangeLabel}`, page.margin, 25);
  doc.text(`Generated by: ${generatedBy}`, page.width - page.margin, 16, { align: "right" });
  doc.text(`Generated at: ${new Date().toLocaleString("en-IN")}`, page.width - page.margin, 25, { align: "right" });
}

function drawKpis(doc: jsPDF, y: number, cards: Array<[string, string, string]>) {
  const gap = 6;
  const cardWidth = (page.width - page.margin * 2 - gap * 3) / 4;
  cards.forEach(([label, value, note], index) => {
    const x = page.margin + index * (cardWidth + gap);
    doc.setFillColor(248, 253, 251);
    doc.setDrawColor(...colors.line);
    doc.roundedRect(x, y, cardWidth, 30, 3, 3, "FD");
    doc.setFillColor(index % 2 === 0 ? colors.teal[0] : colors.blue[0], index % 2 === 0 ? colors.teal[1] : colors.blue[1], index % 2 === 0 ? colors.teal[2] : colors.blue[2]);
    doc.roundedRect(x, y, 4, 30, 2, 2, "F");
    doc.setTextColor(...colors.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x + 8, y + 8);
    doc.setTextColor(...colors.ink);
    doc.setFontSize(16);
    doc.text(value, x + 8, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    doc.text(doc.splitTextToSize(note, cardWidth - 11), x + 8, y + 25);
  });
  return y + 34;
}

function drawMiniSummary(doc: jsPDF, y: number, rows: string[][]) {
  doc.setFillColor(...colors.pale);
  doc.setDrawColor(...colors.line);
  doc.roundedRect(page.margin, y, page.width - page.margin * 2, 12, 3, 3, "FD");
  const itemWidth = (page.width - page.margin * 2) / rows.length;
  rows.forEach(([label, value], index) => {
    const x = page.margin + index * itemWidth + 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...colors.tealDark);
    doc.text(value, x, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.muted);
    doc.text(label, x, y + 9);
  });
  return y + 15;
}

function drawTable<T>(doc: jsPDF, y: number, title: string, rows: T[], columns: Array<TableColumn<T>>) {
  y = ensureSpace(doc, y, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.ink);
  doc.text(`${title} (${rows.length})`, page.margin, y);
  y += 5;

  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = Math.min(1, (page.width - page.margin * 2) / tableWidth);
  const widths = columns.map((column) => column.width * scale);
  y = drawTableHeader(doc, y, columns, widths);

  if (rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.muted);
    doc.setFontSize(9);
    doc.text("No records found in this period.", page.margin + 2, y + 7);
    return y + 14;
  }

  rows.forEach((row, rowIndex) => {
    const cells = columns.map((column, index) => {
      const width = widths[index] - 3;
      return doc.splitTextToSize(column.value(row) || "-", width) as string[];
    });
    const rowHeight = Math.max(8, Math.max(...cells.map((cell) => cell.length)) * 3.8 + 4);
    if (y + rowHeight + 8 >= page.height - 14) {
      doc.addPage();
      y = 16;
      y = drawTableHeader(doc, y, columns, widths);
    }

    doc.setFillColor(rowIndex % 2 === 0 ? 255 : 249, rowIndex % 2 === 0 ? 255 : 252, rowIndex % 2 === 0 ? 255 : 250);
    doc.rect(page.margin, y, page.width - page.margin * 2, rowHeight, "F");
    doc.setDrawColor(235, 242, 239);
    doc.line(page.margin, y + rowHeight, page.width - page.margin, y + rowHeight);

    let x = page.margin;
    cells.forEach((lines, index) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...colors.ink);
      doc.text(lines.slice(0, 3), x + 1.5, y + 4.5);
      x += widths[index];
    });
    y += rowHeight;
  });

  return y + 6;
}

function drawTableHeader<T>(doc: jsPDF, y: number, columns: Array<TableColumn<T>>, widths: number[]) {
  doc.setFillColor(...colors.tealDark);
  doc.roundedRect(page.margin, y, page.width - page.margin * 2, 8, 2, 2, "F");
  let x = page.margin;
  columns.forEach((column, index) => {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(column.header.toUpperCase(), x + 1.5, y + 5.2);
    x += widths[index];
  });
  return y + 8;
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed < page.height - 14) return y;
  doc.addPage();
  return 16;
}

function drawPageNumbers(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let index = 1; index <= pages; index += 1) {
    doc.setPage(index);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text(`Coinvera report | Page ${index} of ${pages}`, page.width - page.margin, page.height - 7, { align: "right" });
  }
}

function buildExposure(input: ReportInput) {
  const wallet = input.ledger.reduce(
    (balance, entry) => {
      if (entry.type === "deposit_pending") balance.pending += entry.amount;
      if (entry.type === "deposit_verified") {
        balance.pending -= entry.amount;
        balance.available += entry.amount;
      }
      if (entry.type === "deposit_rejected") balance.pending -= entry.amount;
      if (entry.type === "buy_credited") balance.available += entry.amount;
      if (entry.type === "sell_locked") {
        balance.available -= entry.amount;
        balance.locked += entry.amount;
      }
      if (entry.type === "sell_completed") balance.locked -= entry.amount;
      if (entry.type === "sell_cancelled") {
        balance.locked -= entry.amount;
        balance.available += entry.amount;
      }
      if (entry.type === "withdraw_locked") {
        balance.available -= entry.amount;
        balance.locked += entry.amount;
      }
      if (entry.type === "withdraw_completed") balance.locked -= entry.amount;
      if (entry.type === "withdraw_cancelled") {
        balance.locked -= entry.amount;
        balance.available += entry.amount;
      }
      return balance;
    },
    { available: 0, pending: 0, locked: 0 }
  );
  const pendingDeposits = input.deposits.filter((deposit) => deposit.status === "Pending Verification").reduce((sum, deposit) => sum + deposit.amount, 0);
  const requestedWithdrawals = input.withdrawals.filter((withdrawal) => withdrawal.status === "Requested").reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
  const openBuyInr = input.orders.filter((order) => order.mode === "buy" && !["Completed", "Cancelled"].includes(order.status)).reduce((sum, order) => sum + order.inr, 0);
  const openBuyUsdt = input.orders.filter((order) => order.mode === "buy" && !["Completed", "Cancelled"].includes(order.status)).reduce((sum, order) => sum + order.amount, 0);
  const openSellInr = input.orders.filter((order) => order.mode === "sell" && !["Completed", "Cancelled"].includes(order.status)).reduce((sum, order) => sum + order.inr, 0);
  const openSellUsdt = input.orders.filter((order) => order.mode === "sell" && !["Completed", "Cancelled"].includes(order.status)).reduce((sum, order) => sum + order.amount, 0);
  const rows = [
    {
      area: "Estimated profit / net cash",
      status: "Estimated",
      usdt: 0,
      inr: input.orders.filter((order) => order.mode === "buy" && order.status !== "Cancelled").reduce((sum, order) => sum + order.inr, 0) - input.orders.filter((order) => order.mode === "sell" && order.status !== "Cancelled").reduce((sum, order) => sum + order.inr, 0),
      note: "INR received minus INR sent in this report period. Exact profit needs USDT cost-basis tracking."
    },
    {
      area: "Pending wallet deposits",
      status: "Awaiting verification",
      usdt: pendingDeposits,
      inr: 0,
      note: "USDT deposit entries not yet marked available or rejected."
    },
    {
      area: "Customer wallet available",
      status: "Held with Coinvera",
      usdt: Math.max(0, wallet.available),
      inr: 0,
      note: "Verified USDT still available in customer Coinvera wallets."
    },
    {
      area: "Customer wallet locked",
      status: "Order / withdrawal lock",
      usdt: Math.max(0, wallet.locked),
      inr: 0,
      note: "USDT locked for sell orders or withdrawal requests."
    },
    {
      area: "Withdrawal requests",
      status: "Awaiting send",
      usdt: requestedWithdrawals,
      inr: 0,
      note: "USDT withdrawal requests not yet completed or cancelled."
    },
    {
      area: "Open buy orders",
      status: "INR expected / USDT liability",
      usdt: openBuyUsdt,
      inr: openBuyInr,
      note: "Customer buy orders still open. INR may be pending and USDT may still need release."
    },
    {
      area: "Open sell orders",
      status: "INR payable",
      usdt: openSellUsdt,
      inr: openSellInr,
      note: "Customer sell orders still open. INR payout may still need settlement."
    }
  ];
  return {
    rows,
    totalInrStuck: openBuyInr + openSellInr,
    totalUsdtStuck: Math.max(0, wallet.pending) + Math.max(0, wallet.locked) + pendingDeposits + requestedWithdrawals + openBuyUsdt + openSellUsdt
  };
}

function customerLabel(customers: Map<string, CustomerUser>, mobile: string, fallbackName = "") {
  const customer = customers.get(mobile);
  return compact(`${customer?.fullName || fallbackName || "Customer"} | ${mobile}${customer?.email ? ` | ${customer.email}` : ""}`, 38);
}

function formatDate(value: string) {
  if (!value) return "All time";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function shortDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function numberText(value: number) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function compact(value: string, max: number) {
  if (!value || value.length <= max) return value || "-";
  return `${value.slice(0, Math.max(8, max - 8))}...${value.slice(-4)}`;
}
