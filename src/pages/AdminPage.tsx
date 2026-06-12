import { ArrowLeft, ClipboardList, Copy, Download, Eye, Lock, LogOut, PackageCheck, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, Star, Trash2, UserPlus, UsersRound, Wallet } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { StatusPill } from "../components/StatusPill";
import { Toast } from "../components/Toast";
import { loadCustomerUsers } from "../lib/auth";
import { addActivityLog, addOrderMessage, assignOrderToStaff, loadActivityLogs, loadDeskSettings, loadOrders, money, saveDeskSettings, statusFlow, updateOrder, updateOrderStatus, usdt } from "../lib/desk";
import type { AdminActivityLog, AdminRole, AdminStaffAccount, BankAccountOption, BlockchainDeposit, CustomerUser, CustomerWalletBalance, DeskOrder, DeskSettings, OrderStatus, WalletDeposit, WalletLedgerEntry, WalletWithdrawal } from "../lib/types";
import { ImageCropModal } from "../components/ImageCropModal";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { imageFileToCompressedDataUrl, isImageData } from "../lib/files";
import { cancelWalletSell, cancelWalletWithdrawal, completeWalletSell, completeWalletWithdrawal, creditWalletFromBuy, getWalletDepositHoldUntil, loadWalletDeposits, loadWalletLedger, loadWalletWithdrawals, rejectWalletDeposit, verifyWalletDeposit } from "../lib/wallet";
import { syncFirebaseToLocal } from "../lib/remoteStore";
import { deleteReview, loadReviews, saveReview, type CustomerReview } from "../lib/reviews";
import { maskAddress, maskEmail, maskMobile } from "../lib/mask";
import { loadStaffAccounts, setStaffAccountStatus, upsertStaffAccount } from "../lib/adminStaff";

interface AdminUser {
  username: string;
  role: AdminRole;
  label: string;
  staffId: string;
}

const rolePermissions: Record<AdminRole, {
  canEditSettings: boolean;
  canExport: boolean;
  canUploadProof: boolean;
  canComplete: boolean;
  canChangeStatus: boolean;
  canManageReviews: boolean;
}> = {
  owner: { canEditSettings: true, canExport: true, canUploadProof: true, canComplete: true, canChangeStatus: true, canManageReviews: true },
  manager: { canEditSettings: false, canExport: true, canUploadProof: true, canComplete: true, canChangeStatus: true, canManageReviews: true },
  operator: { canEditSettings: false, canExport: false, canUploadProof: true, canComplete: true, canChangeStatus: true, canManageReviews: false }
};

type AdminSection = "home" | "orders" | "users" | "settings" | "wallets" | "reviews" | "staff" | "logs";

