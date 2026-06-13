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
    if (auth && isKycComplete(auth)) return refreshSessionCompliance(auth);
    const kyc = loadKycSession();
    return isKycComplete(kyc) ? refreshSessionCompliance(kyc) : null;
  } catch {
    return null;
  }
}

function refreshSessionCompliance(session: KycSession): KycSession {
  const user = loadCustomerUsers().find((item) => item.mobile === session.mobile || (session.authUid && item.authUid === session.authUid));
  if (!user) return session;
  const merged: KycSession = {
    ...session,
    aadhaarNumber: user.aadhaarNumber || session.aadhaarNumber,
    aadhaarHash: user.aadhaarHash || session.aadhaarHash,
    aadhaarLast4: user.aadhaarLast4 || session.aadhaarLast4,
    pan: user.pan || session.pan,
    panHash: user.panHash || session.panHash,
    kycStatus: user.kycStatus || session.kycStatus,
    riskStatus: user.riskStatus || session.riskStatus
  };
  localStorage.setItem(authStorageKey, JSON.stringify(merged));
  saveKycSession(merged);
  return merged;
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

export async function signupCustomer(input: { aadhaarNumber: string; fullName: string; mobile: string; email: string; pan: string; password: string }): Promise<KycSession> {
  const aadhaarNumber = normalizeAadhaar(input.aadhaarNumber);
  const pan = input.pan.trim().toUpperCase();
  if (!/^\d{12}$/.test(aadhaarNumber)) throw new Error("Enter a valid 12 digit Aadhaar number.");
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) throw new Error("Enter a valid PAN number.");
  const aadhaarHash = await hashSensitiveValue(aadhaarNumber);
  const panHash = await hashSensitiveValue(pan);
  ensureIdentityIsAvailable({ aadhaarHash, aadhaarNumber, email: input.email, mobile: input.mobile, pan, panHash });

  const fallbackSession = makeCompleteSession({ aadhaarHash, aadhaarNumber, fullName: input.fullName, kycStatus: "under_review", mobile: input.mobile, pan, panHash, riskStatus: "active" });
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
    return saveCustomerSession(makeCompleteSession({ aadhaarHash: user.aadhaarHash, aadhaarNumber: user.aadhaarNumber, authUid: user.authUid, fullName: user.fullName, kycStatus: user.kycStatus || "verified", mobile: user.mobile, pan: user.pan, panHash: user.panHash, riskStatus: user.riskStatus || "active" }), user.email);
  }

  const credential = await signInWithEmailAndPassword(services.auth, input.email, input.password);
  const user = loadCustomerUsers().find((item) => item.authUid === credential.user.uid || item.email?.trim().toLowerCase() === input.email.trim().toLowerCase());
  if (!user) {
    throw new Error("This Firebase account is not linked to a Coinvera profile yet. Please signup once with mobile number.");
  }
  return saveCustomerSession(makeCompleteSession({ aadhaarHash: user.aadhaarHash, aadhaarNumber: user.aadhaarNumber, authUid: credential.user.uid, fullName: user.fullName, kycStatus: user.kycStatus || "verified", mobile: user.mobile, pan: user.pan, panHash: user.panHash, riskStatus: user.riskStatus || "active" }), user.email);
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
    aadhaarNumber: session.aadhaarNumber || existing?.aadhaarNumber || "",
    aadhaarHash: session.aadhaarHash || existing?.aadhaarHash || "",
    aadhaarLast4: session.aadhaarLast4 || existing?.aadhaarLast4 || "",
    pan: session.pan || existing?.pan || "",
    panHash: session.panHash || existing?.panHash || "",
    digilockerStatus: existing?.digilockerStatus || (session.digilockerVerified ? "verified" : "pending"),
    videoVerificationStatus: existing?.videoVerificationStatus || "pending",
    kycStatus: existing?.kycStatus || session.kycStatus || "under_review",
    riskStatus: existing?.riskStatus || session.riskStatus || "active",
    reviewNote: existing?.reviewNote || "",
    reviewedByStaffId: existing?.reviewedByStaffId,
    reviewedAt: existing?.reviewedAt,
    createdAt: existing?.createdAt || session.completedAt || now,
    lastLoginAt: now,
    status: "active"
  };
  saveCustomerUsers([user, ...loadCustomerUsers().filter((item) => item.id !== user.id && item.mobile !== mobile && (!session.authUid || item.authUid !== session.authUid))]);
  return user;
}

