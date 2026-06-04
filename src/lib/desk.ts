import type { DeskOrder, DeskSettings, OrderStatus, TradeMode } from "./types";

export const defaultSettings: DeskSettings = {
  rates: {
    buy: 102,
    sell: 99
  },
  payment: {
    holderName: "Coinvera Exchange Desk",
    upiId: "coinvera@upi",
    upiQr: "",
    accountName: "Coinvera Exchange Desk",
    accountNumber: "123456789012",
    ifsc: "HDFC0000001",
    bankName: "HDFC Bank",
    cdmName: "Coinvera Cash Deposit",
    cdmAccountNumber: "987654321098",
    cdmIfsc: "ICIC0000001",
    cdmBankName: "ICICI Bank",
    usdtReceivingWallet: "TRC20-COINVERA-USDT-RECEIVING-WALLET",
    usdtReceivingNetwork: "USDT TRC20",
    usdtReceivingQr: ""
  }
};

export const storageKey = "usdt-inr-desk-orders";
export const settingsStorageKey = "coinvera-desk-settings";

export const statusFlow: Record<TradeMode, OrderStatus[]> = {
  buy: ["Processing", "INR Received", "USDT Released", "Completed", "Cancelled"],
  sell: ["USDT Received", "INR Paid", "Completed", "Cancelled"]
};

export function loadOrders(): DeskOrder[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]") as DeskOrder[];
  } catch {
    return [];
  }
}

export function saveOrders(orders: DeskOrder[]): void {
  localStorage.setItem(storageKey, JSON.stringify(orders));
  window.dispatchEvent(new Event("desk-orders-updated"));
}

export function loadDeskSettings(): DeskSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsStorageKey) || "{}") as Partial<DeskSettings>;
    return {
      rates: { ...defaultSettings.rates, ...stored.rates },
      payment: { ...defaultSettings.payment, ...stored.payment }
    };
  } catch {
    return defaultSettings;
  }
}

export function saveDeskSettings(settings: DeskSettings): DeskSettings {
  localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
  window.dispatchEvent(new Event("desk-settings-updated"));
  return settings;
}

export function updateOrderStatus(orderId: string, status: OrderStatus): DeskOrder[] {
  const orders = loadOrders().map((order) => (order.id === orderId ? { ...order, status } : order));
  saveOrders(orders);
  return orders;
}

export function createOrder(input: Omit<DeskOrder, "id" | "createdAt" | "inr" | "status"> & { status?: OrderStatus }): DeskOrder {
  const order: DeskOrder = {
    ...input,
    id: `ORD-${Date.now().toString().slice(-7)}`,
    createdAt: new Date().toISOString(),
    inr: input.amount * input.rate,
    status: input.status ?? (input.mode === "buy" ? "Awaiting INR" : "Awaiting USDT")
  };

  saveOrders([order, ...loadOrders()]);
  return order;
}

export function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function usdt(value: number): string {
  return `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} USDT`;
}

export function toCsv(orders: DeskOrder[]): string {
  const header = ["id", "createdAt", "type", "name", "phone", "amountUSDT", "rateINR", "totalINR", "network", "walletOrTx", "payment", "paymentMethod", "paymentReference", "paymentScreenshot", "kyc", "status"];
  const rows = orders.map((order) => {
    const values: Record<string, string | number> = {
      id: order.id,
      createdAt: order.createdAt,
      type: order.mode,
      name: order.name,
      phone: order.phone,
      amountUSDT: order.amount,
      rateINR: order.rate,
      totalINR: order.inr,
      network: order.network,
      walletOrTx: order.wallet,
      payment: order.payment,
      paymentMethod: order.paymentMethod || "",
      paymentReference: order.paymentReference || "",
      paymentScreenshot: order.paymentScreenshot || "",
      kyc: order.kyc,
      status: order.status
    };

    return header.map((key) => `"${String(values[key] ?? "").replaceAll('"', '""')}"`).join(",");
  });

  return [header.join(","), ...rows].join("\n");
}
