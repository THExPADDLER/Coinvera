export interface KycSession {
  authUid?: string;
  fullName: string;
  mobile: string;
  mobileVerified: boolean;
  aadhaarLast4: string;
  aadhaarVerified: boolean;
  pan: string;
  panVerified: boolean;
  digilockerVerified: boolean;
  consentAccepted: boolean;
  completedAt?: string;
}

export const kycStorageKey = "coinvera-kyc-session";
export const demoOtp = "123456";

export const emptyKycSession: KycSession = {
  fullName: "",
  mobile: "",
  mobileVerified: false,
  aadhaarLast4: "",
  aadhaarVerified: false,
  pan: "",
  panVerified: false,
  digilockerVerified: false,
  consentAccepted: false
};

export function loadKycSession(): KycSession {
  try {
    return { ...emptyKycSession, ...JSON.parse(localStorage.getItem(kycStorageKey) || "{}") };
  } catch {
    return emptyKycSession;
  }
}

export function saveKycSession(session: KycSession): KycSession {
  localStorage.setItem(kycStorageKey, JSON.stringify(session));
  return session;
}

export function isKycComplete(session: KycSession): boolean {
  return Boolean(session.mobileVerified && session.aadhaarVerified && session.panVerified && session.digilockerVerified && session.consentAccepted);
}

export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, "").slice(-10));
}

export function isValidPan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase());
}
