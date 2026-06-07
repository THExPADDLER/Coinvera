import { ArrowLeft, Copy, Landmark, QrCode, Upload } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { createOrder, loadDeskSettings, money } from "../lib/desk";
import type { Network } from "../lib/types";

export function SellPage() {
  const session = loadCustomerSession();
  const settings = loadDeskSettings();
  const defaultNetwork = settings.blockchains[0]?.name || "USDT TRC20";
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<Network>(defaultNetwork);
  const [txHash, setTxHash] = useState("");
  const [payoutMode, setPayoutMode] = useState<"upi" | "account">("upi");
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [previewQr, setPreviewQr] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const total = useMemo(() => Number(amount || 0) * settings.rates.sell, [amount, settings.rates.sell]);
  const selectedChain = settings.blockchains.find((chain) => chain.name === network) || settings.blockchains[0];

  if (!session) {
    return (
      <main className="flowShell">
        <SellNav />
        <section className="lockedPanel">
          <Landmark size={36} />
          <h2>Login required to sell USDT</h2>
          <p>Please complete simple Login / Signup from the home page first.</p>
          <a className="primaryButton" href="/">Go to Login</a>
        </section>
      </main>
    );
  }

  function submitSell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    if (payoutMode === "account" && accountNumber !== confirmAccountNumber) {
      setToast("Account numbers do not match");
      return;
    }
    const payoutDetails =
      payoutMode === "upi"
        ? `UPI payout requested. UPI ID: ${upiId}`
        : `Account payout requested. Account: ${accountNumber}, IFSC: ${ifsc}, Bank: ${bankName}`;
    const order = createOrder({
      mode: "sell",
      name: session.fullName,
      phone: session.mobile,
      customerMobile: session.mobile,
      amount: Number(amount),
      rate: settings.rates.sell,
      network,
      wallet: `${selectedChain?.wallet || ""} | TX: ${txHash}`,
      payment: payoutDetails,
      kyc: `Basic account: ${session.fullName}. No KYC verification required in prototype.`,
      paymentMethod: payoutMode,
      paymentReference: txHash,
      paymentScreenshot: screenshot,
      status: "Awaiting USDT"
    });
    setToast(`${order.id} created. Opening order chat.`);
    window.setTimeout(() => {
      window.location.href = `/chat/${order.id}`;
    }, 900);
  }

  return (
    <main className="flowShell">
      <SellNav />
      <section className="flowGrid">
        <div className="flowIntro">
          <p className="eyebrow dark">Sell USDT</p>
          <h1>Sell USDT at {money(settings.rates.sell)}.</h1>
          <p>Send USDT to Coinvera's receiving wallet, enter the amount sent, then choose how you want to receive INR: UPI or account transfer.</p>
          <div className="walletDisplay">
            <span>Coinvera receiving wallet</span>
            <button className="sellerQrBox clickableQr" type="button" disabled={!selectedChain?.qr} onClick={() => selectedChain?.qr && setPreviewQr(selectedChain.qr)}>
              {selectedChain?.qr ? <img src={selectedChain.qr} alt={`${selectedChain.name} seller deposit QR`} /> : <QrCode size={92} />}
            </button>
            <strong>{selectedChain?.wallet || "Wallet not configured"}</strong>
            <small>Blockchain: {selectedChain?.name || network}</small>
            <button type="button" onClick={() => navigator.clipboard?.writeText(selectedChain?.wallet || "")}>
              <Copy size={15} />
              Copy
            </button>
          </div>
        </div>
        <section className="tradePanel flowPanel">
          <form className="tradeForm" onSubmit={submitSell}>
            <label>
              USDT amount
              <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" step="0.01" required placeholder="100" />
            </label>
            <label>
              Blockchain
              <select value={network} onChange={(event) => setNetwork(event.target.value as Network)}>
                {settings.blockchains.map((chain) => (
                  <option value={chain.name} key={chain.id}>{chain.name}</option>
                ))}
              </select>
            </label>
            <label className="wide">
              TX hash / transfer reference
              <input value={txHash} onChange={(event) => setTxHash(event.target.value)} required placeholder="USDT transfer hash" />
            </label>
            <div className="quoteBar">
              <div>
                <span>Rate</span>
                <strong>{money(settings.rates.sell)}</strong>
              </div>
              <div>
                <span>Estimated INR</span>
                <strong>{money(total)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>Awaiting USDT</strong>
              </div>
            </div>

            <div className="wide payoutPanel">
              <h3>Select INR payout mode</h3>
              <div className="paymentTabs">
                <button type="button" className={payoutMode === "upi" ? "active" : ""} onClick={() => setPayoutMode("upi")}>UPI</button>
                <button type="button" className={payoutMode === "account" ? "active" : ""} onClick={() => setPayoutMode("account")}>Account Transfer</button>
              </div>
              {payoutMode === "upi" ? (
                <label>
                  UPI ID
                  <input value={upiId} onChange={(event) => setUpiId(event.target.value)} required={payoutMode === "upi"} placeholder="customer@upi" />
                </label>
              ) : (
                <div className="accountGrid">
                  <label>
                    Account number
                    <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} required={payoutMode === "account"} placeholder="Account number" />
                  </label>
                  <label>
                    Re-enter account number
                    <input value={confirmAccountNumber} onChange={(event) => setConfirmAccountNumber(event.target.value)} required={payoutMode === "account"} placeholder="Re-enter account number" />
                  </label>
                  <label>
                    IFSC code
                    <input value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} required={payoutMode === "account"} placeholder="IFSC code" />
                  </label>
                  <label>
                    Bank name
                    <input value={bankName} onChange={(event) => setBankName(event.target.value)} required={payoutMode === "account"} placeholder="Bank name" />
                  </label>
                </div>
              )}
            </div>
            <label className="uploadLine wide">
              <Upload size={18} />
              Upload USDT transfer screenshot
              <input type="file" accept="image/*" onChange={(event) => setScreenshot(event.target.files?.[0]?.name || "")} required />
            </label>
            {screenshot && <small className="wide">Uploaded: {screenshot}</small>}
            <button className="primaryButton wide" type="submit">Submit Sell Request</button>
          </form>
        </section>
      </section>
      <Toast message={toast} onDone={() => setToast("")} />
      {previewQr && <ImagePreviewModal alt="Seller deposit QR preview" src={previewQr} onClose={() => setPreviewQr(null)} />}
    </main>
  );
}

function SellNav() {
  return (
    <nav className="adminNav">
      <Brand dark />
      <div className="navActions">
        <a className="softButton dark" href="/"><ArrowLeft size={16} /> Home</a>
        <a className="softButton dark" href="/orders">My Orders</a>
      </div>
    </nav>
  );
}
