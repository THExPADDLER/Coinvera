import { ArrowLeft, Landmark, QrCode, Upload, Wallet } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { createOrder, loadDeskSettings, loadOrders, money } from "../lib/desk";
import { imageFileToCompressedDataUrl, imageSizeLabel } from "../lib/files";
import { loadCustomerPreferences, saveReceivingWallet } from "../lib/preferences";
import { dailyTradeRemaining, dailyTradeUsed, tradeLimitCheck } from "../lib/tradeLimits";
import type { Network } from "../lib/types";

type PayMethod = "upi" | "account" | "cdm";
type DeliveryMode = "wallet" | "external";

export function BuyPage() {
  const session = loadCustomerSession();
  const settings = loadDeskSettings();
  const defaultNetwork = settings.blockchains[0]?.name || "USDT TRC20";
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<Network>(defaultNetwork);
  const [wallet, setWallet] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("wallet");
  const [savedWalletId, setSavedWalletId] = useState("");
  const [saveWalletForFuture, setSaveWalletForFuture] = useState(false);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [accountId, setAccountId] = useState(settings.accountTransfers[0]?.id || "");
  const [cdmId, setCdmId] = useState(settings.cdmAccounts[0]?.id || "");
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [previewQr, setPreviewQr] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const total = useMemo(() => Number(amount || 0) * settings.rates.buy, [amount, settings.rates.buy]);
  const dailyUsed = session ? dailyTradeUsed(loadOrders(), session.mobile, "buy") : 0;
  const dailyRemaining = session ? dailyTradeRemaining(loadOrders(), session.mobile, "buy", settings) : settings.limits.buyMax;
  const limitError = tradeLimitCheck({ amount: Number(amount || 0), dailyUsed, mode: "buy", settings });
  const selectedAccount = settings.accountTransfers.find((account) => account.id === accountId) || settings.accountTransfers[0];
  const selectedCdm = settings.cdmAccounts.find((account) => account.id === cdmId) || settings.cdmAccounts[0];
  const preferences = session ? loadCustomerPreferences(session.mobile) : null;
  const savedWallets = preferences?.receivingWallets.filter((item) => item.network === network) || [];

  if (!session) return <RequireLogin title="Login required to buy USDT" />;

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!method || !session) return;
    const limitMessage = tradeLimitCheck({ amount: Number(amount || 0), dailyUsed: dailyTradeUsed(loadOrders(), session.mobile, "buy"), mode: "buy", settings });
    if (limitMessage) {
      setToast(limitMessage);
      return;
    }
    const order = createOrder({
      mode: "buy",
      name: session.fullName,
      phone: session.mobile,
      customerMobile: session.mobile,
      customerAuthUid: session.authUid,
      amount: Number(amount),
      rate: settings.rates.buy,
      network: deliveryMode === "wallet" ? "Coinvera Wallet" : network,
      wallet: deliveryMode === "wallet" ? "Credit to Coinvera wallet balance" : wallet,
      payment: `${method.toUpperCase()} payment submitted${method === "account" && selectedAccount ? ` to ${selectedAccount.label}` : ""}${method === "cdm" && selectedCdm ? ` to ${selectedCdm.label}` : ""}`,
      kyc: `Basic account: ${session.fullName}. No KYC verification required in prototype.`,
      paymentMethod: method,
      deliveryMethod: deliveryMode,
      paymentReference: reference,
      paymentScreenshot: screenshot,
      status: "Payment Submitted"
    });
    if (deliveryMode === "external" && saveWalletForFuture) {
      saveReceivingWallet(session.mobile, { address: wallet, network });
    }
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
              <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={settings.limits.buyMin} max={dailyRemaining || settings.limits.buyMax} step="0.01" placeholder="100" />
            </label>
            <div className="limitNote wide">
              Min {settings.limits.buyMin} USDT. Daily buy limit {settings.limits.buyMax} USDT. Remaining today {dailyRemaining} USDT.
            </div>
            <div className="paymentTabs deliveryTabs wide">
              <button type="button" className={deliveryMode === "wallet" ? "active" : ""} onClick={() => setDeliveryMode("wallet")}>Receive in Coinvera Wallet</button>
              <button type="button" className={deliveryMode === "external" ? "active" : ""} onClick={() => setDeliveryMode("external")}>Send to external address</button>
            </div>
            {deliveryMode === "wallet" ? (
              <div className="walletDeliveryNote wide">
                <Wallet size={18} />
                <div>
                  <strong>USDT will be added to your Coinvera wallet.</strong>
                  <span>You can withdraw later from Wallet after admin verifies and completes this buy order.</span>
                </div>
              </div>
            ) : (
              <>
                <label>
                  Blockchain
                  <select
                    value={network}
                    onChange={(event) => {
                      setNetwork(event.target.value as Network);
                      setSavedWalletId("");
                    }}
                  >
                    {settings.blockchains.map((chain) => (
                      <option value={chain.name} key={chain.id}>{chain.name}</option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  Wallet address
                  <input value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="Enter receiving wallet address" />
                </label>
              </>
            )}
            {deliveryMode === "external" && savedWallets.length > 0 && (
              <label className="wide">
                Use saved wallet
                <select
                  value={savedWalletId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSavedWalletId(nextId);
                    const saved = savedWallets.find((item) => item.id === nextId);
                    if (saved) setWallet(saved.address);
                  }}
                >
                  <option value="">Select saved wallet</option>
                  {savedWallets.map((saved) => (
                    <option value={saved.id} key={saved.id}>{saved.label}</option>
                  ))}
                </select>
              </label>
            )}
            {deliveryMode === "external" && <label className="checkLine wide">
              <input checked={saveWalletForFuture} onChange={(event) => setSaveWalletForFuture(event.target.checked)} type="checkbox" />
              Save this USDT address for easy future withdrawal
            </label>}
            <div className="buyEstimateCard wide">
              <span>Approx amount payable</span>
              <strong>{money(total)}</strong>
              <div>
                <small>Rate {money(settings.rates.buy)} / USDT</small>
                <small>{Number(amount || 0)} USDT * {settings.rates.buy}</small>
              </div>
            </div>
            <button className="primaryButton wide" type="button" disabled={!Number(amount) || Boolean(limitError) || (deliveryMode === "external" && !wallet)} onClick={() => setMethod("upi")}>
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
                <button className="qrBox clickableQr" type="button" disabled={!settings.payment.upiQr} onClick={() => settings.payment.upiQr && setPreviewQr(settings.payment.upiQr)}>
                  {settings.payment.upiQr ? <img src={settings.payment.upiQr} alt="UPI QR code" /> : <QrCode size={86} />}
                </button>
                <strong>{settings.payment.holderName}</strong>
                <span>{settings.payment.upiId}</span>
              </div>
            )}

            {method === "account" && (
              <>
                <label>
                  Select account
                  <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                    {settings.accountTransfers.map((account) => (
                      <option value={account.id} key={account.id}>{account.label}</option>
                    ))}
                  </select>
                </label>
                {selectedAccount && <BankDetails title="Account transfer details" name={selectedAccount.accountName} account={selectedAccount.accountNumber} ifsc={selectedAccount.ifsc} bank={selectedAccount.bankName} />}
              </>
            )}

            {method === "cdm" && (
              <>
                <label>
                  Select CDM account
                  <select value={cdmId} onChange={(event) => setCdmId(event.target.value)}>
                    {settings.cdmAccounts.map((account) => (
                      <option value={account.id} key={account.id}>{account.label}</option>
                    ))}
                  </select>
                </label>
                {selectedCdm && <BankDetails title="CDM cash deposit details" name={selectedCdm.accountName} account={selectedCdm.accountNumber} ifsc={selectedCdm.ifsc} bank={selectedCdm.bankName} />}
                <div className="warningBox">CDM account accepts cash deposit only. Online transfer to CDM account will be refunded after deduction.</div>
              </>
            )}

            <label>
              UTR / Reference No.
              <input value={reference} onChange={(event) => setReference(event.target.value)} required placeholder="Enter UTR or deposit slip reference" />
            </label>
            <label className="uploadLine">
              <Upload size={18} />
              {uploadingProof ? "Compressing screenshot..." : "Upload screenshot / slip"}
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    setUploadingProof(true);
                    setScreenshot(await imageFileToCompressedDataUrl(file));
                  } catch (error) {
                    setToast(error instanceof Error ? error.message : "Could not upload screenshot");
                    event.target.value = "";
                  } finally {
                    setUploadingProof(false);
                  }
                }}
                required
              />
            </label>
            {screenshot && (
              <button className="uploadPreview" type="button" onClick={() => setPreviewQr(screenshot)}>
                <img src={screenshot} alt="Payment screenshot preview" />
                <span>Screenshot ready ({imageSizeLabel(screenshot)})</span>
              </button>
            )}
            <button className="primaryButton" type="submit" disabled={uploadingProof}>Submit Payment</button>
          </form>
        </div>
      )}
      {previewQr && <ImagePreviewModal alt="UPI QR code preview" src={previewQr} onClose={() => setPreviewQr(null)} />}
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
