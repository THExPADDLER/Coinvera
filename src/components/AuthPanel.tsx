import { FormEvent, useState } from "react";
import { LogIn, UserPlus, X } from "lucide-react";
import { saveCustomerSession } from "../lib/auth";
import type { KycSession } from "../lib/kyc";

interface AuthPanelProps {
  onClose: () => void;
  onLogin: (session: KycSession) => void;
}

export function AuthPanel({ onClose, onLogin }: AuthPanelProps) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "Coinvera Customer").trim();
    const mobile = String(form.get("mobile") || "0000000000").trim();
    const email = String(form.get("email") || "").trim();
    const session = saveCustomerSession({
      fullName,
      mobile,
      mobileVerified: true,
      aadhaarLast4: "",
      aadhaarVerified: true,
      pan: "NOT-REQUIRED",
      panVerified: true,
      digilockerVerified: true,
      consentAccepted: true,
      completedAt: new Date().toISOString()
    }, email);
    onLogin(session);
    onClose();
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Login or signup">
      <div className="simpleAuthModal">
        <button className="closeButton" type="button" onClick={onClose} aria-label="Close login signup">
          <X size={19} />
        </button>
        <div className="simpleAuthHeader">
          <p className="eyebrow dark">Coinvera account</p>
          <h2>{mode === "signup" ? "Create your account" : "Sign in to continue"}</h2>
          <p>No OTP or document verification is required in this prototype.</p>
        </div>

        <div className="modeSwitch authSwitch">
          <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>
            <UserPlus size={18} />
            Signup
          </button>
          <button className={mode === "signin" ? "active" : ""} type="button" onClick={() => setMode("signin")}>
            <LogIn size={18} />
            Sign in
          </button>
        </div>

        <form className="tradeForm" onSubmit={submit}>
          <label>
            Full name
            <input name="fullName" required placeholder="Customer name" />
          </label>
          <label>
            Mobile number
            <input name="mobile" required inputMode="tel" placeholder="Mobile number" />
          </label>
          <label className="wide">
            Email
            <input name="email" type="email" placeholder="Optional email" />
          </label>
          <button className="primaryButton wide" type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
