import { isKycComplete, loadKycSession, saveKycSession } from "./kyc";
import type { KycSession } from "./kyc";

export const authStorageKey = "coinvera-auth-session";

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

export function saveCustomerSession(session: KycSession): KycSession {
  saveKycSession(session);
  localStorage.setItem(authStorageKey, JSON.stringify(session));
  window.dispatchEvent(new Event("coinvera-auth-updated"));
  return session;
}

export function logoutCustomer(): void {
  localStorage.removeItem(authStorageKey);
  window.dispatchEvent(new Event("coinvera-auth-updated"));
}
