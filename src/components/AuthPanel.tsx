import { FormEvent, useState } from "react";
import { LogIn, UserPlus, X } from "lucide-react";
import { signinCustomer, signupCustomer } from "../lib/auth";
import type { KycSession } from "../lib/kyc";

interface AuthPanelProps {
  onClose: () => void;
  onLogin: (session: KycSession) => void;
}

export function AuthPanel({ onClose, onLogin }: AuthPanelProps) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "Coinvera Customer").trim();
    const mobile = String(form.get("mobile") || "").trim();
    const aadhaarNumber = String(form.get("aadhaarNumber") || "").trim();
    const pan = String(form.get("pan") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    try {
      setBusy(true);
      const session =
        mode === "signup"
          ? await signupCustomer({ aadhaarNumber, fullName, mobile, email, pan, password })
          : await signinCustomer({ email, password });
      onLogin(session);
      onClose();
    } catch (authError) {
      setError(authError instanceof Error ? cleanAuthError(authError.message) : "Could not continue. Please try again.");
    } finally {
      setBusy(false);
    }
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
          <p>{mode === "signup" ? "Create your Coinvera login. KYC integrations will be added in the next product phase." : "Use the email and password connected to your Coinvera account."}</p>
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
          {mode === "signup" && (
            <>
              <label>
                Full name
                <input name="fullName" required placeholder="Customer name" />
              </label>
              <label>
                Mobile number
                <input name="mobile" required inputMode="tel" placeholder="Mobile number" />
              </label>
              <label>
                Aadhaar number
                <input name="aadhaarNumber" required inputMode="numeric" minLength={12} maxLength={12} placeholder="12 digit Aadhaar" />
              </label>
              <label>
                PAN number
                <input name="pan" required minLength={10} maxLength={10} placeholder="ABCDE1234F" />
              </label>
            </>
          )}
          <label className="wide">
            Email
            <input name="email" type="email" required placeholder="customer@email.com" />
          </label>
          <label className="wide">
            Password
            <input name="password" type="password" required minLength={6} placeholder="Minimum 6 characters" />
          </label>
          {error && <div className="authError wide">{error}</div>}
          <button className="primaryButton wide" type="submit" disabled={busy}>
            {busy ? "Please wait..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function cleanAuthError(message: string): string {
  if (message.includes("auth/email-already-in-use")) return "This email is already registered. Please sign in.";
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) return "Incorrect email or password.";
  if (message.includes("auth/user-not-found")) return "No Coinvera account found for this email.";
  if (message.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (message.includes("auth/too-many-requests")) return "Too many attempts. Please wait and try again.";
  return message;
}
