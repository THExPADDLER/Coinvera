import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { isKycComplete, kycStorageKey, loadKycSession, saveKycSession } from "./kyc";
import type { KycSession } from "./kyc";
import type { CustomerUser } from "./types";
import { getFirebaseServices } from "./firebase";
import { saveUsersToFirebase } from "./remoteStore";

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
  const services = getFirebaseServices();
  if (services?.auth.currentUser) {
    void signOut(services.auth);
  }
  localStorage.removeItem(authStorageKey);
  localStorage.removeItem(kycStorageKey);
  window.dispatchEvent(new Event("coinvera-auth-updated"));
}

export async function signupCustomer(input: { fullName: string; mobile: string; email: string; password: string }): Promise<KycSession> {
  const fallbackSession = makeCompleteSession({ fullName: input.fullName, mobile: input.mobile });
  const services = getFirebaseServices();
  if (!services || !input.email || !input.password) {
    return saveCustomerSession(fallbackSession, input.email);
  }

  const credential = await createUserWithEmailAndPassword(services.auth, input.email, input.password);
  if (input.fullName.trim()) {
    await updateProfile(credential.user, { displayName: input.fullName.trim() });
  }
  const session = { ...fallbackSession, authUid: credential.user.uid };
  return saveCustomerSession(session, input.email);
}

export async function signinCustomer(input: { email: string; password: string }): Promise<KycSession> {
  const services = getFirebaseServices();
  if (!services) {
    const user = loadCustomerUsers().find((item) => item.email?.trim().toLowerCase() === input.email.trim().toLowerCase());
    if (!user) throw new Error("Firebase Auth is not configured. Use signup once on this browser first.");
    return saveCustomerSession(makeCompleteSession({ fullName: user.fullName, mobile: user.mobile, authUid: user.authUid }), user.email);
  }

  const credential = await signInWithEmailAndPassword(services.auth, input.email, input.password);
  const user = loadCustomerUsers().find((item) => item.authUid === credential.user.uid || item.email?.trim().toLowerCase() === input.email.trim().toLowerCase());
  if (!user) {
    throw new Error("This Firebase account is not linked to a Coinvera profile yet. Please signup once with mobile number.");
  }
  return saveCustomerSession(makeCompleteSession({ fullName: user.fullName, mobile: user.mobile, authUid: credential.user.uid }), user.email);
}

export function loadCustomerUsers(): CustomerUser[] {
  try {
    return JSON.parse(localStorage.getItem(usersStorageKey) || "[]") as CustomerUser[];
  } catch {
    return [];
  }
}

export function saveCustomerUsers(users: CustomerUser[]): CustomerUser[] {
  try {
    localStorage.setItem(usersStorageKey, JSON.stringify(users));
  } catch {
    console.warn("Local user storage failed; Firebase sync will continue when configured.");
  }
  void saveUsersToFirebase(users);
  window.dispatchEvent(new Event("coinvera-users-updated"));
  return users;
}

export function upsertCustomerUser(session: KycSession, email = ""): CustomerUser {
  const mobile = session.mobile.trim();
  const now = new Date().toISOString();
  const existing = loadCustomerUsers().find((user) => user.mobile === mobile || (session.authUid && user.authUid === session.authUid));
  const user: CustomerUser = {
    id: existing?.id || `CUS-${Date.now().toString().slice(-7)}`,
    authUid: session.authUid || existing?.authUid,
    fullName: session.fullName || existing?.fullName || "Coinvera Customer",
    mobile,
    email: email || existing?.email || "",
    createdAt: existing?.createdAt || session.completedAt || now,
    lastLoginAt: now,
    status: "active"
  };
  saveCustomerUsers([user, ...loadCustomerUsers().filter((item) => item.id !== user.id && item.mobile !== mobile && (!session.authUid || item.authUid !== session.authUid))]);
  return user;
}

function makeCompleteSession(input: { fullName: string; mobile: string; authUid?: string }): KycSession {
  return {
    authUid: input.authUid,
    fullName: input.fullName || "Coinvera Customer",
    mobile: input.mobile,
    mobileVerified: true,
    aadhaarLast4: "",
    aadhaarVerified: true,
    pan: "NOT-REQUIRED",
    panVerified: true,
    digilockerVerified: true,
    consentAccepted: true,
    completedAt: new Date().toISOString()
  };
}