export function updateCustomerCompliance(customerId: string, patch: Partial<Pick<CustomerUser, "kycStatus" | "riskStatus" | "reviewNote" | "reviewedByStaffId" | "reviewedAt" | "status">>): CustomerUser[] {
  const users = loadCustomerUsers().map((user) => (user.id === customerId ? { ...user, ...patch } : user));
  return saveCustomerUsers(users);
}

export function canCustomerTransact(session: KycSession | null): boolean {
  if (!session) return false;
  return session.kycStatus === "verified" && (session.riskStatus || "active") === "active";
}

export function customerAccessMessage(session: KycSession | null): string {
  if (!session) return "Please login/signup from the home page first.";
  if (session.riskStatus === "permanently_banned") return "Your Coinvera account is permanently restricted. Please contact support if you believe this is a mistake.";
  if (session.riskStatus === "suspended") return "Your Coinvera account is suspended and cannot transact right now.";
  if (session.riskStatus === "limited") return "Your Coinvera account is limited. Please contact support before placing transactions.";
  if (session.kycStatus === "rejected") return "Your KYC was rejected. Please contact support or wait for resubmission instructions.";
  if (session.kycStatus === "duplicate_blocked") return "This Aadhaar/PAN is already linked with another Coinvera account.";
  return "Your account is under verification. Coinvera team usually verifies documents within 24 hours.";
}

function makeCompleteSession(input: { aadhaarHash?: string; aadhaarNumber?: string; authUid?: string; fullName: string; kycStatus?: KycSession["kycStatus"]; mobile: string; pan?: string; panHash?: string; riskStatus?: KycSession["riskStatus"] }): KycSession {
  return {
    authUid: input.authUid,
    fullName: input.fullName || "Coinvera Customer",
    mobile: input.mobile,
    aadhaarNumber: input.aadhaarNumber || "",
    aadhaarHash: input.aadhaarHash || "",
    mobileVerified: true,
    aadhaarLast4: input.aadhaarNumber ? input.aadhaarNumber.slice(-4) : "",
    aadhaarVerified: true,
    pan: input.pan || "",
    panHash: input.panHash || "",
    panVerified: true,
    digilockerVerified: true,
    kycStatus: input.kycStatus || "under_review",
    riskStatus: input.riskStatus || "active",
    consentAccepted: true,
    completedAt: new Date().toISOString()
  };
}

function normalizeAadhaar(value: string) {
  return value.replace(/\D/g, "");
}

async function hashSensitiveValue(value: string) {
  const bytes = new TextEncoder().encode(`coinvera:${value.trim().toUpperCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function ensureIdentityIsAvailable(input: { aadhaarHash: string; aadhaarNumber: string; email: string; mobile: string; pan: string; panHash: string }) {
  const email = input.email.trim().toLowerCase();
  const mobile = input.mobile.trim();
  const existing = loadCustomerUsers().find((user) =>
    user.mobile === mobile ||
    user.email?.trim().toLowerCase() === email ||
    user.aadhaarHash === input.aadhaarHash ||
    user.aadhaarNumber === input.aadhaarNumber ||
    user.panHash === input.panHash ||
    user.pan?.trim().toUpperCase() === input.pan
  );
  if (!existing) return;
  if (existing.riskStatus === "permanently_banned") throw new Error("This identity is permanently restricted on Coinvera.");
  throw new Error("This Aadhaar, PAN, email, or mobile is already linked with another Coinvera account.");
}
