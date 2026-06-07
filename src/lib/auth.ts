import { isKycComplete, loadKycSession, saveKycSession } from "./kyc";
import type { KycSession } from "./kyc";
import type { CustomerUser } from "./types";

export const authStorageKey = "coinvera-auth-session";
export const usersStorageKey = "coinvera-customer-users";

export function loadCustomerSession(): KycSession | null {
  try {
    const auth = JSON.parse(localStorage.getItem(authStorageKey) || "null") as KycSession | null;
    if (auth && isKycComplete(auth)) return auth;
    const kyc = loadKycSession();
    return isKycComplete(kyc) ? kyc : null;
  } catch {
    return null;
  }
}

export function saveCustomerSession(session: KycSession, email = ""): KycSession {
  saveKycSession(session);
  localStorage.setItem(authStorageKey, JSON.stringify(session));
  upsertCustomerUser(session, email);
  window.dispatchEvent(new Event("coinvera-auth-updated"));
  return session;
}

export function logoutCustomer(): void {
  localStorage.removeItem(authStorageKey);
  window.dispatchEvent(new Event("coinvera-auth-updated"));
}

export function loadCustomerUsers(): CustomerUser[] {
  try {
    return JSON.parse(localStorage.getItem(usersStorageKey) || "[]") as CustomerUser[];
  } catch {
    return [];
  }
}

export function saveCustomerUsers(users: CustomerUser[]): CustomerUser[] {
  localStorage.setItem(usersStorageKey, JSON.stringify(users));
  window.dispatchEvent(new Event("coinvera-users-updated"));
  return users;
}

export function upsertCustomerUser(session: KycSession, email = ""): CustomerUser {
  const mobile = session.mobile.trim();
  const now = new Date().toISOString();
  const existing = loadCustomerUsers().find((user) => user.mobile === mobile);
  const user: CustomerUser = {
    id: existing?.id || `CUS-${Date.now().toString().slice(-7)}`,
    fullName: session.fullName || existing?.fullName || "Coinvera Customer",
    mobile,
    email: email || existing?.email || "",
    createdAt: existing?.createdAt || session.completedAt || now,
    lastLoginAt: now,
    status: "active"
  };
  saveCustomerUsers([user, ...loadCustomerUsers().filter((item) => item.mobile !== mobile)]);
  return user;
}
