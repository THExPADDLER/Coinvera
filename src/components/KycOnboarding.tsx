import { BadgeCheck, Fingerprint, IdCard, KeyRound, LockKeyhole, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { demoOtp, emptyKycSession, isKycComplete, isValidIndianMobile, isValidPan, loadKycSession, saveKycSession } from "../lib/kyc";
import type { KycSession } from "../lib/kyc";

interface KycOnboardingProps {
  onComplete: (session: KycSession) => void;
}

export function KycOnboarding({ onComplete }: KycOnboardingProps) {
  const [session, setSession] = useState<KycSession>(emptyKycSession);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const complete = useMemo(() => isKycComplete(session), [session]);

  useEffect(() => {
    const stored = loadKycSession();
    setSession(stored);
    if (isKycComplete(stored)) onComplete(stored);
  }, [onComplete]);

  function update(next: Partial<KycSession>) {
    const merged = saveKycSession({ ...session, ...next });
    setSession(merged);
    if (isKycComplete(merged)) onComplete({ ...merged, completedAt: merged.completedAt || new Date().toISOString() });
  }

  function verifyMobile() {
    if (mobileOtp !== demoOtp) return;
    update({ mobileVerified: true });
  }

  function verifyAadhaar() {
    if (aadhaarOtp !== demoOtp || session.aadhaarLast4.length !== 4) return;
    update({ aadhaarVerified: true });
  }

  function verifyPanWithDigiLocker() {
    const pan = session.pan.trim().toUpperCase();
    if (!isValidPan(pan)) return;
    update({ pan, panVerified: true, digilockerVerified: true });
  }

  return (
    <section className="kycPanel" aria-label="Compulsory customer verification">
      <div className="kycHeader">
        <div>
          <p className="eyebrow">Compulsory customer verification</p>
          <h2>Sign up and complete KYC before trading.</h2>
          <p>Mobile OTP, Aadhaar OTP consent, PAN entry, and DigiLocker authorization are required before Coinvera unlocks the buy/sell order form.</p>
        </div>
        <div className={complete ? "kycScore done" : "kycScore"}>
          <BadgeCheck size={22} />
          {complete ? "Verified" : "Locked"}
        </div>
      </div>

      <div className="kycGrid">
        <VerificationCard icon={<Smartphone size={22} />} title="1. Mobile OTP" done={session.mobileVerified}>
          <label>
            Full name
            <input value={session.fullName} onChange={(event) => update({ fullName: event.target.value })} placeholder="Customer full name" />
          </label>
          <label>
            Mobile number
            <input
              value={session.mobile}
              onChange={(event) => update({ mobile: event.target.value, mobileVerified: false })}
              inputMode="tel"
              placeholder="10 digit mobile number"
            />
          </label>
          {!session.mobileVerified && (
            <div className="inlineActions">
              <button type="button" onClick={() => setMobileOtpSent(isValidIndianMobile(session.mobile))}>
                Send OTP
              </button>
              <input value={mobileOtp} onChange={(event) => setMobileOtp(event.target.value)} inputMode="numeric" placeholder="OTP" disabled={!mobileOtpSent} />
              <button type="button" onClick={verifyMobile} disabled={!mobileOtpSent}>
                Verify
              </button>
            </div>
          )}
          {mobileOtpSent && !session.mobileVerified && <small>Prototype OTP: {demoOtp}</small>}
        </VerificationCard>

        <VerificationCard icon={<Fingerprint size={22} />} title="2. Aadhaar OTP" done={session.aadhaarVerified}>
          <label>
            Aadhaar last 4 digits
            <input
              value={session.aadhaarLast4}
              onChange={(event) => update({ aadhaarLast4: event.target.value.replace(/\D/g, "").slice(0, 4), aadhaarVerified: false })}
              inputMode="numeric"
              placeholder="Last 4 digits only"
            />
          </label>
          <p className="finePrint">Real Aadhaar OTP must be handled through an authorized UIDAI/API partner flow. Do not store full Aadhaar on the frontend.</p>
          {!session.aadhaarVerified && (
            <div className="inlineActions">
              <button type="button" onClick={() => setAadhaarOtpSent(session.aadhaarLast4.length === 4)}>
                Send Aadhaar OTP
              </button>
              <input value={aadhaarOtp} onChange={(event) => setAadhaarOtp(event.target.value)} inputMode="numeric" placeholder="OTP" disabled={!aadhaarOtpSent} />
              <button type="button" onClick={verifyAadhaar} disabled={!aadhaarOtpSent}>
                Verify
              </button>
            </div>
          )}
          {aadhaarOtpSent && !session.aadhaarVerified && <small>Prototype OTP: {demoOtp}</small>}
        </VerificationCard>

        <VerificationCard icon={<IdCard size={22} />} title="3. PAN + DigiLocker" done={session.panVerified && session.digilockerVerified}>
          <label>
            PAN number
            <input value={session.pan} onChange={(event) => update({ pan: event.target.value.toUpperCase(), panVerified: false, digilockerVerified: false })} placeholder="ABCDE1234F" />
          </label>
          <button className="digilockerButton" type="button" onClick={verifyPanWithDigiLocker}>
            <KeyRound size={17} />
            Authorize DigiLocker
          </button>
          <p className="finePrint">Production mode should redirect to DigiLocker OAuth consent and fetch verified PAN/Aadhaar documents from issued records.</p>
        </VerificationCard>

        <VerificationCard icon={<LockKeyhole size={22} />} title="4. Consent" done={session.consentAccepted}>
          <label className="checkLine">
            <input type="checkbox" checked={session.consentAccepted} onChange={(event) => update({ consentAccepted: event.target.checked })} />
            I consent to Coinvera using verified KYC details for USDT/INR settlement checks.
          </label>
          <p className="finePrint">This prototype stores only local browser verification status. Production should encrypt KYC data and keep audit logs.</p>
        </VerificationCard>
      </div>
    </section>
  );
}

function VerificationCard({ children, done, icon, title }: { children: ReactNode; done: boolean; icon: ReactNode; title: string }) {
  return (
    <div className={done ? "verificationCard done" : "verificationCard"}>
      <div className="verificationTitle">
        <span>{icon}</span>
        <strong>{title}</strong>
        <em>{done ? "Done" : "Pending"}</em>
      </div>
      {children}
    </div>
  );
}
