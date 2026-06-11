import { saveWalletDepositsToFirebase, saveWalletLedgerToFirebase, saveWalletWithdrawalsToFirebase } from "./remoteStore";
import type { CustomerWalletBalance, Network, WalletDeposit, WalletLedgerEntry, WalletWithdrawal } from "./types";

export const walletDepositsStorageKey = "coinvera-wallet-deposits";
export const walletLedgerStorageKey = "coinvera-wallet-ledger";
export const walletWithdrawalsStorageKey = "coinvera-wallet-withdrawals";
export const walletHoldMs = 30 * 60 * 1000;

export function loadWalletDeposits(): WalletDeposit[] {
  try {
    return JSON.parse(localStorage.getItem(walletDepositsStorageKey) || "[]") as WalletDeposit[];
  } catch {
    return [];
  }
}

export function saveWalletDeposits(deposits: WalletDeposit[]): WalletDeposit[] {
  try {
    localStorage.setItem(walletDepositsStorageKey, JSON.stringify(deposits));
  } catch {
    console.warn("Local wallet deposit storage failed; Firebase sync will continue when configured.");
  }
  void saveWalletDepositsToFirebase(deposits);
  window.dispatchEvent(new Event("coinvera-wallet-updated"));
  return deposits;
}

export function loadWalletLedger(): WalletLedgerEntry[] {
  try {
    return JSON.parse(localStorage.getItem(walletLedgerStorageKey) || "[]") as WalletLedgerEntry[];
  } catch {
    return [];
  }
}

export function saveWalletLedger(entries: WalletLedgerEntry[]): WalletLedgerEntry[] {
  try {
    localStorage.setItem(walletLedgerStorageKey, JSON.stringify(entries));
  } catch {
    console.warn("Local wallet ledger storage failed; Firebase sync will continue when configured.");
  }
  void saveWalletLedgerToFirebase(entries);
  window.dispatchEvent(new Event("coinvera-wallet-updated"));
  return entries;
}

export function loadWalletWithdrawals(): WalletWithdrawal[] {
  try {
    return JSON.parse(localStorage.getItem(walletWithdrawalsStorageKey) || "[]") as WalletWithdrawal[];
  } catch {
    return [];
  }
}

export function saveWalletWithdrawals(withdrawals: WalletWithdrawal[]): WalletWithdrawal[] {
  try {
    localStorage.setItem(walletWithdrawalsStorageKey, JSON.stringify(withdrawals));
  } catch {
    console.warn("Local wallet withdrawal storage failed; Firebase sync will continue when configured.");
  }
  void saveWalletWithdrawalsToFirebase(withdrawals);
  window.dispatchEvent(new Event("coinvera-wallet-updated"));
  return withdrawals;
}

export function createWalletDeposit(input: {
  amount: number;
  customerMobile: string;
  customerName: string;
  network: Network;
  txHash: string;
  walletAddress: string;
}): WalletDeposit {
  const now = new Date();
  const deposit: WalletDeposit = {
    id: `DEP-${Date.now().toString().slice(-7)}`,
    customerMobile: input.customerMobile,
    customerName: input.customerName,
    network: input.network,
    walletAddress: input.walletAddress,
    amount: input.amount,
    txHash: input.txHash.trim(),
    status: "Pending Verification",
    createdAt: now.toISOString(),
    holdUntil: new Date(now.getTime() + walletHoldMs).toISOString()
  };
  saveWalletDeposits([deposit, ...loadWalletDeposits()]);
  addWalletLedger({
    customerMobile: input.customerMobile,
    type: "deposit_pending",
    amount: input.amount,
    depositId: deposit.id,
    note: `Deposit submitted on ${input.network}. TX: ${input.txHash.trim()}`
  });
  return deposit;
}

export function verifyWalletDeposit(depositId: string, staff: { staffId: string; staffName: string }, note = ""): WalletDeposit[] {
  let verified: WalletDeposit | undefined;
  const deposits = loadWalletDeposits().map((deposit) => {
    if (deposit.id !== depositId || deposit.status === "Available") return deposit;
    verified = {
      ...deposit,
      status: "Available",
      verifiedAt: new Date().toISOString(),
      verifiedByStaffId: staff.staffId,
      verifiedByStaffName: staff.staffName,
      adminNote: note
    };
    return verified;
  });
  saveWalletDeposits(deposits);
  if (verified) {
    addWalletLedger({
      customerMobile: verified.customerMobile,
      type: "deposit_verified",
      amount: verified.amount,
      depositId: verified.id,
      note: note || `Deposit verified by ${staff.staffId}`
    });
  }
  return deposits;
}

export function rejectWalletDeposit(depositId: string, staff: { staffId: string; staffName: string }, note = "Deposit rejected during verification."): WalletDeposit[] {
  let rejected: WalletDeposit | undefined;
  const deposits = loadWalletDeposits().map((deposit) => {
    if (deposit.id !== depositId || deposit.status === "Rejected") return deposit;
    rejected = {
      ...deposit,
      status: "Rejected",
      rejectedAt: new Date().toISOString(),
      verifiedByStaffId: staff.staffId,
      verifiedByStaffName: staff.staffName,
      adminNote: note
    };
    return rejected;
  });
  saveWalletDeposits(deposits);
  if (rejected) {
    addWalletLedger({
      customerMobile: rejected.customerMobile,
      type: "deposit_rejected",
      amount: rejected.amount,
      depositId: rejected.id,
      note
    });
  }
  return deposits;
}

