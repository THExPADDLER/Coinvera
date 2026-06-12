import { ArrowLeft, CheckCircle2, Copy, Landmark, QrCode, Upload, Wallet } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { createOrder, loadDeskSettings, loadOrders, money, usdt } from "../lib/desk";
import { imageFileToCompressedDataUrl, imageSizeLabel } from "../lib/files";
import { loadCustomerPreferences, savePayoutMethod } from "../lib/preferences";
import { dailyTradeRemaining, dailyTradeUsed, tradeLimitCheck } from "../lib/tradeLimits";
import type { Network } from "../lib/types";
import { getCustomerWalletBalance, lockWalletForSell } from "../lib/wallet";

type PayoutMode = "upi" | "account";
type SellMode = "wallet" | "direct";
type DirectStage = "form" | "deposit";

export function SellPage() {
  const session = loadCustomerSession();
  const settings = loadDeskSettings();
  const defaultChain = settings.blockchains[0];
  const [sellMode, setSellMode] = useState<SellMode>("wallet");
  const [directStage, setDirectStage] = useState<DirectStage>("form");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<Network>(defaultChain?.name || "USDT TRC20");
  const [payoutMode, setPayoutMode] = useState<PayoutMode>("upi");
  const [savedPayoutId, setSavedPayoutId] = useState("");
  const [savePayoutForFuture, setSavePayoutForFuture] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [txHash, setTxHash] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const total = useMemo(() => Number(amount || 0) * settings.rates.sell, [amount, settings.rates.sell]);
  const preferences = session ? loadCustomerPreferences(session.mobile) : null;
  const savedPayouts = preferences?.payoutMethods.filter((item) => item.type === payoutMode) || [];
  const balance = session ? getCustomerWalletBalance(session.mobile) : { available: 0, pending: 0, locked: 0 };
  const dailyUsed = session ? dailyTradeUsed(loadOrders(), session.mobile, "sell") : 0;
  const dailyRemaining = session ? dailyTradeRemaining(loadOrders(), session.mobile, "sell", settings) : settings.limits.sellMax;
  const maxWalletSellAmount = Math.min(balance.available || 0, dailyRemaining || settings.limits.sellMax);
  const limitError = tradeLimitCheck({ amount: Number(amount || 0), dailyUsed, mode: "sell", settings });
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
  const customer = session;

  function resetDirectProof() {
    setTxHash("");
    setScreenshot("");
  }

  function validateSellAmount({ requireWalletBalance }: { requireWalletBalance: boolean }) {
    const sellAmount = Number(amount);
    if (!sellAmount || sellAmount <= 0) return "Enter valid USDT amount";
    const limitMessage = tradeLimitCheck({ amount: sellAmount, dailyUsed: dailyTradeUsed(loadOrders(), customer.mobile, "sell"), mode: "sell", settings });
    if (limitMessage) return limitMessage;
    if (requireWalletBalance && balance.available + 0.000001 < sellAmount) return "Insufficient verified wallet balance";
    return "";
  }

  function validatePayoutDetails() {
    if (payoutMode === "upi" && !upiId.trim()) return "Enter UPI ID for INR payout";
    if (payoutMode === "account") {
      if (!accountNumber.trim() || !confirmAccountNumber.trim() || !ifsc.trim() || !bankName.trim()) return "Enter complete bank details";
      if (accountNumber !== confirmAccountNumber) return "Account numbers do not match";
    }
    return "";
  }

  function payoutDetailsText() {
    return payoutMode === "upi"
      ? `UPI payout requested. UPI ID: ${upiId.trim()}`
      : `Account payout requested. Account: ${accountNumber.trim()}, IFSC: ${ifsc.trim()}, Bank: ${bankName.trim()}`;
  }

  function maybeSavePayout() {
    if (!savePayoutForFuture) return;
    if (payoutMode === "upi") {
      savePayoutMethod(customer.mobile, { type: "upi", upiId: upiId.trim() });
    } else {
      savePayoutMethod(customer.mobile, { type: "account", accountNumber: accountNumber.trim(), ifsc: ifsc.trim(), bankName: bankName.trim() });
    }
  }

  function submitWalletSell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountError = validateSellAmount({ requireWalletBalance: true });
    if (amountError) {
      setToast(amountError);
      return;
    }
    const payoutError = validatePayoutDetails();
    if (payoutError) {
      setToast(payoutError);
      return;
    }
    const sellAmount = Number(amount);
    const order = createOrder({
      mode: "sell",
      name: customer.fullName,
      phone: customer.mobile,
      customerMobile: customer.mobile,
      amount: sellAmount,
      rate: settings.rates.sell,
      network: "Coinvera verified wallet",
      wallet: "USDT debited from verified Coinvera wallet balance",
      payment: payoutDetailsText(),
      kyc: `Basic account: ${customer.fullName}. No KYC verification required in prototype.`,
      paymentMethod: payoutMode,
      paymentReference: "Wallet balance",
      paymentScreenshot: "",
      status: "Processing"
    });
    if (!lockWalletForSell(customer.mobile, sellAmount, order.id)) {
      setToast("Wallet balance changed. Please refresh and try again.");
      return;
    }
    maybeSavePayout();
    setToast(`${order.id} created. Opening order chat.`);
    window.setTimeout(() => {
      window.location.href = `/chat/${order.id}`;
    }, 900);
  }

  function continueToDirectDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountError = validateSellAmount({ requireWalletBalance: false });
    if (amountError) {
      setToast(amountError);
      return;
    }
    if (!selectedChain?.wallet) {
      setToast("Coinvera wallet address is not configured for this blockchain");
      return;
    }
    resetDirectProof();
    setDirectStage("deposit");
  }

  function submitDirectDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountError = validateSellAmount({ requireWalletBalance: false });
    if (amountError) {
      setToast(amountError);
      return;
    }
    const payoutError = validatePayoutDetails();
    if (payoutError) {
      setToast(payoutError);
      return;
    }
    if (!txHash.trim()) {
      setToast("Enter blockchain TX hash");
      return;
    }
    if (!screenshot) {
      setToast("Upload USDT transfer screenshot");
      return;
    }
    const order = createOrder({
      mode: "sell",
      name: customer.fullName,
      phone: customer.mobile,
      customerMobile: customer.mobile,
      amount: Number(amount),
      rate: settings.rates.sell,
      network: selectedChain?.name || network,
      wallet: selectedChain?.wallet || "",
      payment: payoutDetailsText(),
      kyc: `Basic account: ${customer.fullName}. No KYC verification required in prototype.`,
      paymentMethod: payoutMode,
      paymentReference: txHash.trim(),
      paymentScreenshot: screenshot,
      status: "USDT Submitted"
    });
    maybeSavePayout();
    setToast(`${order.id} submitted. Opening order chat.`);
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
          <p>Choose verified wallet selling for existing Coinvera balance, or direct deposit if you want to send USDT now using Coinvera QR.</p>
          <div className="walletBalanceGrid">
            <Balance label="Available" value={balance.available} />
            <Balance label="Pending" value={Math.max(0, balance.pending)} />
            <Balance label="Locked" value={Math.max(0, balance.locked)} />
          </div>
          <a className="primaryButton" href="/wallet">Deposit / View Wallet</a>
        </div>
        <section className="tradePanel flowPanel">
          <div className="sellModeGrid">
            <button type="button" className={sellMode === "wallet" ? "sellModeCard active" : "sellModeCard"} onClick={() => { setSellMode("wallet"); setDirectStage("form"); }}>
              <Wallet size={22} />
              <strong>Sell from Coinvera Wallet</strong>
              <span>Use already verified balance. Fastest flow for repeat customers.</span>
            </button>
            <button type="button" className={sellMode === "direct" ? "sellModeCard active" : "sellModeCard"} onClick={() => { setSellMode("direct"); setDirectStage("form"); }}>
              <Landmark size={22} />
              <strong>Direct USDT Deposit</strong>
              <span>Get Coinvera QR/address first, then submit hash and payout details.</span>
            </button>
          </div>

          {sellMode === "wallet" ? (
            <form className="tradeForm" onSubmit={submitWalletSell}>
              <SellAmountFields amount={amount} dailyRemaining={dailyRemaining} limitMax={settings.limits.sellMax} limitMin={settings.limits.sellMin} max={maxWalletSellAmount || undefined} onAmount={setAmount} rate={settings.rates.sell} total={total} />
              <PayoutFields
                accountNumber={accountNumber}
                bankName={bankName}
                confirmAccountNumber={confirmAccountNumber}
                ifsc={ifsc}
                onAccountNumber={setAccountNumber}
                onBankName={setBankName}
                onConfirmAccountNumber={setConfirmAccountNumber}
                onIfsc={setIfsc}
                onPayoutMode={setPayoutMode}
                onSavedPayout={setSavedPayoutId}
                onSavePayout={setSavePayoutForFuture}
                onUpiId={setUpiId}
                payoutMode={payoutMode}
                savePayoutForFuture={savePayoutForFuture}
                savedPayoutId={savedPayoutId}
                savedPayouts={savedPayouts}
                upiId={upiId}
              />
              <button className="primaryButton wide" type="submit" disabled={!balance.available || Boolean(limitError) || Number(amount || 0) > balance.available}>Submit Sell Request</button>
            </form>
          ) : directStage === "form" ? (
            <form className="tradeForm" onSubmit={continueToDirectDeposit}>
              <SellAmountFields amount={amount} dailyRemaining={dailyRemaining} limitMax={settings.limits.sellMax} limitMin={settings.limits.sellMin} onAmount={setAmount} rate={settings.rates.sell} total={total} />
              <label className="wide">
                Blockchain network
                <select value={network} onChange={(event) => setNetwork(event.target.value as Network)}>
                  {settings.blockchains.map((chain) => (
                    <option value={chain.name} key={chain.id}>{chain.name}</option>
                  ))}
                </select>
              </label>
              <div className="directSellNotice wide">
                <CheckCircle2 size={18} />
                <span>Next screen will show the exact Coinvera deposit QR and wallet address for this blockchain.</span>
              </div>
              <button className="primaryButton wide" type="submit" disabled={!Number(amount || 0) || Boolean(limitError)}>
                Show Coinvera Deposit QR
              </button>
            </form>
          ) : (
            <form className="tradeForm directDepositForm" onSubmit={submitDirectDeposit}>
              <div className="directDepositHeader wide">
                <button className="softButton dark" type="button" onClick={() => setDirectStage("form")}><ArrowLeft size={15} /> Change amount/network</button>
                <strong>Send exactly {usdt(Number(amount || 0))}</strong>
                <span>Expected INR payout: {money(total)}</span>
              </div>
              <div className="directDepositGrid wide">
                <button className="sellerQrBox clickableQr" type="button" disabled={!selectedChain?.qr} onClick={() => selectedChain?.qr && setPreviewImage(selectedChain.qr)}>
                  {selectedChain?.qr ? <img src={selectedChain.qr} alt={`${selectedChain.name} deposit QR`} /> : <QrCode size={84} />}
                </button>
                <div className="walletDisplay directWalletDisplay">
                  <span>Send USDT to Coinvera wallet</span>
                  <strong>{selectedChain?.wallet || "Wallet not configured"}</strong>
                  <small>{selectedChain?.name || network}</small>
                  <button type="button" onClick={() => selectedChain?.wallet && navigator.clipboard.writeText(selectedChain.wallet)}>
                    <Copy size={15} />
                    Copy address
                  </button>
                </div>
              </div>
              <label className="wide">
                TX hash / transaction ID
                <input value={txHash} onChange={(event) => setTxHash(event.target.value)} placeholder="Paste blockchain transaction hash" required />
              </label>
              <label className="uploadLine wide">
                <Upload size={18} />
                {uploadingProof ? "Compressing screenshot..." : "Upload USDT transfer screenshot"}
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
                <button className="uploadPreview wide" type="button" onClick={() => setPreviewImage(screenshot)}>
                  <img src={screenshot} alt="USDT transfer screenshot preview" />
                  <span>Screenshot ready ({imageSizeLabel(screenshot)})</span>
                </button>
              )}
              <PayoutFields
                accountNumber={accountNumber}
                bankName={bankName}
                confirmAccountNumber={confirmAccountNumber}
                ifsc={ifsc}
                onAccountNumber={setAccountNumber}
                onBankName={setBankName}
                onConfirmAccountNumber={setConfirmAccountNumber}
                onIfsc={setIfsc}
                onPayoutMode={setPayoutMode}
                onSavedPayout={setSavedPayoutId}
                onSavePayout={setSavePayoutForFuture}
                onUpiId={setUpiId}
                payoutMode={payoutMode}
                savePayoutForFuture={savePayoutForFuture}
                savedPayoutId={savedPayoutId}
                savedPayouts={savedPayouts}
                upiId={upiId}
              />
              <button className="primaryButton wide" type="submit" disabled={uploadingProof}>Submit USDT Proof & Open Chat</button>
            </form>
          )}
        </section>
      </section>
      {previewImage && <ImagePreviewModal alt="Deposit QR / uploaded proof preview" src={previewImage} onClose={() => setPreviewImage(null)} />}
      <Toast message={toast} onDone={() => setToast("")} />
    </main>
  );
}

