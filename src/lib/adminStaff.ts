import type { AdminRole, AdminStaffAccount } from "./types";

export const staffAccountsStorageKey = "coinvera-admin-staff-accounts";

export const defaultOwnerAccount: AdminStaffAccount = {
  id: "owner-default",
  staffId: "CV-OWNER-001",
  role: "owner",
  fullName: "Owner",
  username: "owner",
  password: "1234",
  email: "",
  mobile: "",
  aadhaar: "",
  pan: "",
  accountNumber: "",
  ifsc: "",
  bankName: "",
  upiId: "",
  walletAddress: "",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

export function loadStaffAccounts(): AdminStaffAccount[] {
  try {
    const stored = JSON.parse(localStorage.getItem(staffAccountsStorageKey) || "[]") as AdminStaffAccount[];
    const byUsername = new Map<string, AdminStaffAccount>();
    [...stored, defaultOwnerAccount].forEach((account) => byUsername.set(account.username.toLowerCase(), account));
    return Array.from(byUsername.values());
  } catch {
    return [defaultOwnerAccount];
  }
}

export function saveStaffAccounts(accounts: AdminStaffAccount[]): AdminStaffAccount[] {
  const withoutDefaultOwner = accounts.filter((account) => account.id !== defaultOwnerAccount.id);
  localStorage.setItem(staffAccountsStorageKey, JSON.stringify(withoutDefaultOwner));
  window.dispatchEvent(new Event("coinvera-staff-accounts-updated"));
  return loadStaffAccounts();
}

export function upsertStaffAccount(input: Omit<AdminStaffAccount, "id" | "staffId" | "createdAt" | "updatedAt"> & { id?: string; staffId?: string }): AdminStaffAccount[] {
  const now = new Date().toISOString();
  const accounts = loadStaffAccounts();
  const existing = input.id ? accounts.find((account) => account.id === input.id) : undefined;
  const account: AdminStaffAccount = {
    ...input,
    id: existing?.id || `STAFF-${Date.now().toString(36)}`,
    staffId: existing?.staffId || input.staffId || nextStaffId(input.role, accounts),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  return saveStaffAccounts([account, ...accounts.filter((item) => item.id !== account.id)]);
}

export function setStaffAccountStatus(accountId: string, status: AdminStaffAccount["status"]): AdminStaffAccount[] {
  const accounts = loadStaffAccounts().map((account) => (account.id === accountId ? { ...account, status, updatedAt: new Date().toISOString() } : account));
  return saveStaffAccounts(accounts);
}

function nextStaffId(role: AdminRole, accounts: AdminStaffAccount[]): string {
  const prefix = role === "manager" ? "CV-MGR" : role === "operator" ? "CV-STF" : "CV-OWNER";
  const count = accounts.filter((account) => account.staffId.startsWith(prefix)).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}
