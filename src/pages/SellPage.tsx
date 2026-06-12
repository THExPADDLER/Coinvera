import { ArrowLeft, Landmark } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { createOrder, loadDeskSettings, loadOrders, money, usdt } from "../lib/desk";
import { loadCustomerPreferences, savePayoutMethod } from "../lib/preferences";
import { dailyTradeRemaining, dailyTradeUsed, tradeLimitCheck } from "../lib/tradeLimits";
import { getCustomerWalletBalance, lockWalletForSell } from "../lib/wallet";

export function SellPage() {
  const session = loadCustomerSession();
  const settings = loadDeskSettings();
  const [amount, setAmount] = useState("");
  const [payoutMode, setPayoutMode] = useState<"upi" | "account">("upi");
  const [savedPayoutId, setSavedPayoutId] = useState("");
  const [savePayoutForFuture, setSavePayoutForFuture] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [toast, setToast] = useState("");
  const total = useMemo(() => Number(amount || 0) * settings.rates.sell, [amount, settings.rates.sell]);
  const preferences = session ? loadCustomerPreferences(session.mobile) : null;
  const savedPayouts = preferences?.payoutMethods.filter((item) => item.type === payoutMode) || [];
  const balance = session ? getCustomerWalletBalance(session.mobile) : { available: 0, pending: 0, locked: 0 };
  const dailyUsed = session ? dailyTradeUsed(loadOrders(), session.mobile, "sell") : 0;
  const dailyRemaining = session ? dailyTradeRemaining(loadOrders(), session.mobile, "sell", settings) : settings.limits.sellMax;
  const maxSellAmount = Math.min(balance.available || 0, dailyRemaining || settings.limits.sellMax);
  const limitError = tradeLimitCheck({ amount: Number(amount || 0), dailyUsed, mode: "sell", settings });

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
    const sellAmount = Number(amount);
    if (!sellAmount || sellAmount <= 0) {
      setToast("Enter valid USDT amount");
      return;
    }
    const limitMessage = tradeLimitCheck({ amount: sellAmount, dailyUsed: dailyTradeUsed(loadOrders(), session.mobile, "sell"), mode: "sell", settings });
    if (limitMessage) {
      setToast(limitMessage);
      return;
    }
    if (balance.available + 0.000001 < sellAmount) {
      setToast("Insufficient verified wallet balance");
      return;
    }
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
      amount: sellAmount,
      rate: settings.rates.sell,
      network: "Coinvera verified wallet",
      wallet: "USDT debited from verified Coinvera wallet balance",
      payment: payoutDetails,
      kyc: `Basic account: ${session.fullName}. No KYC verification required in prototype.`,
      paymentMethod: payoutMode,
      paymentReference: "Wallet balance",
      paymentScreenshot: "",
      status: "Processing"
    });
    if (!lockWalletForSell(session.mobile, sellAmount, order.id)) {
      setToast("Wallet balance changed. Please refresh and try again.");
      return;
    }
    if (savePayoutForFuture) {
      if (payoutMode === "upi") {
        savePayoutMethod(session.mobile, { type: "upi", upiId });
      } else {
        savePayoutMethod(session.mobile, { type: "account", accountNumber, ifsc, bankName });
      }
    }
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
          <p>Sell from your verified Coinvera wallet balance. Deposit USDT in Wallet first, then create sell orders in smaller parts.</p>
          <div className="walletBalanceGrid">
            <Balance label="Available" value={balance.available} />
            <Balance label="Pending" value={Math.max(0, balance.pending)} />
            <Balance label="Locked" value={Math.max(0, balance.locked)} />
          </div>
          <a className="primaryButton" href="/wallet">Deposit / View Wallet</a>
        </div>
        <section className="tradePanel flowPanel">
          <form className="tradeForm" onSubmit={submitSell}>
            <label>
              USDT amount
              <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={settings.limits.sellMin} step="0.01" max={maxSellAmount || undefined} required placeholder="100" />
            </label>
            <div className="limitNote wide">
              Min {settings.limits.sellMin} USDT. Daily sell limit {settings.limits.sellMax} USDT. Remaining today {dailyRemaining} USDT.
            </div>
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
                <strong>Wallet debit</strong>
              </div>
            </div>

            <div className="wide payoutPanel">
              <h3>Select INR payout mode</h3>
              <div className="paymentTabs">
                <button type="button" className={payoutMode === "upi" ? "active" : ""} onClick={() => { setPayoutMode("upi"); setSavedPayoutId(""); }}>UPI</button>
                <button type="button" className={payoutMode === "account" ? "active" : ""} onClick={() => { setPayoutMode("account"); setSavedPayoutId(""); }}>Account Transfer</button>
              </div>
              {savedPayouts.length > 0 && (
                <label>
                  Use saved payout
                  <select
                    value={savedPayoutId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setSavedPayoutId(nextId);
                      const saved = savedPayouts.find((item) => item.id === nextId);
                      if (saved?.type === "upi") {
                        setUpiId(saved.upiId);
                      }
                      if (saved?.type === "account") {
                        setAccountNumber(saved.accountNumber);
                        setConfirmAccountNumber(saved.accountNumber);
                        setIfsc(saved.ifsc);
                        setBankName(saved.bankName);
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
              <label className="checkLine">
                <input checked={savePayoutForFuture} onChange={(event) => setSavePayoutForFuture(event.target.checked)} type="checkbox" />
                Save this payout detail for faster future payouts
              </label>
            </div>
            <button className="primaryButton wide" type="submit" disabled={!balance.available || Boolean(limitError) || Number(amount || 0) > balance.available}>Submit Sell Request</button>
          </form>
        </section>
      </section>
      <Toast message={toast} onDone={() => setToast("")} />
    </main>
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
