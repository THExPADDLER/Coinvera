import type { DeskOrder, DeskSettings, TradeMode } from "./types";

export function dailyTradeUsed(orders: DeskOrder[], customerMobile: string, mode: TradeMode) {
  const today = new Date();
  return orders
    .filter((order) => order.mode === mode)
    .filter((order) => order.customerMobile === customerMobile || order.phone === customerMobile)
    .filter((order) => order.status !== "Cancelled")
    .filter((order) => isSameLocalDay(order.createdAt, today))
    .reduce((sum, order) => sum + order.amount, 0);
}

export function tradeLimitCheck(input: {
  amount: number;
  dailyUsed: number;
  mode: TradeMode;
  settings: DeskSettings;
}): string {
  const min = input.mode === "buy" ? input.settings.limits.buyMin : input.settings.limits.sellMin;
  const max = input.mode === "buy" ? input.settings.limits.buyMax : input.settings.limits.sellMax;
  if (!input.amount || input.amount <= 0) return "Enter valid USDT amount";
  if (input.amount < min) return `Minimum ${min} USDT required`;
  if (input.dailyUsed + input.amount > max) {
    const remaining = Math.max(0, max - input.dailyUsed);
    return `Daily ${input.mode} limit is ${max} USDT. Remaining today: ${remaining} USDT`;
  }
  return "";
}

export function dailyTradeRemaining(orders: DeskOrder[], customerMobile: string, mode: TradeMode, settings: DeskSettings) {
  const max = mode === "buy" ? settings.limits.buyMax : settings.limits.sellMax;
  return Math.max(0, max - dailyTradeUsed(orders, customerMobile, mode));
}

function isSameLocalDay(value: string, date: Date) {
  const item = new Date(value);
  return item.getFullYear() === date.getFullYear() && item.getMonth() === date.getMonth() && item.getDate() === date.getDate();
}