export function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [walletDeposits, setWalletDeposits] = useState<WalletDeposit[]>([]);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [walletWithdrawals, setWalletWithdrawals] = useState<WalletWithdrawal[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<AdminStaffAccount[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [settings, setSettings] = useState<DeskSettings>(loadDeskSettings());
  const [toast, setToast] = useState("");
  const [cropTarget, setCropTarget] = useState<{ draft: DeskSettings; file: File; type: "upi" | "chain"; index?: number } | null>(null);
  const [previewProof, setPreviewProof] = useState<{ src: string; alt: string } | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("home");
  const [reportFrom, setReportFrom] = useState(() => inputDate(daysAgo(30)));
  const [reportTo, setReportTo] = useState(() => inputDate(new Date()));
  const permissions = adminUser ? rolePermissions[adminUser.role] : rolePermissions.operator;

  const activeOrders = useMemo(() => orders.filter((order) => !["Completed", "Cancelled"].includes(order.status)), [orders]);
  const visibleOrders = useMemo(() => {
    if (!adminUser) return [];
    if (adminUser.role !== "operator") return orders;
    return orders.filter((order) => !["Completed", "Cancelled"].includes(order.status) && (!order.assignedStaffId || order.assignedStaffId === adminUser.staffId));
  }, [adminUser, orders]);
  const summary = useMemo(
    () => {
      const walletBalance = deskWalletBalance(walletLedger);
      return {
        open: activeOrders.length,
        volume: activeOrders.reduce((sum, order) => sum + order.amount, 0) + walletBalance.available + walletBalance.locked,
        receivable: activeOrders.filter((order) => order.mode === "buy").reduce((sum, order) => sum + order.inr, 0),
        payable: activeOrders.filter((order) => order.mode === "sell").reduce((sum, order) => sum + order.inr, 0)
      };
    },
    [activeOrders, walletLedger]
  );

  useEffect(() => {
    setOrders(loadOrders());
    setUsers(loadCustomerUsers());
    setLogs(loadActivityLogs());
    setWalletDeposits(loadWalletDeposits());
    setWalletLedger(loadWalletLedger());
    setWalletWithdrawals(loadWalletWithdrawals());
    setReviews(loadReviews());
    setStaffAccounts(loadStaffAccounts());
    const sync = () => {
      setOrders(loadOrders());
      setUsers(loadCustomerUsers());
      setSettings(loadDeskSettings());
      setLogs(loadActivityLogs());
      setWalletDeposits(loadWalletDeposits());
      setWalletLedger(loadWalletLedger());
      setWalletWithdrawals(loadWalletWithdrawals());
      setReviews(loadReviews());
      setStaffAccounts(loadStaffAccounts());
      setLastSyncAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    const liveSync = window.setInterval(() => {
      void syncFirebaseToLocal().finally(sync);
    }, 1000);
    window.addEventListener("desk-orders-updated", sync);
    window.addEventListener("desk-settings-updated", sync);
    window.addEventListener("coinvera-activity-log-updated", sync);
    window.addEventListener("coinvera-users-updated", sync);
    window.addEventListener("coinvera-wallet-updated", sync);
    window.addEventListener("coinvera-reviews-updated", sync);
    window.addEventListener("coinvera-staff-accounts-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(liveSync);
      window.removeEventListener("desk-orders-updated", sync);
      window.removeEventListener("desk-settings-updated", sync);
      window.removeEventListener("coinvera-activity-log-updated", sync);
      window.removeEventListener("coinvera-users-updated", sync);
      window.removeEventListener("coinvera-wallet-updated", sync);
      window.removeEventListener("coinvera-reviews-updated", sync);
      window.removeEventListener("coinvera-staff-accounts-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function unlock() {
    const found = loadStaffAccounts().find((user) => user.username.trim().toLowerCase() === username.trim().toLowerCase() && user.password === password && user.status === "active");
    if (!found) {
      setToast("Incorrect admin credentials");
      return;
    }
    setAdminUser({ username: found.username, role: found.role, label: found.fullName || found.role, staffId: found.staffId });
    setLogs(addActivityLog({ staffId: found.staffId, staffName: found.fullName || found.role, role: found.role, action: "Signed in to admin panel" }));
    setUsername("");
    setPassword("");
    setActiveSection("home");
    setToast(`${found.fullName || found.role} access unlocked`);
  }

  function changeStatus(orderId: string, status: OrderStatus) {
    if (!permissions.canChangeStatus) {
      setToast("This role cannot change order status");
      return;
    }
    const order = orders.find((item) => item.id === orderId);
    if (!canWorkOrder(order)) {
      setToast("This order is not available for your role");
      return;
    }
    setOrders(updateOrderStatus(orderId, status));
    if (order?.mode === "sell" && order.customerMobile && status === "Cancelled") {
      cancelWalletSell(order.customerMobile, order.amount, order.id);
    }
    if (order?.mode === "sell" && order.customerMobile && status === "Completed") {
      completeWalletSell(order.customerMobile, order.amount, order.id);
    }
    if (order?.mode === "buy" && order.customerMobile && order.deliveryMethod === "wallet" && status === "Completed") {
      creditWalletFromBuy(order.customerMobile, order.amount, order.id);
    }
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: `Changed status to ${status}`, orderId }));
    }
  }

  function takeChat(order: DeskOrder) {
    if (!adminUser || !canWorkOrder(order)) {
      setToast("This role cannot take chats");
      return;
    }
    setOrders(assignOrderToStaff(order.id, { staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role }));
    setOrders(addOrderMessage(order.id, { sender: "system", text: `${adminUser.label} (${adminUser.staffId}) is now handling this chat.` }));
    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: order.assignedStaffId ? "Reassigned chat to self" : "Took chat", orderId: order.id }));
    setToast(`${order.id} assigned to ${adminUser.staffId}`);
  }

  async function openOrder(order: DeskOrder) {
    if (!adminUser) {
      setToast("This role cannot open orders");
      return;
    }
    await syncFirebaseToLocal();
    const latest = loadOrders().find((item) => item.id === order.id);
    if (!latest) {
      setToast("Order not found after live refresh");
      return;
    }
    if (["Completed", "Cancelled"].includes(latest.status)) {
      setToast("Closed orders cannot be reopened");
      return;
    }
    const canOverride = adminUser.role === "owner" || adminUser.role === "manager";
    if (latest.assignedStaffId && latest.assignedStaffId !== adminUser.staffId && !canOverride) {
      setOrders(loadOrders());
      setToast(`Already opened by ${latest.assignedStaffId}`);
      return;
    }
    const wasAssignedToOther = latest.assignedStaffId && latest.assignedStaffId !== adminUser.staffId;
    setOrders(assignOrderToStaff(latest.id, { staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role }));
    setOrders(addOrderMessage(latest.id, {
      sender: "system",
      text: `${adminUser.label} (${adminUser.staffId}) opened and locked this order.`
    }));
    setLogs(addActivityLog({
      staffId: adminUser.staffId,
      staffName: adminUser.label,
      role: adminUser.role,
      action: wasAssignedToOther ? "Overrode and opened order" : "Opened and locked order",
      orderId: latest.id,
      detail: wasAssignedToOther ? `Previously assigned to ${latest.assignedStaffId}` : `Order locked to ${adminUser.staffId}`
    }));
    window.location.href = `/chat/${latest.id}?admin=1&staffId=${encodeURIComponent(adminUser.staffId)}&staffName=${encodeURIComponent(adminUser.label)}&role=${adminUser.role}`;
  }

  async function uploadAdminProof(order: DeskOrder, file: File | undefined) {
    if (!permissions.canUploadProof) {
      setToast("This role cannot upload proof");
      return;
    }
    if (!file) return;
    if (!canWorkOrder(order)) {
      setToast("This order is not available for your role");
      return;
    }
    let proof = "";
    try {
      proof = await imageFileToCompressedDataUrl(file);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not upload proof");
      return;
    }
    updateOrder(order.id, { adminProof: proof, adminConfirmed: true, status: order.mode === "buy" ? "USDT Released" : "INR Paid" });
    setOrders(addOrderMessage(order.id, { sender: "admin", text: order.mode === "buy" ? "USDT released. Proof uploaded from Coinvera side." : "INR payout completed. Proof uploaded from Coinvera side.", attachment: proof, staffId: adminUser?.staffId, staffName: adminUser?.label }));
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Uploaded Coinvera proof", orderId: order.id }));
    }
    setToast(`${order.id} proof uploaded`);
  }

  function completeOrder(order: DeskOrder) {
    if (!permissions.canComplete) {
      setToast("This role cannot complete orders");
      return;
    }
    if (!order.adminProof) {
      setToast("Upload Coinvera proof before completing the order");
      return;
    }
    if (!canWorkOrder(order)) {
      setToast("This order is not available for your role");
      return;
    }
    updateOrder(order.id, { adminConfirmed: true, status: "Completed" });
    if (order.mode === "sell" && order.customerMobile) {
      completeWalletSell(order.customerMobile, order.amount, order.id);
    }
    if (order.mode === "buy" && order.customerMobile && order.deliveryMethod === "wallet") {
      creditWalletFromBuy(order.customerMobile, order.amount, order.id);
    }
    setOrders(addOrderMessage(order.id, { sender: "admin", text: "ORDER COMPLETED", staffId: adminUser?.staffId, staffName: adminUser?.label }));
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Completed order", orderId: order.id }));
    }
  }

  async function exportPdf() {
    if (!permissions.canExport) {
      setToast("This role cannot export reports");
      return;
    }
    if (!reportFrom || !reportTo || new Date(reportFrom) > new Date(reportTo)) {
      setToast("Select a valid report date range");
      return;
    }
    const period = periodBounds(reportFrom, reportTo);
    const filteredOrders = orders.filter((order) => inPeriod(order.createdAt, period.start, period.end));
    const filteredDeposits = walletDeposits.filter((deposit) => inPeriod(deposit.createdAt, period.start, period.end) || inPeriod(deposit.verifiedAt, period.start, period.end) || inPeriod(deposit.rejectedAt, period.start, period.end));
    const filteredWithdrawals = walletWithdrawals.filter((withdrawal) => inPeriod(withdrawal.createdAt, period.start, period.end) || inPeriod(withdrawal.completedAt, period.start, period.end) || inPeriod(withdrawal.cancelledAt, period.start, period.end));
    const filteredLedger = loadWalletLedger().filter((entry) => inPeriod(entry.at, period.start, period.end));
    const filteredLogs = logs.filter((log) => inPeriod(log.at, period.start, period.end));
    const { downloadAdminReportPdf } = await import("../lib/reportPdf");
    downloadAdminReportPdf({
      activityLogs: filteredLogs,
      customers: users,
      deposits: filteredDeposits,
      from: reportFrom,
      generatedBy: `${adminUser?.label || "Admin"} (${adminUser?.staffId || "unknown"})`,
      ledger: filteredLedger,
      orders: filteredOrders,
      to: reportTo,
      withdrawals: filteredWithdrawals
    });
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Downloaded PDF report", detail: `${reportFrom} to ${reportTo}` }));
    }
    setToast("PDF report downloaded");
  }

  function copyMobile(user: CustomerUser) {
    navigator.clipboard?.writeText(user.mobile);
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Copied customer mobile", detail: user.mobile }));
    }
    setToast(`${user.mobile} copied`);
  }

  function updateSettings(next: DeskSettings) {
    if (!permissions.canEditSettings) {
      setToast("This role cannot edit website settings");
      return;
    }
    const changes = describeSettingsChanges(settings, next);
    setSettings(saveDeskSettings(next));
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: changes[0] ? `Updated settings: ${changes[0]}` : "Saved website rates/payment settings without visible changes", detail: changes.slice(1).join(" | ") }));
    }
    setToast(changes.length ? "Website settings updated and logged" : "Settings saved");
  }

  function verifyDeposit(deposit: WalletDeposit) {
    if (!adminUser || adminUser.role === "operator") {
      setToast("This role cannot verify deposits");
      return;
    }
    setWalletDeposits(verifyWalletDeposit(deposit.id, { staffId: adminUser.staffId, staffName: adminUser.label }));
    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: `Verified wallet deposit ${deposit.id}`, detail: `${deposit.amount} USDT for ${deposit.customerMobile}` }));
    setToast(`${deposit.id} verified`);
  }

  function rejectDeposit(deposit: WalletDeposit) {
    if (!adminUser || adminUser.role === "operator") {
      setToast("This role cannot reject deposits");
      return;
    }
    setWalletDeposits(rejectWalletDeposit(deposit.id, { staffId: adminUser.staffId, staffName: adminUser.label }, "Rejected by Coinvera verification team."));
    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: `Rejected wallet deposit ${deposit.id}`, detail: `${deposit.amount} USDT for ${deposit.customerMobile}` }));
    setToast(`${deposit.id} rejected`);
  }

  function completeWithdrawal(withdrawal: WalletWithdrawal) {
    if (!adminUser || adminUser.role === "operator") {
      setToast("This role cannot complete withdrawals");
      return;
    }
    const txHash = window.prompt("Enter withdrawal TX hash / transfer proof reference", withdrawal.txHash || "");
    if (txHash === null) return;
    setWalletWithdrawals(completeWalletWithdrawal(withdrawal.id, { staffId: adminUser.staffId, staffName: adminUser.label }, txHash));
    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: `Completed wallet withdrawal ${withdrawal.id}`, detail: `${withdrawal.amount} USDT to ${withdrawal.customerMobile}. TX: ${txHash || "not entered"}` }));
    setToast(`${withdrawal.id} completed`);
  }

  function cancelWithdrawal(withdrawal: WalletWithdrawal) {
    if (!adminUser || adminUser.role === "operator") {
      setToast("This role cannot cancel withdrawals");
      return;
    }
    const note = window.prompt("Cancellation note", "Withdrawal cancelled by Coinvera team.");
    if (note === null) return;
    setWalletWithdrawals(cancelWalletWithdrawal(withdrawal.id, { staffId: adminUser.staffId, staffName: adminUser.label }, note));
    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: `Cancelled wallet withdrawal ${withdrawal.id}`, detail: `${withdrawal.amount} USDT returned to ${withdrawal.customerMobile}` }));
    setToast(`${withdrawal.id} cancelled`);
  }

  function saveAdminReview(input: Omit<CustomerReview, "id" | "createdAt">) {
    if (!adminUser || !permissions.canManageReviews) {
      setToast("This role cannot manage reviews");
      return;
    }
    const nextReviews = saveReview({
      ...input,
      id: `REV-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString()
    });
    setReviews(nextReviews);
    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Added review", detail: `${input.name} - ${input.rating} stars` }));
    setToast("Review added");
  }

  function removeAdminReview(review: CustomerReview) {
    if (!adminUser || !permissions.canManageReviews) {
      setToast("This role cannot delete reviews");
      return;
    }
    setReviews(deleteReview(review.id));
    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Deleted review", detail: `${review.name} - ${review.rating} stars` }));
    setToast("Review deleted");
  }

  function canWorkOrder(order?: DeskOrder): boolean {
    if (!adminUser || !order || ["Completed", "Cancelled"].includes(order.status)) return false;
    if (adminUser.role === "owner" || adminUser.role === "manager") return true;
    return order.assignedStaffId === adminUser.staffId;
  }

  return (
    <main className="adminShell">
      <nav className="adminNav">
        <Brand dark />
        <div className="navActions">
          <a className="softButton dark" href="/">
            Customer Page
          </a>
        </div>
      </nav>

      <header className="adminHero">
        <div>
          <p className="eyebrow dark">Separated secure workspace</p>
          <h1>Coinvera Admin Desk</h1>
          <p>Pay customers, receive INR, release USDT, export orders, and monitor Coinvera settlement exposure.</p>
        </div>
        <form
          className="adminAuth"
          onSubmit={(event) => {
            event.preventDefault();
            if (!adminUser) unlock();
          }}
        >
          {!adminUser ? (
            <>
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" />
              <button className="primaryButton compact" type="submit">
                <Lock size={17} />
                Sign in
              </button>
            </>
          ) : (
            <>
              <span className={`roleBadge ${adminUser.role}`}>{adminUser.label} - {adminUser.staffId}</span>
              <span className="liveSyncBadge">Live sync {lastSyncAt || "starting"}</span>
              <button className="softButton dark" type="button" onClick={() => setOrders(loadOrders())}>
                <RefreshCw size={16} />
                Refresh
              </button>
              {permissions.canExport && (
                <div className="reportExportControls">
                  <label>
                    From
                    <input type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
                  </label>
                  <label>
                    To
                    <input type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} />
                  </label>
                  <button className="softButton dark" type="button" onClick={exportPdf}>
                    <Download size={16} />
                    PDF
                  </button>
                </div>
              )}
              <button className="softButton dark" type="button" onClick={() => setAdminUser(null)}>
                <LogOut size={16} />
                Lock
              </button>
            </>
          )}
        </form>
      </header>

      {!adminUser ? (
        <section className="lockedPanel">
          <ShieldCheck size={34} />
          <h2>Admin access required</h2>
          <p>Enter your Coinvera owner, manager, or staff credentials to continue.</p>
        </section>
      ) : (
        <>
          <section className="metricGrid">
            <Metric label="Open orders" value={String(summary.open)} />
            <Metric label="USDT volume" value={usdt(summary.volume)} />
            <Metric label="INR receivable" value={money(summary.receivable)} />
            <Metric label="INR payable" value={money(summary.payable)} />
          </section>

          {activeSection === "home" && (
            <section className="adminMenuGrid">
              <AdminMenuCard icon={<PackageCheck size={24} />} title="Orders" meta={`${orders.length} orders`} detail="Chats, proof, staff assignment, status, and completion controls." onClick={() => setActiveSection("orders")} />
              {adminUser.role !== "operator" && <AdminMenuCard icon={<UsersRound size={24} />} title="Customer Users" meta="Customer registry" detail="Customer profiles, order totals, volume, and quick actions." onClick={() => setActiveSection("users")} />}
              {adminUser.role === "owner" && <AdminMenuCard icon={<SlidersHorizontal size={24} />} title="Rates & Payment" meta="Editable" detail="Rates, UPI QR, bank accounts, CDM, and blockchain wallets." onClick={() => setActiveSection("settings")} />}
              {adminUser.role !== "operator" && <AdminMenuCard icon={<Wallet size={24} />} title="Wallet Desk" meta={`${walletDeposits.length} deposits / ${walletWithdrawals.length} withdrawals`} detail="Verify deposits, reject fake transfers, and process customer withdrawals." onClick={() => setActiveSection("wallets")} />}
              {adminUser.role !== "operator" && <AdminMenuCard icon={<Star size={24} />} title="Reviews" meta={`${reviews.length} reviews`} detail="Add dummy trust reviews and remove outdated customer feedback." onClick={() => setActiveSection("reviews")} />}
              {adminUser.role === "owner" && <AdminMenuCard icon={<UserPlus size={24} />} title="Staff Management" meta={`${staffAccounts.length} accounts`} detail="Create manager and staff logins with personal and payment details." onClick={() => setActiveSection("staff")} />}
              {adminUser.role === "owner" && <AdminMenuCard icon={<ClipboardList size={24} />} title="Activity Log" meta={`${logs.length} entries`} detail="Staff logins, assignments, proof views, status changes, and exports." onClick={() => setActiveSection("logs")} />}
            </section>
          )}

          {activeSection !== "home" && <SectionBack activeSection={activeSection} onBack={() => setActiveSection("home")} />}

          {activeSection === "settings" && adminUser.role === "owner" && (
            permissions.canEditSettings ? (
              <AdminSettings settings={settings} onCropRequest={setCropTarget} onSave={updateSettings} />
            ) : (
              <section className="adminSettings restrictedPanel">
                <h2>Website Rates & Payment Setup</h2>
                <p>Your role can view orders, but only Owner can edit rates, UPI, bank, CDM, and seller deposit details.</p>
              </section>
            )
          )}

          {activeSection === "users" && adminUser.role !== "operator" && <CustomerUsersSection users={users} orders={orders} onCopyMobile={copyMobile} />}
          {activeSection === "wallets" && adminUser.role !== "operator" && <WalletDepositsSection deposits={walletDeposits} withdrawals={walletWithdrawals} onCancelWithdrawal={cancelWithdrawal} onCompleteWithdrawal={completeWithdrawal} onReject={rejectDeposit} onVerify={verifyDeposit} />}
          {activeSection === "reviews" && adminUser.role !== "operator" && <AdminReviewsSection canManage={permissions.canManageReviews} onDelete={removeAdminReview} onSave={saveAdminReview} reviews={reviews} />}
          {activeSection === "staff" && adminUser.role === "owner" && <StaffManagementSection accounts={staffAccounts} onSave={(account) => setStaffAccounts(upsertStaffAccount(account))} onStatus={(account, status) => setStaffAccounts(setStaffAccountStatus(account.id, status))} />}

          {activeSection === "orders" && <section className="ordersSurface">
            {visibleOrders.length === 0 ? (
              <div className="emptyState">No customer orders yet.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Trade</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.id}</strong>
                          <span>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                          <span>{order.assignedStaffId ? `Agent: ${order.assignedStaffId}` : "Unassigned"}</span>
                        </td>
                        <td>
                          <strong>{order.name}</strong>
                          <span>{order.phone}</span>
                          <span>{order.kyc || "Basic account"}</span>
                        </td>
                        <td>
                          <StatusPill label={order.mode === "buy" ? "Buy USDT" : "Sell USDT"} mode={order.mode} />
                          <span>{usdt(order.amount)} at {money(order.rate)}</span>
                          <strong>{money(order.inr)}</strong>
                        </td>
                        <td>
                          <strong>{order.network}</strong>
                          <span>{order.wallet}</span>
                          <span>{order.payment}</span>
                          {order.paymentMethod && <span>Method: {order.paymentMethod.toUpperCase()}</span>}
                          {order.paymentReference && <span>Ref: {order.paymentReference}</span>}
                          {order.paymentScreenshot && <span>Customer proof: {isImageData(order.paymentScreenshot) ? "Uploaded image" : order.paymentScreenshot}</span>}
                          {order.adminProof && <span>Coinvera proof: {isImageData(order.adminProof) ? "Uploaded image" : order.adminProof}</span>}
                        </td>
                        <td>
                          <StatusPill label={order.status} mode={order.mode} />
                        </td>
                        <td>
                          <div className="actionRow">
                            <button type="button" onClick={() => openOrder(order)} disabled={["Completed", "Cancelled"].includes(order.status) || (adminUser.role === "operator" && Boolean(order.assignedStaffId && order.assignedStaffId !== adminUser.staffId))}>
                              <Lock size={15} />
                              Open Order
                            </button>
                            {(adminUser.role !== "operator" || canWorkOrder(order)) && (
                              <a className="miniLink" href={`/chat/${order.id}?admin=1&staffId=${encodeURIComponent(adminUser.staffId)}&staffName=${encodeURIComponent(adminUser.label)}&role=${adminUser.role}`}>Chat</a>
                            )}
                            {canWorkOrder(order) && <button
                              type="button"
                              onClick={() =>
                                order.paymentScreenshot && isImageData(order.paymentScreenshot)
                                  ? (setPreviewProof({ src: order.paymentScreenshot, alt: `${order.id} customer proof` }),
                                    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Viewed customer proof", orderId: order.id })))
                                  : setToast(order.paymentScreenshot ? "This older proof has only a file name. New uploads will open as images." : "No customer proof uploaded yet")
                              }
                            >
                              <Eye size={15} />
                              View Customer Proof
                            </button>}
                            {permissions.canUploadProof && canWorkOrder(order) && (
                              <label className="miniUpload">
                                Upload proof
                                <input type="file" accept="image/*" onChange={(event) => uploadAdminProof(order, event.target.files?.[0])} />
                              </label>
                            )}
                            {permissions.canComplete && canWorkOrder(order) && (
                              <button type="button" onClick={() => completeOrder(order)}>
                                Complete
                              </button>
                            )}
                            {permissions.canChangeStatus && canWorkOrder(order) ? (
                              <select className="statusSelect" value={order.status} onChange={(event) => changeStatus(order.id, event.target.value as OrderStatus)}>
                                <option value={order.status}>Status: {order.status}</option>
                                {statusFlow[order.mode].filter((status) => status !== order.status).map((status) => (
                                  <option value={status} key={status}>{status}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="readOnlyNote">Read only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>}
          {activeSection === "logs" && adminUser.role === "owner" && <section className="activityLogPanel">
            <div className="settingsHead">
              <div>
                <h2>Admin Activity Log</h2>
                <p>Staff login, chat assignment, proof upload, status updates, completion, and export actions.</p>
              </div>
              <ClipboardList size={28} />
            </div>
            {logs.length === 0 ? (
              <div className="emptyState">No admin activity recorded yet.</div>
            ) : (
              <div className="activityLogList">
                {logs.slice(0, 80).map((log) => (
                  <article className="activityLogItem" key={log.id}>
                    <div>
                      <strong>{log.staffId}</strong>
                      <span>{log.staffName} - {log.role}</span>
                    </div>
                    <p>{log.action}</p>
                    {log.detail && <small>{log.detail}</small>}
                    <span>{log.orderId || "System"} - {new Date(log.at).toLocaleString("en-IN")}</span>
                  </article>
                ))}
              </div>
            )}
          </section>}
        </>
      )}

      <Toast message={toast} onDone={() => setToast("")} />
      {cropTarget && (
        <ImageCropModal
          file={cropTarget.file}
          onCancel={() => setCropTarget(null)}
          onSave={(dataUrl) => {
            const cropDraft = cropTarget.draft;
            if (cropTarget.type === "upi") {
              updateSettings({ ...cropDraft, payment: { ...cropDraft.payment, upiQr: dataUrl } });
            } else if (typeof cropTarget.index === "number") {
              updateSettings({
                ...cropDraft,
                blockchains: cropDraft.blockchains.map((chain, index) => (index === cropTarget.index ? { ...chain, qr: dataUrl } : chain))
              });
            }
            setCropTarget(null);
          }}
        />
      )}
      {previewProof && <ImagePreviewModal src={previewProof.src} alt={previewProof.alt} onClose={() => setPreviewProof(null)} />}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metricCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminMenuCard({
  detail,
  icon,
  meta,
  onClick,
  title
}: {
  detail: string;
  icon: ReactNode;
  meta: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button className="adminMenuCard" type="button" onClick={onClick}>
      <span className="adminMenuIcon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <em>{meta}</em>
      </span>
      <small>{detail}</small>
    </button>
  );
}

function SectionBack({ activeSection, onBack }: { activeSection: AdminSection; onBack: () => void }) {
  const titles: Record<AdminSection, string> = {
    home: "Admin Dashboard",
    orders: "Orders",
    users: "Customer Users",
    settings: "Rates & Payment",
    wallets: "Wallet Desk",
    reviews: "Reviews",
    staff: "Staff Management",
    logs: "Activity Log"
  };

  return (
    <section className="sectionBackBar">
      <button className="softButton dark" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        Dashboard
      </button>
      <strong>{titles[activeSection]}</strong>
    </section>
  );
}

function describeSettingsChanges(previous: DeskSettings, next: DeskSettings): string[] {
  const changes: string[] = [];
  const addChange = (label: string, before: string | number, after: string | number) => {
    if (String(before) !== String(after)) {
      changes.push(`${label} changed from ${formatLogValue(before)} to ${formatLogValue(after)}`);
    }
  };
  const addImageChange = (label: string, before?: string, after?: string) => {
    if ((before || "") !== (after || "")) {
      changes.push(`${label} changed from ${before ? "uploaded image" : "not uploaded"} to ${after ? "uploaded image" : "not uploaded"}`);
    }
  };

  addChange("Buy price per USDT", money(previous.rates.buy), money(next.rates.buy));
  addChange("Sell price per USDT", money(previous.rates.sell), money(next.rates.sell));
  addChange("Buy minimum quantity", usdt(previous.limits.buyMin), usdt(next.limits.buyMin));
  addChange("Buy daily maximum quantity", usdt(previous.limits.buyMax), usdt(next.limits.buyMax));
  addChange("Sell minimum quantity", usdt(previous.limits.sellMin), usdt(next.limits.sellMin));
  addChange("Sell daily maximum quantity", usdt(previous.limits.sellMax), usdt(next.limits.sellMax));
  addChange("UPI holder name", previous.payment.holderName, next.payment.holderName);
  addChange("UPI ID", previous.payment.upiId, next.payment.upiId);
  addImageChange("UPI QR barcode", previous.payment.upiQr, next.payment.upiQr);

  compareBlockchainChanges("Blockchain", previous.blockchains, next.blockchains, changes);
  compareBankOptionChanges("Account transfer", previous.accountTransfers, next.accountTransfers, changes);
  compareBankOptionChanges("CDM account", previous.cdmAccounts, next.cdmAccounts, changes);

  return changes;
}

function compareBlockchainChanges(label: string, previous: BlockchainDeposit[], next: BlockchainDeposit[], changes: string[]) {
  const count = Math.max(previous.length, next.length);
  for (let index = 0; index < count; index += 1) {
    const before = previous[index];
    const after = next[index];
    const itemLabel = `${label} ${index + 1}`;
    if (!before && after) {
      changes.push(`${itemLabel} added as ${formatLogValue(after.name)}`);
      continue;
    }
    if (before && !after) {
      changes.push(`${itemLabel} removed from ${formatLogValue(before.name)}`);
      continue;
    }
    if (!before || !after) continue;
    pushFieldChange(changes, `${itemLabel} name`, before.name, after.name);
    pushFieldChange(changes, `${itemLabel} wallet`, before.wallet, after.wallet);
    if ((before.qr || "") !== (after.qr || "")) {
      changes.push(`${itemLabel} QR changed from ${before.qr ? "uploaded image" : "not uploaded"} to ${after.qr ? "uploaded image" : "not uploaded"}`);
    }
  }
}

function compareBankOptionChanges(label: string, previous: BankAccountOption[], next: BankAccountOption[], changes: string[]) {
  const count = Math.max(previous.length, next.length);
  for (let index = 0; index < count; index += 1) {
    const before = previous[index];
    const after = next[index];
    const itemLabel = `${label} ${index + 1}`;
    if (!before && after) {
      changes.push(`${itemLabel} added as ${formatLogValue(after.label)}`);
      continue;
    }
    if (before && !after) {
      changes.push(`${itemLabel} removed from ${formatLogValue(before.label)}`);
      continue;
    }
    if (!before || !after) continue;
    pushFieldChange(changes, `${itemLabel} label`, before.label, after.label);
    pushFieldChange(changes, `${itemLabel} account name`, before.accountName, after.accountName);
    pushFieldChange(changes, `${itemLabel} account number`, before.accountNumber, after.accountNumber);
    pushFieldChange(changes, `${itemLabel} IFSC`, before.ifsc, after.ifsc);
    pushFieldChange(changes, `${itemLabel} bank name`, before.bankName, after.bankName);
  }
}

function pushFieldChange(changes: string[], label: string, before: string, after: string) {
  if ((before || "") !== (after || "")) {
    changes.push(`${label} changed from ${formatLogValue(before)} to ${formatLogValue(after)}`);
  }
}

function formatLogValue(value: string | number): string {
  const text = String(value || "blank").trim() || "blank";
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

function AdminReviewsSection({
  canManage,
  onDelete,
  onSave,
  reviews
}: {
  canManage: boolean;
  onDelete: (review: CustomerReview) => void;
  onSave: (review: Omit<CustomerReview, "id" | "createdAt">) => void;
  reviews: CustomerReview[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !comment.trim()) return;
    onSave({ name: name.trim(), email: email.trim(), rating, comment: comment.trim() });
    setName("");
    setEmail("");
    setRating(5);
    setComment("");
  }

  return (
    <section className="reviewsAdminPanel">
      <div className="settingsHead">
        <div>
          <h2>Reviews Management</h2>
          <p>Add dummy trust reviews, manage public feedback, and remove outdated comments.</p>
        </div>
        <Star size={28} />
      </div>

      <div className="reviewsAdminGrid">
        <form className="reviewForm" onSubmit={submit}>
          <h2>Add Review</h2>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" disabled={!canManage} />
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Gmail address" disabled={!canManage} />
          <div className="ratingPicker">
            {[1, 2, 3, 4, 5].map((value) => (
              <button className={value <= rating ? "active" : ""} type="button" key={value} onClick={() => setRating(value)} disabled={!canManage} aria-label={`${value} star`}>
                <Star size={22} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Safe, trusted, fast transaction comment" disabled={!canManage} />
          <button className="primaryButton" type="submit" disabled={!canManage}>
            <Plus size={16} />
            Save Review
          </button>
          {!canManage && <small>Only Owner and Manager can add or delete reviews.</small>}
        </form>

        <div className="reviewList">
          {reviews.map((review) => (
            <article className="reviewCard" key={review.id}>
              <div className="reviewAvatar">{review.name.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="reviewCardHead">
                  <strong>{review.name}</strong>
                  <span className="stars">
                    {[1, 2, 3, 4, 5].map((item) => <Star className={item <= review.rating ? "filled" : ""} size={16} key={item} />)}
                  </span>
                </div>
                <span>{maskEmail(review.email)}</span>
                <p>{review.comment}</p>
                <div className="actionRow">
                  <span className="readOnlyNote">{review.id.startsWith("seed-") ? "Seed review" : "Custom review"}</span>
                  <button type="button" disabled={!canManage} onClick={() => onDelete(review)}>
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StaffManagementSection({
  accounts,
  onSave,
  onStatus
}: {
  accounts: AdminStaffAccount[];
  onSave: (account: Omit<AdminStaffAccount, "id" | "staffId" | "createdAt" | "updatedAt">) => void;
  onStatus: (account: AdminStaffAccount, status: AdminStaffAccount["status"]) => void;
}) {
  const [draft, setDraft] = useState<Omit<AdminStaffAccount, "id" | "staffId" | "createdAt" | "updatedAt">>({
    role: "operator",
    fullName: "",
    username: "",
    password: "",
    email: "",
    mobile: "",
    aadhaar: "",
    pan: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    upiId: "",
    walletAddress: "",
    status: "active"
  });

  function setField<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft({ ...draft, [key]: value });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.fullName.trim() || !draft.username.trim() || !draft.password.trim()) return;
    onSave({
      ...draft,
      username: draft.username.trim().toLowerCase(),
      email: draft.email.trim(),
      mobile: draft.mobile.trim(),
      aadhaar: draft.aadhaar.trim(),
      pan: draft.pan.trim().toUpperCase(),
      accountNumber: draft.accountNumber.trim(),
      ifsc: draft.ifsc.trim().toUpperCase(),
      bankName: draft.bankName.trim(),
      upiId: draft.upiId.trim(),
      walletAddress: draft.walletAddress?.trim()
    });
    setDraft({ ...draft, fullName: "", username: "", password: "", email: "", mobile: "", aadhaar: "", pan: "", accountNumber: "", ifsc: "", bankName: "", upiId: "", walletAddress: "" });
  }

  return (
    <section className="staffPanel">
      <div className="settingsHead">
        <div>
          <h2>Staff Management</h2>
          <p>Create manager and staff accounts. Wallet address is optional.</p>
        </div>
        <UserPlus size={28} />
      </div>

      <div className="staffManagementGrid">
        <form className="staffForm" onSubmit={submit}>
          <label>
            Role
            <select value={draft.role} onChange={(event) => setField("role", event.target.value as AdminRole)}>
              <option value="operator">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </label>
          <label>Full name<input value={draft.fullName} onChange={(event) => setField("fullName", event.target.value)} required /></label>
          <label>Username<input value={draft.username} onChange={(event) => setField("username", event.target.value)} required /></label>
          <label>Password<input value={draft.password} onChange={(event) => setField("password", event.target.value)} required /></label>
          <label>Email<input value={draft.email} onChange={(event) => setField("email", event.target.value)} /></label>
          <label>Mobile<input value={draft.mobile} onChange={(event) => setField("mobile", event.target.value)} /></label>
          <label>Aadhaar number<input value={draft.aadhaar} onChange={(event) => setField("aadhaar", event.target.value)} /></label>
          <label>PAN number<input value={draft.pan} onChange={(event) => setField("pan", event.target.value.toUpperCase())} /></label>
          <label>Account number<input value={draft.accountNumber} onChange={(event) => setField("accountNumber", event.target.value)} /></label>
          <label>IFSC<input value={draft.ifsc} onChange={(event) => setField("ifsc", event.target.value.toUpperCase())} /></label>
          <label>Bank name<input value={draft.bankName} onChange={(event) => setField("bankName", event.target.value)} /></label>
          <label>UPI ID<input value={draft.upiId} onChange={(event) => setField("upiId", event.target.value)} /></label>
          <label className="wide">Wallet address, if any<input value={draft.walletAddress} onChange={(event) => setField("walletAddress", event.target.value)} /></label>
          <button className="primaryButton wide" type="submit">Create Account</button>
        </form>

        <div className="staffCards">
          {accounts.map((account) => (
            <article className="staffCard" key={account.id}>
              <div>
                <strong>{account.fullName}</strong>
                <span>{account.staffId} - {account.role === "operator" ? "staff" : account.role}</span>
              </div>
              <div className="staffMetaGrid">
                <span>Email <strong>{maskEmail(account.email)}</strong></span>
                <span>Mobile <strong>{maskMobile(account.mobile)}</strong></span>
                <span>Aadhaar <strong>{maskAddress(account.aadhaar)}</strong></span>
                <span>PAN <strong>{maskAddress(account.pan)}</strong></span>
                <span>Account <strong>{maskAddress(account.accountNumber)}</strong></span>
                <span>UPI <strong>{account.upiId || "Not added"}</strong></span>
                <span>Wallet <strong>{maskAddress(account.walletAddress || "")}</strong></span>
                <span>Status <strong>{account.status}</strong></span>
              </div>
              {account.role !== "owner" && (
                <div className="actionRow">
                  <button type="button" onClick={() => onStatus(account, account.status === "active" ? "inactive" : "active")}>
                    {account.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomerUsersSection({
  onCopyMobile,
  orders,
  users
}: {
  onCopyMobile: (user: CustomerUser) => void;
  orders: DeskOrder[];
  users: CustomerUser[];
}) {
  const userMap = new Map<string, CustomerUser>();
  users.forEach((user) => userMap.set(user.mobile, user));
  orders.forEach((order) => {
    const mobile = order.customerMobile || order.phone;
    if (!userMap.has(mobile)) {
      userMap.set(mobile, {
        id: `CUS-${mobile.slice(-4) || "ORDER"}`,
        fullName: order.name,
        mobile,
        createdAt: order.createdAt,
        lastLoginAt: order.createdAt,
        status: "active"
      });
    }
  });

  const rows = Array.from(userMap.values()).map((user) => {
    const userOrders = orders.filter((order) => order.customerMobile === user.mobile || order.phone === user.mobile);
    const lastOrder = userOrders[0];
    return {
      user,
      buyOrders: userOrders.filter((order) => order.mode === "buy").length,
      cancelled: userOrders.filter((order) => order.status === "Cancelled").length,
      completed: userOrders.filter((order) => order.status === "Completed").length,
      inr: userOrders.reduce((sum, order) => sum + order.inr, 0),
      lastOrderAt: lastOrder?.createdAt || user.lastLoginAt,
      orders: userOrders.length,
      sellOrders: userOrders.filter((order) => order.mode === "sell").length,
      usdt: userOrders.reduce((sum, order) => sum + order.amount, 0)
    };
  });

  return (
    <section className="usersPanel">
      <div className="settingsHead">
        <div>
          <h2>Customer Users</h2>
          <p>Firebase-ready user list with order totals, volume, and quick customer actions.</p>
        </div>
        <UsersRound size={28} />
      </div>

      {rows.length === 0 ? (
        <div className="emptyState">No customer users yet. Signup/login customers will appear here.</div>
      ) : (
        <div className="userCards">
          {rows.map((row) => (
            <article className="userCard" key={row.user.id}>
              <div className="userCardHead">
                <div>
                  <strong>{row.user.fullName}</strong>
                  <span>{row.user.mobile}</span>
                  {row.user.email && <span>{row.user.email}</span>}
                </div>
                <span className="roleBadge customerId">{row.user.id}</span>
              </div>
              <div className="userStats">
                <span>Orders <strong>{row.orders}</strong></span>
                <span>Buy <strong>{row.buyOrders}</strong></span>
                <span>Sell <strong>{row.sellOrders}</strong></span>
                <span>Done <strong>{row.completed}</strong></span>
                <span>Cancel <strong>{row.cancelled}</strong></span>
                <span>USDT <strong>{usdt(row.usdt)}</strong></span>
                <span>INR <strong>{money(row.inr)}</strong></span>
                <span>Last <strong>{new Date(row.lastOrderAt).toLocaleDateString("en-IN")}</strong></span>
              </div>
              <div className="actionRow">
                <button type="button" onClick={() => onCopyMobile(row.user)}>
                  <Copy size={15} />
                  Copy mobile
                </button>
                <a className="miniLink" href="/orders">View orders</a>
                <a className="miniLink" href="/messages">Messages</a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function WalletDepositsSection({
  deposits,
  onCancelWithdrawal,
  onCompleteWithdrawal,
  onReject,
  onVerify,
  withdrawals
}: {
  deposits: WalletDeposit[];
  onCancelWithdrawal: (withdrawal: WalletWithdrawal) => void;
  onCompleteWithdrawal: (withdrawal: WalletWithdrawal) => void;
  onReject: (deposit: WalletDeposit) => void;
  onVerify: (deposit: WalletDeposit) => void;
  withdrawals: WalletWithdrawal[];
}) {
  return (
    <section className="ordersSurface walletDeskSurface">
      <div className="settingsHead">
        <div>
          <h2>Wallet Deposits</h2>
          <p>Approve after the 15 minute verification hold or once Coinvera confirms the chain transfer.</p>
        </div>
        <Wallet size={28} />
      </div>
      {deposits.length === 0 ? (
        <div className="emptyState">No wallet deposits submitted yet.</div>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Deposit</th>
                <th>Customer</th>
                <th>Network</th>
                <th>Verification</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => {
                const holdLeft = Math.max(0, new Date(getWalletDepositHoldUntil(deposit)).getTime() - Date.now());
                const holdLabel = holdLeft > 0 ? `${Math.ceil(holdLeft / 60000)} min hold left` : "Hold complete";
                return (
                  <tr key={deposit.id}>
                    <td>
                      <strong>{deposit.id}</strong>
                      <span>{new Date(deposit.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span>{deposit.status}</span>
                    </td>
                    <td>
                      <strong>{deposit.customerName}</strong>
                      <span>{deposit.customerMobile}</span>
                      <span>{usdt(deposit.amount)}</span>
                    </td>
                    <td>
                      <strong>{deposit.network}</strong>
                      <span>{deposit.walletAddress}</span>
                      <span>TX: {deposit.txHash}</span>
                    </td>
                    <td>
                      <strong>{holdLabel}</strong>
                      {deposit.verifiedByStaffId && <span>Staff: {deposit.verifiedByStaffId}</span>}
                      {deposit.adminNote && <span>{deposit.adminNote}</span>}
                    </td>
                    <td>
                      <div className="actionRow">
                        <button type="button" disabled={deposit.status !== "Pending Verification"} onClick={() => onVerify(deposit)}>Mark Verified</button>
                        <button type="button" disabled={deposit.status !== "Pending Verification"} onClick={() => onReject(deposit)}>Reject / Fake</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="settingsHead walletDeskHead">
        <div>
          <h2>Wallet Withdrawals</h2>
          <p>Complete after USDT is sent to the customer's selected network and wallet.</p>
        </div>
        <Download size={28} />
      </div>
      {withdrawals.length === 0 ? (
        <div className="emptyState">No wallet withdrawals requested yet.</div>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Withdrawal</th>
                <th>Customer</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td>
                    <strong>{withdrawal.id}</strong>
                    <span>{new Date(withdrawal.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span>{usdt(withdrawal.amount)}</span>
                  </td>
                  <td>
                    <strong>{withdrawal.customerName}</strong>
                    <span>{withdrawal.customerMobile}</span>
                  </td>
                  <td>
                    <strong>{withdrawal.network}</strong>
                    <span>{withdrawal.address}</span>
                    {withdrawal.txHash && <span>TX: {withdrawal.txHash}</span>}
                  </td>
                  <td>
                    <strong>{withdrawal.status}</strong>
                    {withdrawal.handledByStaffId && <span>Staff: {withdrawal.handledByStaffId}</span>}
                    {withdrawal.adminNote && <span>{withdrawal.adminNote}</span>}
                  </td>
                  <td>
                    <div className="actionRow">
                      <button type="button" disabled={withdrawal.status !== "Requested"} onClick={() => onCompleteWithdrawal(withdrawal)}>Mark Sent</button>
                      <button type="button" disabled={withdrawal.status !== "Requested"} onClick={() => onCancelWithdrawal(withdrawal)}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const blockchainNetworkOptions = [
  "USDT TRC20",
  "USDT BEP20 / BSC",
  "USDT ERC20",
  "USDT Polygon",
  "USDT Solana",
  "USDT Arbitrum",
  "USDT Optimism",
  "USDT TON"
];

function AdminSettings({
  onCropRequest,
  onSave,
  settings
}: {
  onCropRequest: (target: { draft: DeskSettings; file: File; type: "upi" | "chain"; index?: number }) => void;
  onSave: (settings: DeskSettings) => void;
  settings: DeskSettings;
}) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => setDraft(settings), [settings]);

  function setRate(key: "buy" | "sell", value: string) {
    setDraft({ ...draft, rates: { ...draft.rates, [key]: Number(value) } });
  }

  function setLimit(key: keyof DeskSettings["limits"], value: string) {
    setDraft({ ...draft, limits: { ...draft.limits, [key]: Number(value) } });
  }

  function setPayment(key: keyof DeskSettings["payment"], value: string) {
    setDraft({ ...draft, payment: { ...draft.payment, [key]: value } });
  }

  function setBlockchain(index: number, patch: Partial<BlockchainDeposit>) {
    setDraft({
      ...draft,
      blockchains: draft.blockchains.map((chain, chainIndex) => (chainIndex === index ? { ...chain, ...patch } : chain))
    });
  }

  function addBlockchain() {
    const id = `chain-${Date.now().toString(36)}`;
    setDraft({
      ...draft,
      blockchains: [...draft.blockchains, { id, name: "New USDT Chain", wallet: "", qr: "" }]
    });
  }

  function removeBlockchain(index: number) {
    if (draft.blockchains.length <= 1) return;
    setDraft({
      ...draft,
      blockchains: draft.blockchains.filter((_, chainIndex) => chainIndex !== index)
    });
  }

  function setAccountTransfer(index: number, patch: Partial<BankAccountOption>) {
    setDraft({
      ...draft,
      accountTransfers: draft.accountTransfers.map((account, accountIndex) => (accountIndex === index ? { ...account, ...patch } : account))
    });
  }

  function addAccountTransfer() {
    setDraft({
      ...draft,
      accountTransfers: [...draft.accountTransfers, { id: `account-${Date.now().toString(36)}`, label: "New Account Transfer", accountName: "", accountNumber: "", ifsc: "", bankName: "" }]
    });
  }

  function removeAccountTransfer(index: number) {
    if (draft.accountTransfers.length <= 1) return;
    setDraft({ ...draft, accountTransfers: draft.accountTransfers.filter((_, accountIndex) => accountIndex !== index) });
  }

  function setCdmAccount(index: number, patch: Partial<BankAccountOption>) {
    setDraft({
      ...draft,
      cdmAccounts: draft.cdmAccounts.map((account, accountIndex) => (accountIndex === index ? { ...account, ...patch } : account))
    });
  }

  function addCdmAccount() {
    setDraft({
      ...draft,
      cdmAccounts: [...draft.cdmAccounts, { id: `cdm-${Date.now().toString(36)}`, label: "New CDM Account", accountName: "", accountNumber: "", ifsc: "", bankName: "" }]
    });
  }

  function removeCdmAccount(index: number) {
    if (draft.cdmAccounts.length <= 1) return;
    setDraft({ ...draft, cdmAccounts: draft.cdmAccounts.filter((_, accountIndex) => accountIndex !== index) });
  }

  return (
    <section className="adminSettings">
      <div className="settingsHead">
        <div>
          <h2>Website Rates & Payment Setup</h2>
          <p>Updates reflect on customer buy/sell pages immediately in this browser.</p>
        </div>
        <button className="primaryButton compact" type="button" onClick={() => onSave(draft)}>Save Settings</button>
      </div>

      <div className="settingsGrid">
        <label>
          Buy price per USDT
          <input type="number" value={draft.rates.buy} onChange={(event) => setRate("buy", event.target.value)} />
        </label>
        <label>
          Sell price per USDT
          <input type="number" value={draft.rates.sell} onChange={(event) => setRate("sell", event.target.value)} />
        </label>
        <label>
          Buy minimum USDT
          <input type="number" min="0" step="0.01" value={draft.limits.buyMin} onChange={(event) => setLimit("buyMin", event.target.value)} />
        </label>
        <label>
          Buy daily max USDT
          <input type="number" min="0" step="0.01" value={draft.limits.buyMax} onChange={(event) => setLimit("buyMax", event.target.value)} />
        </label>
        <label>
          Sell minimum USDT
          <input type="number" min="0" step="0.01" value={draft.limits.sellMin} onChange={(event) => setLimit("sellMin", event.target.value)} />
        </label>
        <label>
          Sell daily max USDT
          <input type="number" min="0" step="0.01" value={draft.limits.sellMax} onChange={(event) => setLimit("sellMax", event.target.value)} />
        </label>
        <label>
          UPI holder name
          <input value={draft.payment.holderName} onChange={(event) => setPayment("holderName", event.target.value)} />
        </label>
        <label>
          UPI ID
          <input value={draft.payment.upiId} onChange={(event) => setPayment("upiId", event.target.value)} />
        </label>
        <label className="wide">
          Upload UPI QR barcode
          <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onCropRequest({ draft, file: event.target.files[0], type: "upi" })} />
        </label>
        <button className="primaryButton compact settingsSaveButton" type="button" onClick={() => onSave(draft)}>Save UPI & Rates</button>
        <div className="chainManager">
          <div className="chainManagerHead">
            <strong>Seller Blockchain Deposit Wallets</strong>
            <button type="button" onClick={addBlockchain}>Add Blockchain</button>
          </div>
          {draft.blockchains.map((chain, index) => (
            <div className="chainCard" key={chain.id}>
              <label>
                Select network
                <select
                  value={blockchainNetworkOptions.includes(chain.name) ? chain.name : "custom"}
                  onChange={(event) => setBlockchain(index, { name: event.target.value === "custom" ? "" : event.target.value })}
                >
                  {blockchainNetworkOptions.map((network) => (
                    <option value={network} key={network}>{network}</option>
                  ))}
                  <option value="custom">Custom network</option>
                </select>
              </label>
              <label>
                Display name
                <input value={chain.name} onChange={(event) => setBlockchain(index, { name: event.target.value })} placeholder="Example: USDT TRC20" />
              </label>
              <label>
                Wallet address
                <input value={chain.wallet} onChange={(event) => setBlockchain(index, { wallet: event.target.value })} placeholder="Deposit wallet address" />
              </label>
              <label>
                Upload QR
                <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onCropRequest({ draft, file: event.target.files[0], type: "chain", index })} />
              </label>
              <button className="primaryButton compact" type="button" onClick={() => onSave(draft)}>Save Blockchain</button>
              <button type="button" onClick={() => removeBlockchain(index)} disabled={draft.blockchains.length <= 1}>Remove</button>
            </div>
          ))}
        </div>
        <BankOptionManager
          title="Account Transfer Options"
          addLabel="Add Account"
          options={draft.accountTransfers}
          onAdd={addAccountTransfer}
          onRemove={removeAccountTransfer}
          onChange={setAccountTransfer}
          onSave={() => onSave(draft)}
        />
        <BankOptionManager
          title="CDM Cash Deposit Options"
          addLabel="Add CDM Account"
          options={draft.cdmAccounts}
          onAdd={addCdmAccount}
          onRemove={removeCdmAccount}
          onChange={setCdmAccount}
          onSave={() => onSave(draft)}
        />
      </div>
    </section>
  );
}

function BankOptionManager({
  addLabel,
  onAdd,
  onChange,
  onRemove,
  onSave,
  options,
  title
}: {
  addLabel: string;
  onAdd: () => void;
  onChange: (index: number, patch: Partial<BankAccountOption>) => void;
  onRemove: (index: number) => void;
  onSave: () => void;
  options: BankAccountOption[];
  title: string;
}) {
  return (
    <div className="chainManager">
      <div className="chainManagerHead">
        <strong>{title}</strong>
        <button type="button" onClick={onAdd}>{addLabel}</button>
      </div>
      {options.map((option, index) => (
        <div className="chainCard" key={option.id}>
          <label>
            Label
            <input value={option.label} onChange={(event) => onChange(index, { label: event.target.value })} placeholder="Display label" />
          </label>
          <label>
            Account name
            <input value={option.accountName} onChange={(event) => onChange(index, { accountName: event.target.value })} placeholder="Account name" />
          </label>
          <label>
            Account number
            <input value={option.accountNumber} onChange={(event) => onChange(index, { accountNumber: event.target.value })} placeholder="Account number" />
          </label>
          <label>
            IFSC
            <input value={option.ifsc} onChange={(event) => onChange(index, { ifsc: event.target.value.toUpperCase() })} placeholder="IFSC" />
          </label>
          <label>
            Bank name
            <input value={option.bankName} onChange={(event) => onChange(index, { bankName: event.target.value })} placeholder="Bank name" />
          </label>
          <button className="primaryButton compact" type="button" onClick={onSave}>Save Details</button>
          <button type="button" onClick={() => onRemove(index)} disabled={options.length <= 1}>Remove</button>
        </div>
      ))}
    </div>
  );
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function inputDate(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function periodBounds(from: string, to: string) {
  return {
    start: new Date(`${from}T00:00:00`).getTime(),
    end: new Date(`${to}T23:59:59.999`).getTime()
  };
}

function inPeriod(value: string | undefined, start: number, end: number) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= start && time <= end;
}

function deskWalletBalance(entries: WalletLedgerEntry[]): CustomerWalletBalance {
  return entries.reduce<CustomerWalletBalance>(
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
}
