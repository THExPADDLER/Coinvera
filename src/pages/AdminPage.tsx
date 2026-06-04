import { Download, Lock, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Brand } from "../components/Brand";
import { StatusPill } from "../components/StatusPill";
import { Toast } from "../components/Toast";
import { loadDeskSettings, loadOrders, money, saveDeskSettings, statusFlow, toCsv, updateOrderStatus, usdt } from "../lib/desk";
import type { DeskOrder, DeskSettings, OrderStatus } from "../lib/types";

export function AdminPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [settings, setSettings] = useState<DeskSettings>(loadDeskSettings());
  const [toast, setToast] = useState("");

  const activeOrders = useMemo(() => orders.filter((order) => !["Completed", "Cancelled"].includes(order.status)), [orders]);
  const summary = useMemo(
    () => ({
      open: activeOrders.length,
      volume: activeOrders.reduce((sum, order) => sum + order.amount, 0),
      receivable: activeOrders.filter((order) => order.mode === "buy").reduce((sum, order) => sum + order.inr, 0),
      payable: activeOrders.filter((order) => order.mode === "sell").reduce((sum, order) => sum + order.inr, 0)
    }),
    [activeOrders]
  );

  useEffect(() => {
    setOrders(loadOrders());
    const sync = () => {
      setOrders(loadOrders());
      setSettings(loadDeskSettings());
    };
    window.addEventListener("desk-orders-updated", sync);
    window.addEventListener("desk-settings-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("desk-orders-updated", sync);
      window.removeEventListener("desk-settings-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function unlock() {
    if (pin !== "1234") {
      setToast("Incorrect admin PIN");
      return;
    }
    setUnlocked(true);
    setPin("");
    setToast("Admin panel unlocked");
  }

  function changeStatus(orderId: string, status: OrderStatus) {
    setOrders(updateOrderStatus(orderId, status));
  }

  function exportCsv() {
    const blob = new Blob([toCsv(orders)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "usdt-inr-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateSettings(next: DeskSettings) {
    setSettings(saveDeskSettings(next));
    setToast("Website rates and payment details updated");
  }

  return (
    <main className="adminShell">
      <nav className="adminNav">
        <Brand dark />
        <div className="navActions">
          <a className="softButton dark" href="/">
            Customer Page
          </a>
        </div>
      </nav>

      <header className="adminHero">
        <div>
          <p className="eyebrow dark">Separated secure workspace</p>
          <h1>Coinvera Admin Desk</h1>
          <p>Pay customers, receive INR, release USDT, export orders, and monitor Coinvera settlement exposure.</p>
        </div>
        <div className="adminAuth">
          {!unlocked ? (
            <>
              <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" placeholder="Admin PIN" />
              <button className="primaryButton compact" type="button" onClick={unlock}>
                <Lock size={17} />
                Unlock
              </button>
            </>
          ) : (
            <>
              <button className="softButton dark" type="button" onClick={() => setOrders(loadOrders())}>
                <RefreshCw size={16} />
                Refresh
              </button>
              <button className="softButton dark" type="button" onClick={exportCsv}>
                <Download size={16} />
                CSV
              </button>
              <button className="softButton dark" type="button" onClick={() => setUnlocked(false)}>
                <LogOut size={16} />
                Lock
              </button>
            </>
          )}
        </div>
      </header>

      {!unlocked ? (
        <section className="lockedPanel">
          <ShieldCheck size={34} />
          <h2>Admin access required</h2>
          <p>Use PIN 1234 for this prototype. Customer and admin pages are separate, but orders are shared through browser storage.</p>
        </section>
      ) : (
        <>
          <section className="metricGrid">
            <Metric label="Open orders" value={String(summary.open)} />
            <Metric label="USDT volume" value={usdt(summary.volume)} />
            <Metric label="INR receivable" value={money(summary.receivable)} />
            <Metric label="INR payable" value={money(summary.payable)} />
          </section>

          <AdminSettings settings={settings} onSave={updateSettings} />

          <section className="ordersSurface">
            {orders.length === 0 ? (
              <div className="emptyState">No customer orders yet.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Trade</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.id}</strong>
                          <span>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                        </td>
                        <td>
                          <strong>{order.name}</strong>
                          <span>{order.phone}</span>
                          <span>{order.kyc || "Basic account"}</span>
                        </td>
                        <td>
                          <StatusPill label={order.mode === "buy" ? "Buy USDT" : "Sell USDT"} mode={order.mode} />
                          <span>{usdt(order.amount)} at {money(order.rate)}</span>
                          <strong>{money(order.inr)}</strong>
                        </td>
                        <td>
                          <strong>{order.network}</strong>
                          <span>{order.wallet}</span>
                          <span>{order.payment}</span>
                          {order.paymentMethod && <span>Method: {order.paymentMethod.toUpperCase()}</span>}
                          {order.paymentReference && <span>Ref: {order.paymentReference}</span>}
                          {order.paymentScreenshot && <span>Proof: {order.paymentScreenshot}</span>}
                        </td>
                        <td>
                          <StatusPill label={order.status} mode={order.mode} />
                        </td>
                        <td>
                          <div className="actionRow">
                            {statusFlow[order.mode].map((status) => (
                              <button key={status} type="button" onClick={() => changeStatus(order.id, status)}>
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <Toast message={toast} onDone={() => setToast("")} />
    </main>
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

function AdminSettings({ settings, onSave }: { settings: DeskSettings; onSave: (settings: DeskSettings) => void }) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => setDraft(settings), [settings]);

  function setRate(key: "buy" | "sell", value: string) {
    setDraft({ ...draft, rates: { ...draft.rates, [key]: Number(value) } });
  }

  function setPayment(key: keyof DeskSettings["payment"], value: string) {
    setDraft({ ...draft, payment: { ...draft.payment, [key]: value } });
  }

  function uploadQr(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPayment("upiQr", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function uploadSellerQr(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPayment("usdtReceivingQr", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  return (
    <section className="adminSettings">
      <div className="settingsHead">
        <div>
          <h2>Website Rates & Payment Setup</h2>
          <p>Updates reflect on customer buy/sell pages immediately in this browser.</p>
        </div>
        <button className="primaryButton compact" type="button" onClick={() => onSave(draft)}>Save Settings</button>
      </div>

      <div className="settingsGrid">
        <label>
          Buy price per USDT
          <input type="number" value={draft.rates.buy} onChange={(event) => setRate("buy", event.target.value)} />
        </label>
        <label>
          Sell price per USDT
          <input type="number" value={draft.rates.sell} onChange={(event) => setRate("sell", event.target.value)} />
        </label>
        <label>
          UPI holder name
          <input value={draft.payment.holderName} onChange={(event) => setPayment("holderName", event.target.value)} />
        </label>
        <label>
          UPI ID
          <input value={draft.payment.upiId} onChange={(event) => setPayment("upiId", event.target.value)} />
        </label>
        <label className="wide">
          UPI QR image URL
          <input value={draft.payment.upiQr} onChange={(event) => setPayment("upiQr", event.target.value)} placeholder="Paste QR image URL or data URL" />
        </label>
        <label className="wide">
          Upload UPI QR barcode
          <input type="file" accept="image/*" onChange={(event) => uploadQr(event.target.files?.[0])} />
        </label>
        <label className="wide">
          USDT receiving wallet for sellers
          <input value={draft.payment.usdtReceivingWallet} onChange={(event) => setPayment("usdtReceivingWallet", event.target.value)} placeholder="Wallet address shown on sell page" />
        </label>
        <label>
          Seller deposit blockchain name
          <input value={draft.payment.usdtReceivingNetwork} onChange={(event) => setPayment("usdtReceivingNetwork", event.target.value)} placeholder="Example: USDT TRC20" />
        </label>
        <label>
          Seller deposit QR image URL
          <input value={draft.payment.usdtReceivingQr} onChange={(event) => setPayment("usdtReceivingQr", event.target.value)} placeholder="Paste wallet QR image URL or data URL" />
        </label>
        <label className="wide">
          Upload seller deposit QR
          <input type="file" accept="image/*" onChange={(event) => uploadSellerQr(event.target.files?.[0])} />
        </label>
        <FieldGroup title="Account Transfer">
          <input value={draft.payment.accountName} onChange={(event) => setPayment("accountName", event.target.value)} placeholder="Account name" />
          <input value={draft.payment.accountNumber} onChange={(event) => setPayment("accountNumber", event.target.value)} placeholder="Account number" />
          <input value={draft.payment.ifsc} onChange={(event) => setPayment("ifsc", event.target.value)} placeholder="IFSC" />
          <input value={draft.payment.bankName} onChange={(event) => setPayment("bankName", event.target.value)} placeholder="Bank name" />
        </FieldGroup>
        <FieldGroup title="CDM Cash Deposit">
          <input value={draft.payment.cdmName} onChange={(event) => setPayment("cdmName", event.target.value)} placeholder="CDM account name" />
          <input value={draft.payment.cdmAccountNumber} onChange={(event) => setPayment("cdmAccountNumber", event.target.value)} placeholder="CDM account number" />
          <input value={draft.payment.cdmIfsc} onChange={(event) => setPayment("cdmIfsc", event.target.value)} placeholder="CDM IFSC" />
          <input value={draft.payment.cdmBankName} onChange={(event) => setPayment("cdmBankName", event.target.value)} placeholder="CDM bank name" />
        </FieldGroup>
      </div>
    </section>
  );
}

function FieldGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="fieldGroup">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
