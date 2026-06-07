import { ArrowLeft, Landmark, QrCode, Upload, Wallet } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { createOrder, loadDeskSettings, money } from "../lib/desk";
import type { Network } from "../lib/types";

type PayMethod = "upi" | "account" | "cdm";

export function BuyPage() {
  const session = loadCustomerSession();
  const settings = loadDeskSettings();
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<Network>("TRC20");
  const [wallet, setWallet] = useState("");
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [toast, setToast] = useState("");
  const total = useMemo(() => Number(amount || 0) * settings.rates.buy, [amount, settings.rates.buy]);

  if (!session) return <RequireLogin title="Login required to buy USDT" />;

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!method || !session) return;
    const order = createOrder({
      mode: "buy",
      name: session.fullName,
      phone: session.mobile,
      customerMobile: session.mobile,
      amount: Number(amount),
      rate: settings.rates.buy,
      network,
      wallet,
      payment: `${method.toUpperCase()} payment submitted`,
      kyc: `Basic account: ${session.fullName}. No KYC verification required in prototype.`,
      paymentMethod: method,
      paymentReference: reference,
      paymentScreenshot: screenshot,
      status: "Processing"
    });
    setToast(`${order.id} submitted. Opening order chat.`);
    window.setTimeout(() => {
      window.location.href = `/chat/${order.id}`;
    }, 900);
  }

  return (
    <main className="flowShell">
      <FlowNav />
      <section className="flowGrid">
        <div className="flowIntro">
          <p className="eyebrow dark">Buy USDT</p>
          <h1>Buy USDT at {money(settings.rates.buy)}.</h1>
          <p>Enter USDT quantity, wallet address, and blockchain, then choose your payment method.</p>
          <div className="warningBox">
            CDM account accepts cash deposit only. Online transfer to CDM account will be refunded after deduction.
          </div>
        </div>

        <section className="tradePanel flowPanel">
          <div className="tradeForm">
            <label>
              USDT amount
              <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" step="0.01" placeholder="100" />
            </label>
            <label>
              Blockchain
              <select value={network} onChange={(event) => setNetwork(event.target.value as Network)}>
                <option value="TRC20">TRC20</option>
                <option value="ERC20">ERC20</option>
                <option value="BEP20">BEP20</option>
                <option value="Polygon">Polygon</option>
              </select>
            </label>
            <label className="wide">
              Wallet address
              <input value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="Enter receiving wallet address" />
            </label>
            <div className="buyEstimateCard wide">
              <span>Approx amount payable</span>
              <strong>{money(total)}</strong>
              <div>
                <small>Rate {money(settings.rates.buy)} / USDT</small>
                <small>{Number(amount || 0)} USDT * {settings.rates.buy}</small>
              </div>
            </div>
            <button className="primaryButton wide" type="button" disabled={!Number(amount) || !wallet} onClick={() => setMethod("upi")}>
              Continue to payment
            </button>
          </div>
        </section>
      </section>

      {method && (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Payment details">
          <form className="paymentModal" onSubmit={submitPayment}>
            <div className="paymentHeader">
              <h2>Choose payment method</h2>
              <button type="button" onClick={() => setMethod(null)}>Close</button>
            </div>
            <div className="paymentTabs">
              <button type="button" className={method === "upi" ? "active" : ""} onClick={() => setMethod("upi")}>UPI</button>
              <button type="button" className={method === "account" ? "active" : ""} onClick={() => setMethod("account")}>Account Transfer</button>
              <button type="button" className={method === "cdm" ? "active" : ""} onClick={() => setMethod("cdm")}>CDM</button>
            </div>

            {method === "upi" && (
              <div className="payDetails">
                <div className="qrBox">
                  {settings.payment.upiQr ? <img src={settings.payment.upiQr} alt="UPI QR code" /> : <QrCode size={86} />}
                </div>
                <strong>{settings.payment.holderName}</strong>
                <span>{settings.payment.upiId}</span>
              </div>
            )}

            {method === "account" && (
              <BankDetails title="Account transfer details" name={settings.payment.accountName} account={settings.payment.accountNumber} ifsc={settings.payment.ifsc} bank={settings.payment.bankName} />
            )}

            {method === "cdm" && (
              <>
                <BankDetails title="CDM cash deposit details" name={settings.payment.cdmName} account={settings.payment.cdmAccountNumber} ifsc={settings.payment.cdmIfsc} bank={settings.payment.cdmBankName} />
                <div className="warningBox">CDM account accepts cash deposit only. Online transfer to CDM account will be refunded after deduction.</div>
              </>
            )}

            <label>
              UTR / Reference No.
              <input value={reference} onChange={(event) => setReference(event.target.value)} required placeholder="Enter UTR or deposit slip reference" />
            </label>
            <label className="uploadLine">
              <Upload size={18} />
              Upload screenshot / slip
              <input type="file" accept="image/*" onChange={(event) => setScreenshot(event.target.files?.[0]?.name || "")} required />
            </label>
            {screenshot && <small>Uploaded: {screenshot}</small>}
            <button className="primaryButton" type="submit">Submit Payment</button>
          </form>
        </div>
      )}
      <Toast message={toast} onDone={() => setToast("")} />
    </main>
  );
}

function BankDetails({ title, name, account, ifsc, bank }: { title: string; name: string; account: string; ifsc: string; bank: string }) {
  return (
    <div className="bankDetails">
      <h3>{title}</h3>
      <span>Name: <strong>{name}</strong></span>
      <span>Account number: <strong>{account}</strong></span>
      <span>IFSC: <strong>{ifsc}</strong></span>
      <span>Bank: <strong>{bank}</strong></span>
    </div>
  );
}

function FlowNav() {
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

function RequireLogin({ title }: { title: string }) {
  return (
    <main className="flowShell">
      <FlowNav />
      <section className="lockedPanel">
        <Wallet size={36} />
        <h2>{title}</h2>
        <p>Please complete simple Login / Signup from the home page first.</p>
        <a className="primaryButton" href="/">Go to Login</a>
      </section>
    </main>
  );
}