function SellAmountFields({ amount, dailyRemaining, limitMax, limitMin, max, onAmount, rate, total }: { amount: string; dailyRemaining: number; limitMax: number; limitMin: number; max?: number; onAmount: (value: string) => void; rate: number; total: number }) {
  return (
    <>
      <label>
        USDT amount
        <input value={amount} onChange={(event) => onAmount(event.target.value)} type="number" min={limitMin} step="0.01" max={max} required placeholder="100" />
      </label>
      <div className="limitNote wide">
        Min {limitMin} USDT. Daily sell limit {limitMax} USDT. Remaining today {dailyRemaining} USDT.
      </div>
      <div className="quoteBar wide">
        <div>
          <span>Rate</span>
          <strong>{money(rate)}</strong>
        </div>
        <div>
          <span>Estimated INR</span>
          <strong>{money(total)}</strong>
        </div>
        <div>
          <span>Formula</span>
          <strong>{Number(amount || 0)} * {rate}</strong>
        </div>
      </div>
    </>
  );
}

function PayoutFields({
  accountNumber,
  bankName,
  confirmAccountNumber,
  ifsc,
  onAccountNumber,
  onBankName,
  onConfirmAccountNumber,
  onIfsc,
  onPayoutMode,
  onSavedPayout,
  onSavePayout,
  onUpiId,
  payoutMode,
  savePayoutForFuture,
  savedPayoutId,
  savedPayouts,
  upiId
}: {
  accountNumber: string;
  bankName: string;
  confirmAccountNumber: string;
  ifsc: string;
  onAccountNumber: (value: string) => void;
  onBankName: (value: string) => void;
  onConfirmAccountNumber: (value: string) => void;
  onIfsc: (value: string) => void;
  onPayoutMode: (value: PayoutMode) => void;
  onSavedPayout: (value: string) => void;
  onSavePayout: (value: boolean) => void;
  onUpiId: (value: string) => void;
  payoutMode: PayoutMode;
  savePayoutForFuture: boolean;
  savedPayoutId: string;
  savedPayouts: ReturnType<typeof loadCustomerPreferences>["payoutMethods"];
  upiId: string;
}) {
  return (
    <div className="wide payoutPanel">
      <h3>Select INR payout mode</h3>
      <div className="paymentTabs twoTabs">
        <button type="button" className={payoutMode === "upi" ? "active" : ""} onClick={() => { onPayoutMode("upi"); onSavedPayout(""); }}>UPI</button>
        <button type="button" className={payoutMode === "account" ? "active" : ""} onClick={() => { onPayoutMode("account"); onSavedPayout(""); }}>Account Transfer</button>
      </div>
      {savedPayouts.length > 0 && (
        <label>
          Use saved payout
          <select
            value={savedPayoutId}
            onChange={(event) => {
              const nextId = event.target.value;
              onSavedPayout(nextId);
              const saved = savedPayouts.find((item) => item.id === nextId);
              if (saved?.type === "upi") {
                onUpiId(saved.upiId);
              }
              if (saved?.type === "account") {
                onAccountNumber(saved.accountNumber);
                onConfirmAccountNumber(saved.accountNumber);
                onIfsc(saved.ifsc);
                onBankName(saved.bankName);
              }
            }}
          >
            <option value="">Select saved payout</option>
            {savedPayouts.map((saved) => (
              <option value={saved.id} key={saved.id}>{saved.label}</option>
            ))}
          </select>
        </label>
      )}
      {payoutMode === "upi" ? (
        <label>
          UPI ID
          <input value={upiId} onChange={(event) => onUpiId(event.target.value)} required={payoutMode === "upi"} placeholder="customer@upi" />
        </label>
      ) : (
        <div className="accountGrid">
          <label>
            Account number
            <input value={accountNumber} onChange={(event) => onAccountNumber(event.target.value)} required={payoutMode === "account"} placeholder="Account number" />
          </label>
          <label>
            Re-enter account number
            <input value={confirmAccountNumber} onChange={(event) => onConfirmAccountNumber(event.target.value)} required={payoutMode === "account"} placeholder="Re-enter account number" />
          </label>
          <label>
            IFSC code
            <input value={ifsc} onChange={(event) => onIfsc(event.target.value.toUpperCase())} required={payoutMode === "account"} placeholder="IFSC code" />
          </label>
          <label>
            Bank name
            <input value={bankName} onChange={(event) => onBankName(event.target.value)} required={payoutMode === "account"} placeholder="Bank name" />
          </label>
        </div>
      )}
      <label className="checkLine">
        <input checked={savePayoutForFuture} onChange={(event) => onSavePayout(event.target.checked)} type="checkbox" />
        Save this payout detail for faster future payouts
      </label>
    </div>
  );
}

function Balance({ label, value }: { label: string; value: number }) {
  return (
    <div className="metricCard">
      <span>{label}</span>
      <strong>{usdt(value)}</strong>
    </div>
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
