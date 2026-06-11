import { ArrowLeft, Landmark, Plus, Trash2, UserRound, Wallet } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { Brand } from "../components/Brand";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { loadCustomerPreferences, removePayoutMethod, removeReceivingWallet, savePayoutMethod, saveReceivingWallet } from "../lib/preferences";
import { loadCustomerUsers } from "../lib/auth";
import { loadDeskSettings } from "../lib/desk";
import { maskAddress, maskEmail, maskMobile } from "../lib/mask";
import type { Network } from "../lib/types";

export function ProfilePage() {
  const session = loadCustomerSession();
  const settings = loadDeskSettings();
  const defaultNetwork = settings.blockchains[0]?.name || "USDT TRC20";
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState("");
  const [walletNetwork, setWalletNetwork] = useState<Network>(defaultNetwork);
  const [walletAddress, setWalletAddress] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  if (!session) {
    return (
      <main className="flowShell">
        <ProfileNav />
        <section className="lockedPanel">
          <UserRound size={36} />
          <h2>Login required</h2>
          <p>Please login/signup from the home page to view your profile.</p>
          <a className="primaryButton" href="/">Go to Login</a>
        </section>
      </main>
    );
  }

  const user = loadCustomerUsers().find((item) => item.mobile === session.mobile);
  const preferences = loadCustomerPreferences(session.mobile);

  function refresh(message: string) {
    setTick((value) => value + 1);
    setToast(message);
  }

  function addWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!walletAddress.trim()) return;
    saveReceivingWallet(session!.mobile, { address: walletAddress, network: walletNetwork });
    setWalletAddress("");
    refresh("Withdrawal wallet saved");
  }

  function addUpi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!upiId.trim()) return;
    savePayoutMethod(session!.mobile, { type: "upi", upiId });
    setUpiId("");
    refresh("UPI detail saved");
  }

  function addBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountNumber.trim() || !ifsc.trim()) return;
    savePayoutMethod(session!.mobile, { type: "account", accountNumber, ifsc, bankName });
    setBankName("");
    setAccountNumber("");
    setIfsc("");
    refresh("Bank account saved");
  }

  return (
    <main className="flowShell" key={tick}>
      <ProfileNav />
      <section className="profileShell">
        <div className="profileHero">
          <div className="profileAvatar">{(session.fullName || "C").slice(0, 1).toUpperCase()}</div>
          <div>
            <p className="eyebrow dark">Customer Profile</p>
            <h1>{session.fullName || "Coinvera Customer"}</h1>
            <p>Registered details are locked for account safety. Saved payout and withdrawal details can be managed here.</p>
          </div>
        </div>

        <section className="profileGrid">
          <article className="profileCard">
            <h2>Personal Details</h2>
            <div className="profileDetail"><span>Name</span><strong>{session.fullName || "Not added"}</strong></div>
            <div className="profileDetail"><span>Mobile</span><strong>{maskMobile(session.mobile)}</strong></div>
            <div className="profileDetail"><span>Email</span><strong>{maskEmail(user?.email)}</strong></div>
            <small>These registered details cannot be changed from customer profile.</small>
          </article>

          <article className="profileCard">
            <h2>Saved UPI Details</h2>
            <form className="compactProfileForm" onSubmit={addUpi}>
              <input value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="Add UPI ID" />
              <button type="submit"><Plus size={15} /> Save</button>
            </form>
            <ProfileList empty="No saved UPI IDs">
              {preferences.payoutMethods.filter((item) => item.type === "upi").map((method) => (
                <div className="profileSavedItem" key={method.id}>
                  <span>{method.label}</span>
                  <strong>{method.upiId}</strong>
                  <button type="button" onClick={() => refreshAfter(removePayoutMethod(session.mobile, method.id), "UPI removed", refresh)}><Trash2 size={15} /></button>
                </div>
              ))}
            </ProfileList>
          </article>

          <article className="profileCard">
            <h2>Bank Accounts</h2>
            <form className="profileFormGrid" onSubmit={addBank}>
              <input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Bank name" />
              <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" />
              <input value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} placeholder="IFSC" />
              <button type="submit"><Landmark size={15} /> Save Bank</button>
            </form>
            <ProfileList empty="No saved bank accounts">
              {preferences.payoutMethods.filter((item) => item.type === "account").map((method) => (
                <div className="profileSavedItem" key={method.id}>
                  <span>{method.bankName || "Bank account"}</span>
                  <strong>{maskAddress(method.accountNumber)} · {method.ifsc}</strong>
                  <button type="button" onClick={() => refreshAfter(removePayoutMethod(session.mobile, method.id), "Bank removed", refresh)}><Trash2 size={15} /></button>
                </div>
              ))}
            </ProfileList>
          </article>

          <article className="profileCard">
            <h2>USDT Withdrawal Addresses</h2>
            <form className="profileFormGrid" onSubmit={addWallet}>
              <select value={walletNetwork} onChange={(event) => setWalletNetwork(event.target.value)}>
                {settings.blockchains.map((chain) => <option value={chain.name} key={chain.id}>{chain.name}</option>)}
              </select>
              <input value={walletAddress} onChange={(event) => setWalletAddress(event.target.value)} placeholder="Wallet address" />
              <button type="submit"><Wallet size={15} /> Save Wallet</button>
            </form>
            <ProfileList empty="No saved withdrawal wallets">
              {preferences.receivingWallets.map((wallet) => (
                <div className="profileSavedItem" key={wallet.id}>
                  <span>{wallet.network}</span>
                  <strong>{maskAddress(wallet.address)}</strong>
                  <button type="button" onClick={() => refreshAfter(removeReceivingWallet(session.mobile, wallet.id), "Wallet removed", refresh)}><Trash2 size={15} /></button>
                </div>
              ))}
            </ProfileList>
          </article>
        </section>
      </section>
      <Toast message={toast} onDone={() => setToast("")} />
    </main>
  );
}

function refreshAfter(_value: unknown, message: string, refresh: (message: string) => void) {
  refresh(message);
}

function ProfileList({ children, empty }: { children: ReactNode; empty: string }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return items.length ? <div className="profileSavedList">{children}</div> : <div className="miniEmptyState">{empty}</div>;
}

function ProfileNav() {
  return (
    <nav className="adminNav">
      <Brand dark />
      <div className="navActions">
        <a className="softButton dark" href="/"><ArrowLeft size={16} /> Home</a>
        <a className="softButton dark" href="/wallet">Wallet</a>
      </div>
    </nav>
  );
}
