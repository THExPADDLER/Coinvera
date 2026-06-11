import { saveCustomerPreferencesToFirebase } from "./remoteStore";
import type { CustomerPreferences, Network, SavedPayoutMethod, SavedReceivingWallet } from "./types";

export const preferencesStorageKey = "coinvera-customer-preferences";

export function loadAllCustomerPreferences(): CustomerPreferences[] {
  try {
    return JSON.parse(localStorage.getItem(preferencesStorageKey) || "[]") as CustomerPreferences[];
  } catch {
    return [];
  }
}

export function loadCustomerPreferences(mobile: string): CustomerPreferences {
  const existing = loadAllCustomerPreferences().find((preference) => preference.mobile === mobile);
  return existing || {
    mobile,
    receivingWallets: [],
    payoutMethods: [],
    updatedAt: new Date().toISOString()
  };
}

export function saveCustomerPreferences(preferences: CustomerPreferences): CustomerPreferences {
  const next = {
    ...preferences,
    updatedAt: new Date().toISOString()
  };
  const all = [next, ...loadAllCustomerPreferences().filter((item) => item.mobile !== next.mobile)];
  try {
    localStorage.setItem(preferencesStorageKey, JSON.stringify(all));
  } catch {
    console.warn("Local customer preferences storage failed; Firebase sync will continue when configured.");
  }
  void saveCustomerPreferencesToFirebase(all);
  window.dispatchEvent(new Event("coinvera-customer-preferences-updated"));
  return next;
}

export function saveReceivingWallet(mobile: string, input: { address: string; network: Network }): CustomerPreferences {
  const address = input.address.trim();
  if (!address) return loadCustomerPreferences(mobile);
  const preferences = loadCustomerPreferences(mobile);
  const now = new Date().toISOString();
  const existing = preferences.receivingWallets.find((wallet) => wallet.address.toLowerCase() === address.toLowerCase() && wallet.network === input.network);
  const wallet: SavedReceivingWallet = {
    id: existing?.id || `WAL-${Date.now().toString(36)}`,
    label: existing?.label || `${input.network} wallet ${address.slice(0, 6)}...${address.slice(-4)}`,
    network: input.network,
    address,
    createdAt: existing?.createdAt || now,
    lastUsedAt: now
  };
  return saveCustomerPreferences({
    ...preferences,
    receivingWallets: [wallet, ...preferences.receivingWallets.filter((item) => item.id !== wallet.id)].slice(0, 12)
  });
}

export function savePayoutMethod(mobile: string, input: { type: "upi"; upiId: string } | { type: "account"; accountNumber: string; ifsc: string; bankName: string }): CustomerPreferences {
  const preferences = loadCustomerPreferences(mobile);
  const now = new Date().toISOString();
  const existing = preferences.payoutMethods.find((method) => {
    if (input.type === "upi" && method.type === "upi") return method.upiId.toLowerCase() === input.upiId.trim().toLowerCase();
    if (input.type === "account" && method.type === "account") return method.accountNumber === input.accountNumber.trim() && method.ifsc.toUpperCase() === input.ifsc.trim().toUpperCase();
    return false;
  });

  const payout: SavedPayoutMethod =
    input.type === "upi"
      ? {
          id: existing?.id || `PAY-${Date.now().toString(36)}`,
          type: "upi",
          label: existing?.label || `UPI ${input.upiId.trim()}`,
          upiId: input.upiId.trim(),
          createdAt: existing?.createdAt || now,
          lastUsedAt: now
        }
      : {
          id: existing?.id || `PAY-${Date.now().toString(36)}`,
          type: "account",
          label: existing?.label || `${input.bankName.trim() || "Bank"} ${input.accountNumber.trim().slice(-4)}`,
          accountNumber: input.accountNumber.trim(),
          ifsc: input.ifsc.trim().toUpperCase(),
          bankName: input.bankName.trim(),
          createdAt: existing?.createdAt || now,
          lastUsedAt: now
        };

  return saveCustomerPreferences({
    ...preferences,
    payoutMethods: [payout, ...preferences.payoutMethods.filter((item) => item.id !== payout.id)].slice(0, 12)
  });
}

export function removeReceivingWallet(mobile: string, walletId: string): CustomerPreferences {
  const preferences = loadCustomerPreferences(mobile);
  return saveCustomerPreferences({
    ...preferences,
    receivingWallets: preferences.receivingWallets.filter((wallet) => wallet.id !== walletId)
  });
}

export function removePayoutMethod(mobile: string, methodId: string): CustomerPreferences {
  const preferences = loadCustomerPreferences(mobile);
  return saveCustomerPreferences({
    ...preferences,
    payoutMethods: preferences.payoutMethods.filter((method) => method.id !== methodId)
  });
}
