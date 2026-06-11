import { ArrowLeft, Copy, QrCode, Wallet } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { loadDeskSettings, usdt } from "../lib/desk";
import { createWalletDeposit, getCustomerWalletBalance, loadWalletDeposits, loadWalletLedger } from "../lib/wallet";
import type { Network, WalletDeposit, WalletLedgerEntry } from "../lib/types";

export function WalletPage() {
  const session = loadCustomerSession();
  const settings = loadDeskSettings();
  const defaultNetwork = settings.blockchains[0]?.name || "USDT TRC20";
  const [network, setNetwork] = useState<Network>(defaultNetwork);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [deposits, setDeposits] = useState<WalletDeposit[]>([]);
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [previewQr, setPreviewQr] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const selectedChain = settings.blockchains.find((chain) => chain.name === network) || settings.blockchains[0];

  useEffect(() => {
    const sync = () => {
      setDeposits(loadWalletDeposits());
      setLedger(loadWalletLedger());
    };
    sync();
    window.addEventListener("coinvera-wallet-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("coinvera-wallet-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const balance = useMemo(() => (session ? getCustomerWalletBalance(session.mobile) : { available: 0, pending: 0, locked: 0 }), [session, deposits, ledger]);
  const customerDeposits = session ? deposits.filter((deposit) => deposit.customerMobile === session.mobile) : [];
  const customerLedger = session ? ledger.filter((entry) => entry.customerMobile === session.mobile) : [];

  function submitDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedChain) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      setToast("Enter a valid USDT amount");
      return;
    }
    if (!txHash.trim()) {
      setToast("Enter transaction hash");
      return;
    }
    const deposit = createWalletDeposit({
      amount: value,
      customerMobile: session.mobile,
      customerName: session.fullName,
      network,
      txHash,
      walletAddress: selectedChain.wallet
    });
    setDeposits(loadWalletDeposits());
    setLedger(loadWalletLedger());
    setAmount("");
    setTxHash("");
    setToast(`${deposit.id} submitted for verification`);
  }

  if (!session) {
    return (
      <main className="flowShell">
        <WalletNav />
        <section className="lockedPanel">
          <Wallet size={36} />
          <h2>Login required to use wallet</h2>
          <p>Please login/signup from the home page first.</p>
          <a className="primaryButton" href="/">Go to Login</a>
        </section>
      </main>
    );
  }

  return (
    <main className="flowShell">
      <WalletNav />
      <section className="walletShell">
        <div className="walletHero">
          <div>
            <p className="eyebrow dark">Coinvera Wallet</p>
            <h1>Deposit USDT, verify once, sell in smaller parts.</h1>
            <p>Deposits stay pending until Coinvera verifies the on-chain transaction. Verified balance can be used for sell orders.</p>
          </div>
          <div className="walletBalanceGrid">
            <Metric label="Available" value={usdt(balance.available)} />
            <Metric label="Pending" value={usdt(Math.max(0, balance.pending))} />
            <Metric label="Locked" value={usdt(Math.max(0, balance.locked))} />
          </div>
        </div>

        <section className="walletGrid">
          <form className="tradePanel tradeForm" onSubmit={submitDeposit}>
            <h2>Deposit USDT</h2>
            <label>
              Network
              <select value={network} onChange={(event) => setNetwork(event.target.value)}>
                {settings.blockchains.map((chain) => (
                  <option value={chain.name} key={chain.id}>{chain.name}</option>
                ))}
              </select>
            </label>
            <div className="walletDisplay compactWalletDisplay">
              <span>Send USDT to Coinvera wallet</span>
              <button className="sellerQrBox clickableQr" type="button" disabled={!selectedChain?.qr} onClick={() => selectedChain?.qr && setPreviewQr(selectedChain.qr)}>
                {selectedChain?.qr ? <img src={selectedChain.qr} alt={`${selectedChain.name} deposit QR`} /> : <QrCode size={84} />}
              </button>
              <strong>{selectedChain?.wallet || "Wallet not configured"}</strong>
              <button type="button" onClick={() => navigator.clipboard?.writeText(selectedChain?.wallet || "")}>
                <Copy size={15} />
                Copy address
              </button>
            </div>
            <label>
              Amount sent
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="100" required />
            </label>
            <label>
              TX hash
              <input value={txHash} onChange={(event) => setTxHash(event.target.value)} placeholder="Paste blockchain transaction hash" required />
            </label>
            <button className="primaryButton" type="submit">Submit Deposit</button>
          </form>

          <section className="walletHistoryPanel">
            <h2>Deposit History</h2>
            {customerDeposits.length === 0 ? (
              <div className="emptyState">No wallet deposits yet.</div>
            ) : (
              <div className="walletList">
                {customerDeposits.map((deposit) => (
                  <article className="walletListItem" key={deposit.id}>
                    <div>
                      <strong>{deposit.id}</strong>
                      <span>{deposit.status}</span>
                    </div>
                    <p>{usdt(deposit.amount)} on {deposit.network}</p>
                    <small>TX: {deposit.txHash}</small>
                    <small>Hold until {new Date(deposit.holdUntil).toLocaleString("en-IN")}</small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="walletHistoryPanel wide">
            <h2>Wallet Ledger</h2>
            {customerLedger.length === 0 ? (
              <div className="emptyState">Wallet movements will appear here.</div>
            ) : (
              <div className="walletList ledgerList">
                {customerLedger.slice(0, 30).map((entry) => (
                  <article className="walletListItem" key={entry.id}>
                    <div>
                      <strong>{entry.type.replaceAll("_", " ")}</strong>
                      <span>{usdt(entry.amount)}</span>
                    </div>
                    <p>{entry.note}</p>
                    <small>{new Date(entry.at).toLocaleString("en-IN")}</small>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </section>
      {previewQr && <ImagePreviewModal src={previewQr} alt="Deposit QR preview" onClose={() => setPreviewQr(null)} />}
      <Toast message={toast} onDone={() => setToast("")} />
    </main>
  );
}

function WalletNav() {
  return (
    <nav className="adminNav">
      <Brand dark />
      <div className="navActions">
        <a className="softButton dark" href="/"><ArrowLeft size={16} /> Home</a>
        <a className="softButton dark" href="/sell">Sell USDT</a>
      </div>
    </nav>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metricCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
