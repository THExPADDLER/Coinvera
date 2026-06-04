import type { OrderStatus, TradeMode } from "../lib/types";

interface StatusPillProps {
  label: OrderStatus | "Buy USDT" | "Sell USDT";
  mode?: TradeMode;
}

export function StatusPill({ label, mode }: StatusPillProps) {
  const tone = label === "Cancelled" ? "danger" : label === "Completed" ? "success" : mode === "sell" ? "blue" : "green";
  return <span className={`pill ${tone}`}>{label}</span>;
}
