import { ArrowRight, CircleDollarSign, Clock3, Landmark, LogOut, Menu, MessageCircle, ShieldCheck, Star, UserRound, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthPanel } from "../components/AuthPanel";
import { Brand } from "../components/Brand";
import { MarketDashboard } from "../components/MarketDashboard";
import { loadCustomerSession, logoutCustomer } from "../lib/auth";
import { loadDeskSettings, money } from "../lib/desk";
import { getCustomerWalletBalance, loadWalletLedger } from "../lib/wallet";
import type { KycSession } from "../lib/kyc";

export function CustomerPage() {
  const [session, setSession] = useState<KycSession | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(loadDeskSettings());
  const [walletTick, setWalletTick] = useState(0);
  const balance = session ? getCustomerWalletBalance(session.mobile) : null;

  useEffect(() => {
    setSession(loadCustomerSession());
    const sync = () => {
      setSession(loadCustomerSession());
      setSettings(loadDeskSettings());
      loadWalletLedger();
      setWalletTick((value) => value + 1);
    };
    window.addEventListener("coinvera-auth-updated", sync);
    window.addEventListener("desk-settings-updated", sync);
    window.addEventListener("coinvera-wallet-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("coinvera-auth-updated", sync);
      window.removeEventListener("desk-settings-updated", sync);
      window.removeEventListener("coinvera-wallet-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [walletTick]);

  function logout() {
    logoutCustomer();
    setSession(null);
    setMenuOpen(false);
  }

  return (
    <main className="customerShell">
      <nav className="topNav">
        <Brand />
        {session && balance && (
          <a className="walletNavBox" href="/wallet" aria-label="Coinvera wallet balance">
            <span className="walletNavIcon"><Wallet size={17} /></span>
            <span className="walletNavLabel">Wallet</span>
            <strong>{balance.available.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</strong>
          </a>
        )}
        <div className="navActions">
          {session ? (
            <button className="iconButton menuButton" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open menu">
              {menuOpen ? <X size={22} /> : <Menu size={23} />}
            </button>
          ) : (
            <button className="softButton" type="button" onClick={() => setShowAuth(true)}>
              <UserRound size={17} />
              Login / Signup
            </button>
          )}
          {session && menuOpen && (
            <div className="navMenuPanel">
              <a href="/profile"><UserRound size={17} /> Profile</a>
              <a href="/wallet"><Wallet size={17} /> Wallet</a>
              <a href="/orders"><CircleDollarSign size={17} /> My Orders</a>
              <a href="/messages"><MessageCircle size={17} /> Messages</a>
              <a href="/about"><ShieldCheck size={17} /> About Coinvera</a>
              <a href="/reviews"><Star size={17} /> Reviews & Feedback</a>
              <button type="button" onClick={logout}><LogOut size={17} /> Logout</button>
            </div>
          )}
        </div>
      </nav>

      <section className="exchangeHero">
        <div className="exchangeHeroCopy">
          <p className="eyebrow">USDT-INR exchange desk</p>
          <h1>Buy and sell USDT with INR, safely and clearly.</h1>
          <p>Coinvera is built for fast INR settlement, verified wallet balance, order chat proof, and clean completion tracking.</p>
          <div className="exchangeHeroActions">
            {session ? (
              <>
                <a className="primaryButton" href="/buy"><CircleDollarSign size={18} /> Buy USDT</a>
                <a className="softButton" href="/sell"><Landmark size={18} /> Sell USDT</a>
              </>
            ) : (
              <button className="primaryButton" type="button" onClick={() => setShowAuth(true)}><UserRound size={18} /> Login / Signup</button>
            )}
          </div>
        </div>
        <div className="exchangeRateDesk">
          <div>
            <span>Buy rate</span>
            <strong>{money(settings.rates.buy)} / USDT</strong>
          </div>
          <div>
            <span>Sell rate</span>
            <strong>{money(settings.rates.sell)} / USDT</strong>
          </div>
          <div className="wide">
            <Clock3 size={20} />
            <span>Safe and trusted order completion targeted within 30 minutes.</span>
          </div>
        </div>
      </section>

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
              <small>Sell from verified wallet balance and receive INR by UPI or bank payout.</small>
              <ArrowRight size={19} />
            </a>
            <a className="tradeChoiceCard" href="/wallet">
              <Wallet size={28} />
              <span>Wallet</span>
              <strong>Deposit USDT</strong>
              <small>Add USDT once, wait for Coinvera verification, then sell in smaller parts.</small>
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
          <Clock3 size={19} />
          30 minute completion target
        </div>
        <div>
          <Wallet size={19} />
          USDT network captured per order
        </div>
      </section>

      <section className="homeReviewBand">
        <div>
          <p className="eyebrow">Customer trust</p>
          <h2>Safe, trusted and fast USDT-INR transactions.</h2>
        </div>
        <a className="softButton" href="/reviews"><Star size={17} /> View Reviews</a>
      </section>

      <MarketDashboard />

      {showAuth && <AuthPanel onClose={() => setShowAuth(false)} onLogin={setSession} />}
    </main>
  );
}
