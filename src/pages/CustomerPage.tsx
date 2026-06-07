import { ArrowRight, CircleDollarSign, Landmark, LogOut, MessageCircle, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthPanel } from "../components/AuthPanel";
import { Brand } from "../components/Brand";
import { MarketDashboard } from "../components/MarketDashboard";
import { loadCustomerSession, logoutCustomer } from "../lib/auth";
import { loadDeskSettings, money } from "../lib/desk";
import type { KycSession } from "../lib/kyc";

export function CustomerPage() {
  const [session, setSession] = useState<KycSession | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [settings, setSettings] = useState(loadDeskSettings());

  useEffect(() => {
    setSession(loadCustomerSession());
    const sync = () => {
      setSession(loadCustomerSession());
      setSettings(loadDeskSettings());
    };
    window.addEventListener("coinvera-auth-updated", sync);
    window.addEventListener("desk-settings-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("coinvera-auth-updated", sync);
      window.removeEventListener("desk-settings-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function logout() {
    logoutCustomer();
    setSession(null);
  }

  return (
    <main className="customerShell">
      <nav className="topNav">
        <Brand />
        <div className="navActions">
          {session ? (
            <>
              <a className="softButton" href="/orders">
                My Orders
              </a>
              <a className="iconButton" href="/messages" aria-label="Messages">
                <MessageCircle size={19} />
              </a>
              <button className="softButton" type="button" onClick={logout}>
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <button className="softButton" type="button" onClick={() => setShowAuth(true)}>
              <UserRound size={17} />
              Login / Signup
            </button>
          )}
        </div>
      </nav>

      <MarketDashboard />

      <section className="tradeChoiceSection" id="trade-request">
        <div>
          <p className="eyebrow">Coinvera fast trading</p>
          <h2>{session ? `Welcome, ${session.fullName || "customer"}` : "Login first to buy or sell USDT."}</h2>
          <p>
            Create a simple Coinvera account, then choose Buy USDT or Sell USDT to start a fast transaction.
          </p>
        </div>

        {session ? (
          <div className="tradeChoiceGrid">
            <a className="tradeChoiceCard buy" href="/buy">
              <CircleDollarSign size={28} />
              <span>Buy USDT</span>
              <strong>{money(settings.rates.buy)} / USDT</strong>
              <small>Enter USDT amount, wallet address, blockchain, and pay by UPI, account transfer, or CDM.</small>
              <ArrowRight size={19} />
            </a>
            <a className="tradeChoiceCard sell" href="/sell">
              <Landmark size={28} />
              <span>Sell USDT</span>
              <strong>{money(settings.rates.sell)} / USDT</strong>
              <small>Submit sell request and bank payout details for admin settlement.</small>
              <ArrowRight size={19} />
            </a>
          </div>
        ) : (
          <div className="loginPromptPanel">
            <ShieldCheck size={30} />
            <strong>Login required</strong>
            <p>Click Login / Signup to create a basic account before placing a trade.</p>
            <button className="primaryButton" type="button" onClick={() => setShowAuth(true)}>
              Login / Signup
            </button>
          </div>
        )}
      </section>

      <section className="trustStrip" aria-label="Desk workflow">
        <div>
          <ShieldCheck size={19} />
          Simple account before trading
        </div>
        <div>
          <Landmark size={19} />
          INR receivable and payable tracked
        </div>
        <div>
          <Wallet size={19} />
          USDT network captured per order
        </div>
      </section>

      {showAuth && <AuthPanel onClose={() => setShowAuth(false)} onLogin={setSession} />}
    </main>
  );
}
