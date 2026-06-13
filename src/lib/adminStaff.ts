import type { AdminRole, AdminStaffAccount } from "./types";
import { saveStaffAccountsToFirebase } from "./remoteStore";

export const staffAccountsStorageKey = "coinvera-admin-staff-accounts";

export const defaultOwnerAccounts: AdminStaffAccount[] = [
  {
    id: "owner-demo",
    staffId: "CV-OWNER-000",
    role: "owner",
    fullName: "Demo Owner",
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
  },
  {
    id: "owner-primary",
    staffId: "CV-OWNER-001",
    role: "owner",
    fullName: "Owner 1",
    username: "Hey_paddie!",
    password: "Heypaddie@6969#$$",
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
  },
  {
    id: "owner-secondary",
    staffId: "CV-OWNER-002",
    role: "owner",
    fullName: "Owner 2",
    username: "Jaysawariyasethji",
    password: "Jaysawariyasethji@100#$$",
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
  }
];

export function loadStaffAccounts(): AdminStaffAccount[] {
  try {
    const stored = JSON.parse(localStorage.getItem(staffAccountsStorageKey) || "[]") as AdminStaffAccount[];
    const byUsername = new Map<string, AdminStaffAccount>();
    [...stored, ...defaultOwnerAccounts].forEach((account) => byUsername.set(account.username.toLowerCase(), account));
    return Array.from(byUsername.values());
  } catch {
    return defaultOwnerAccounts;
  }
}

export function saveStaffAccounts(accounts: AdminStaffAccount[]): AdminStaffAccount[] {
  const defaultOwnerIds = new Set(defaultOwnerAccounts.map((account) => account.id));
  const withoutDefaultOwner = accounts.filter((account) => !defaultOwnerIds.has(account.id));
  localStorage.setItem(staffAccountsStorageKey, JSON.stringify(withoutDefaultOwner));
  void saveStaffAccountsToFirebase(withoutDefaultOwner);
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

export function linkStaffAuthUid(accountId: string, authUid: string): AdminStaffAccount[] {
  const accounts = loadStaffAccounts().map((account) => (account.id === accountId ? { ...account, authUid, updatedAt: new Date().toISOString() } : account));
  return saveStaffAccounts(accounts);
}

function nextStaffId(role: AdminRole, accounts: AdminStaffAccount[]): string {
  const prefix = role === "manager" ? "CV-MGR" : role === "operator" ? "CV-STF" : role === "kyc_analyst" ? "CV-KYC" : "CV-OWNER";
  const count = accounts.filter((account) => account.staffId.startsWith(prefix)).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}
