import type { DeskOrder, DeskSettings, OrderChatMessage, OrderStatus, TradeMode } from "./types";

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
export const orderTtlMs = 30 * 60 * 1000;

export const statusFlow: Record<TradeMode, OrderStatus[]> = {
  buy: ["Processing", "INR Received", "USDT Released", "Completed", "Cancelled"],
  sell: ["USDT Received", "INR Paid", "Completed", "Cancelled"]
};

export function loadOrders(): DeskOrder[] {
  try {
    const orders = JSON.parse(localStorage.getItem(storageKey) || "[]") as DeskOrder[];
    const normalized = normalizeOrders(orders);
    if (JSON.stringify(orders) !== JSON.stringify(normalized)) {
      saveOrders(normalized);
    }
    return normalized;
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

export function updateOrder(orderId: string, patch: Partial<DeskOrder>): DeskOrder[] {
  const orders = loadOrders().map((order) => (order.id === orderId ? { ...order, ...patch } : order));
  saveOrders(orders);
  return orders;
}

export function addOrderMessage(orderId: string, message: Omit<OrderChatMessage, "id" | "at">): DeskOrder[] {
  const chatMessage: OrderChatMessage = {
    ...message,
    id: `MSG-${Date.now().toString(36)}`,
    at: new Date().toISOString()
  };
  const orders = loadOrders().map((order) => (order.id === orderId ? { ...order, chat: [...(order.chat || []), chatMessage] } : order));
  saveOrders(orders);
  return orders;
}

export function createOrder(input: Omit<DeskOrder, "id" | "createdAt" | "inr" | "status"> & { status?: OrderStatus }): DeskOrder {
  const createdAt = new Date();
  const proofText = input.paymentScreenshot ? `Customer proof uploaded: ${input.paymentScreenshot}` : "Order created.";
  const order: DeskOrder = {
    ...input,
    id: `ORD-${Date.now().toString().slice(-7)}`,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + orderTtlMs).toISOString(),
    inr: input.amount * input.rate,
    status: input.status ?? (input.mode === "buy" ? "Awaiting INR" : "Awaiting USDT"),
    customerConfirmed: false,
    adminConfirmed: false,
    chat: [
      {
        id: `MSG-${Date.now().toString(36)}`,
        at: createdAt.toISOString(),
        sender: "system",
        text: `${proofText} Complete this order within 30 minutes or it will be cancelled automatically.`,
        attachment: input.paymentScreenshot
      }
    ]
  };

  saveOrders([order, ...loadOrders()]);
  return order;
}

function normalizeOrders(orders: DeskOrder[]): DeskOrder[] {
  const now = Date.now();
  return orders.map((order) => {
    const expiresAt = order.expiresAt || new Date(new Date(order.createdAt).getTime() + orderTtlMs).toISOString();
    const shouldCancel = !["Completed", "Cancelled"].includes(order.status) && new Date(expiresAt).getTime() <= now;
    const expiryMessageExists = (order.chat || []).some((message) => message.text.includes("cancelled automatically after 30 minutes"));
    return {
      ...order,
      expiresAt,
      status: shouldCancel ? "Cancelled" : order.status,
      chat:
        shouldCancel && !expiryMessageExists
          ? [
              ...(order.chat || []),
              {
                id: `MSG-${Date.now().toString(36)}-${order.id}`,
                at: new Date().toISOString(),
                sender: "system",
                text: "Order cancelled automatically after 30 minutes."
              }
            ]
          : order.chat || []
    };
  });
}

export function money(value: number): string {
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
  return `\u20B9${amount}`;
}

export function usdt(value: number): string {
  return `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} USDT`;
}

export function toCsv(orders: DeskOrder[]): string {
  const header = ["id", "createdAt", "expiresAt", "type", "name", "phone", "amountUSDT", "rateINR", "totalINR", "network", "walletOrTx", "payment", "paymentMethod", "paymentReference", "paymentScreenshot", "adminProof", "customerConfirmed", "adminConfirmed", "kyc", "status"];
  const rows = orders.map((order) => {
    const values: Record<string, string | number> = {
      id: order.id,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt || "",
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
      adminProof: order.adminProof || "",
      customerConfirmed: order.customerConfirmed ? "yes" : "no",
      adminConfirmed: order.adminConfirmed ? "yes" : "no",
      kyc: order.kyc,
      status: order.status
    };

    return header.map((key) => `"${String(values[key] ?? "").replaceAll('"', '""')}"`).join(",");
  });

  return [header.join(","), ...rows].join("\n");
}