export function getCustomerWalletBalance(customerMobile: string): CustomerWalletBalance {
  return loadWalletLedger()
    .filter((entry) => entry.customerMobile === customerMobile)
    .reduce<CustomerWalletBalance>(
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

export function creditWalletFromBuy(customerMobile: string, amount: number, orderId: string) {
  if (loadWalletLedger().some((entry) => entry.type === "buy_credited" && entry.orderId === orderId)) return;
  addWalletLedger({
    customerMobile,
    type: "buy_credited",
    amount,
    orderId,
    note: `${amount} USDT credited from buy order ${orderId}`
  });
}

export function lockWalletForSell(customerMobile: string, amount: number, orderId: string): boolean {
  const balance = getCustomerWalletBalance(customerMobile);
  if (balance.available + 0.000001 < amount) return false;
  addWalletLedger({
    customerMobile,
    type: "sell_locked",
    amount,
    orderId,
    note: `${amount} USDT locked for sell order ${orderId}`
  });
  return true;
}

export function completeWalletSell(customerMobile: string, amount: number, orderId: string) {
  if (loadWalletLedger().some((entry) => entry.type === "sell_completed" && entry.orderId === orderId)) return;
  addWalletLedger({
    customerMobile,
    type: "sell_completed",
    amount,
    orderId,
    note: `${amount} USDT sold through order ${orderId}`
  });
}

export function cancelWalletSell(customerMobile: string, amount: number, orderId: string) {
  if (loadWalletLedger().some((entry) => entry.type === "sell_cancelled" && entry.orderId === orderId)) return;
  addWalletLedger({
    customerMobile,
    type: "sell_cancelled",
    amount,
    orderId,
    note: `${amount} USDT returned to available wallet from cancelled order ${orderId}`
  });
}

export function createWalletWithdrawal(input: {
  address: string;
  amount: number;
  customerMobile: string;
  customerName: string;
  network: Network;
}): WalletWithdrawal | null {
  const balance = getCustomerWalletBalance(input.customerMobile);
  if (balance.available + 0.000001 < input.amount) return null;
  const withdrawal: WalletWithdrawal = {
    id: `WD-${Date.now().toString().slice(-7)}`,
    customerMobile: input.customerMobile,
    customerName: input.customerName,
    amount: input.amount,
    network: input.network,
    address: input.address.trim(),
    status: "Requested",
    createdAt: new Date().toISOString()
  };
  saveWalletWithdrawals([withdrawal, ...loadWalletWithdrawals()]);
  addWalletLedger({
    customerMobile: input.customerMobile,
    type: "withdraw_locked",
    amount: input.amount,
    withdrawalId: withdrawal.id,
    note: `${input.amount} USDT locked for withdrawal ${withdrawal.id}`
  });
  return withdrawal;
}

export function completeWalletWithdrawal(withdrawalId: string, staff: { staffId: string; staffName: string }, txHash = ""): WalletWithdrawal[] {
  if (loadWalletLedger().some((entry) => entry.type === "withdraw_completed" && entry.withdrawalId === withdrawalId)) return loadWalletWithdrawals();
  let completed: WalletWithdrawal | undefined;
  const withdrawals = loadWalletWithdrawals().map((withdrawal) => {
    if (withdrawal.id !== withdrawalId || withdrawal.status !== "Requested") return withdrawal;
    completed = {
      ...withdrawal,
      status: "Completed",
      completedAt: new Date().toISOString(),
      txHash: txHash.trim(),
      handledByStaffId: staff.staffId,
      handledByStaffName: staff.staffName
    };
    return completed;
  });
  saveWalletWithdrawals(withdrawals);
  if (completed) {
    addWalletLedger({
      customerMobile: completed.customerMobile,
      type: "withdraw_completed",
      amount: completed.amount,
      withdrawalId: completed.id,
      note: `${completed.amount} USDT withdrawal completed by ${staff.staffId}${txHash ? `. TX: ${txHash.trim()}` : ""}`
    });
  }
  return withdrawals;
}

export function cancelWalletWithdrawal(withdrawalId: string, staff: { staffId: string; staffName: string }, note = "Withdrawal cancelled by Coinvera team."): WalletWithdrawal[] {
  if (loadWalletLedger().some((entry) => entry.type === "withdraw_cancelled" && entry.withdrawalId === withdrawalId)) return loadWalletWithdrawals();
  let cancelled: WalletWithdrawal | undefined;
  const withdrawals = loadWalletWithdrawals().map((withdrawal) => {
    if (withdrawal.id !== withdrawalId || withdrawal.status !== "Requested") return withdrawal;
    cancelled = {
      ...withdrawal,
      status: "Cancelled",
      cancelledAt: new Date().toISOString(),
      adminNote: note,
      handledByStaffId: staff.staffId,
      handledByStaffName: staff.staffName
    };
    return cancelled;
  });
  saveWalletWithdrawals(withdrawals);
  if (cancelled) {
    addWalletLedger({
      customerMobile: cancelled.customerMobile,
      type: "withdraw_cancelled",
      amount: cancelled.amount,
      withdrawalId: cancelled.id,
      note
    });
  }
  return withdrawals;
}

function addWalletLedger(input: Omit<WalletLedgerEntry, "id" | "at">): WalletLedgerEntry {
  const entry: WalletLedgerEntry = {
    ...input,
    id: `LED-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString()
  };
  saveWalletLedger([entry, ...loadWalletLedger()]);
  return entry;
}
