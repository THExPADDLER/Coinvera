import { Download, Lock, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { StatusPill } from "../components/StatusPill";
import { Toast } from "../components/Toast";
import { addOrderMessage, loadDeskSettings, loadOrders, money, saveDeskSettings, statusFlow, toCsv, updateOrder, updateOrderStatus, usdt } from "../lib/desk";
import type { AdminRole, BankAccountOption, BlockchainDeposit, DeskOrder, DeskSettings, OrderStatus } from "../lib/types";

interface AdminUser {
  username: string;
  role: AdminRole;
  label: string;
}

const adminUsers: Array<AdminUser & { password: string }> = [
  { username: "owner", password: "1234", role: "owner", label: "Owner" },
  { username: "manager", password: "1234", role: "manager", label: "Manager" },
  { username: "operator", password: "1234", role: "operator", label: "Operator" },
  { username: "viewer", password: "1234", role: "viewer", label: "Viewer" }
];

const rolePermissions: Record<AdminRole, {
  canEditSettings: boolean;
  canExport: boolean;
  canUploadProof: boolean;
  canComplete: boolean;
  canChangeStatus: boolean;
}> = {
  owner: { canEditSettings: true, canExport: true, canUploadProof: true, canComplete: true, canChangeStatus: true },
  manager: { canEditSettings: false, canExport: true, canUploadProof: true, canComplete: true, canChangeStatus: true },
  operator: { canEditSettings: false, canExport: false, canUploadProof: true, canComplete: false, canChangeStatus: true },
  viewer: { canEditSettings: false, canExport: false, canUploadProof: false, canComplete: false, canChangeStatus: false }
};

export function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [settings, setSettings] = useState<DeskSettings>(loadDeskSettings());
  const [toast, setToast] = useState("");
  const permissions = adminUser ? rolePermissions[adminUser.role] : rolePermissions.viewer;

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
    const found = adminUsers.find((user) => user.username === username.trim().toLowerCase() && user.password === password);
    if (!found) {
      setToast("Incorrect admin credentials");
      return;
    }
    setAdminUser({ username: found.username, role: found.role, label: found.label });
    setUsername("");
    setPassword("");
    setToast(`${found.label} access unlocked`);
  }

  function changeStatus(orderId: string, status: OrderStatus) {
    if (!permissions.canChangeStatus) {
      setToast("This role cannot change order status");
      return;
    }
    setOrders(updateOrderStatus(orderId, status));
  }

  function uploadAdminProof(order: DeskOrder, file: File | undefined) {
    if (!permissions.canUploadProof) {
      setToast("This role cannot upload proof");
      return;
    }
    if (!file) return;
    const proof = file.name;
    updateOrder(order.id, { adminProof: proof, adminConfirmed: true, status: order.mode === "buy" ? "USDT Released" : "INR Paid" });
    setOrders(addOrderMessage(order.id, { sender: "admin", text: order.mode === "buy" ? "USDT released. Proof uploaded from Coinvera side." : "INR payout completed. Proof uploaded from Coinvera side.", attachment: proof }));
    setToast(`${order.id} proof uploaded`);
  }

  function completeOrder(order: DeskOrder) {
    if (!permissions.canComplete) {
      setToast("This role cannot complete orders");
      return;
    }
    updateOrder(order.id, { adminConfirmed: true, status: "Completed" });
    setOrders(addOrderMessage(order.id, { sender: "admin", text: "Coinvera marked this order completed." }));
  }

  function exportCsv() {
    if (!permissions.canExport) {
      setToast("This role cannot export CSV");
      return;
    }
    const blob = new Blob([toCsv(orders)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "usdt-inr-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateSettings(next: DeskSettings) {
    if (!permissions.canEditSettings) {
      setToast("This role cannot edit website settings");
      return;
    }
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
          {!adminUser ? (
            <>
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" />
              <button className="primaryButton compact" type="button" onClick={unlock}>
                <Lock size={17} />
                Sign in
              </button>
            </>
          ) : (
            <>
              <span className={`roleBadge ${adminUser.role}`}>{adminUser.label}</span>
              <button className="softButton dark" type="button" onClick={() => setOrders(loadOrders())}>
                <RefreshCw size={16} />
                Refresh
              </button>
              {permissions.canExport && (
                <button className="softButton dark" type="button" onClick={exportCsv}>
                  <Download size={16} />
                  CSV
                </button>
              )}
              <button className="softButton dark" type="button" onClick={() => setAdminUser(null)}>
                <LogOut size={16} />
                Lock
              </button>
            </>
          )}
        </div>
      </header>

      {!adminUser ? (
        <section className="lockedPanel">
          <ShieldCheck size={34} />
          <h2>Admin access required</h2>
          <p>Use the demo role credentials below. Customer and admin pages are separate, but orders are shared through browser storage.</p>
          <div className="credentialGrid">
            {adminUsers.map((user) => (
              <div key={user.username}>
                <strong>{user.label}</strong>
                <span>{user.username} / {user.password}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="metricGrid">
            <Metric label="Open orders" value={String(summary.open)} />
            <Metric label="USDT volume" value={usdt(summary.volume)} />
            <Metric label="INR receivable" value={money(summary.receivable)} />
            <Metric label="INR payable" value={money(summary.payable)} />
          </section>

          {permissions.canEditSettings ? (
            <AdminSettings settings={settings} onSave={updateSettings} />
          ) : (
            <section className="adminSettings restrictedPanel">
              <h2>Website Rates & Payment Setup</h2>
              <p>Your role can view orders, but only Owner can edit rates, UPI, bank, CDM, and seller deposit details.</p>
            </section>
          )}

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
                          {order.adminProof && <span>Coinvera proof: {order.adminProof}</span>}
                        </td>
                        <td>
                          <StatusPill label={order.status} mode={order.mode} />
                        </td>
                        <td>
                          <div className="actionRow">
                            <a className="miniLink" href={`/chat/${order.id}?admin=1`}>Chat</a>
                            {permissions.canUploadProof && (
                              <label className="miniUpload">
                                Upload proof
                                <input type="file" accept="image/*" onChange={(event) => uploadAdminProof(order, event.target.files?.[0])} />
                              </label>
                            )}
                            {permissions.canComplete && (
                              <button type="button" onClick={() => completeOrder(order)}>
                                Complete with chat proof
                              </button>
                            )}
                            {permissions.canChangeStatus ? (
                              statusFlow[order.mode].map((status) => (
                                <button key={status} type="button" onClick={() => changeStatus(order.id, status)}>
                                  {status}
                                </button>
                              ))
                            ) : (
                              <span className="readOnlyNote">Read only</span>
                            )}
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

  function setBlockchain(index: number, patch: Partial<BlockchainDeposit>) {
    setDraft({
      ...draft,
      blockchains: draft.blockchains.map((chain, chainIndex) => (chainIndex === index ? { ...chain, ...patch } : chain))
    });
  }

  function addBlockchain() {
    const id = `chain-${Date.now().toString(36)}`;
    setDraft({
      ...draft,
      blockchains: [...draft.blockchains, { id, name: "New USDT Chain", wallet: "", qr: "" }]
    });
  }

  function removeBlockchain(index: number) {
    if (draft.blockchains.length <= 1) return;
    setDraft({
      ...draft,
      blockchains: draft.blockchains.filter((_, chainIndex) => chainIndex !== index)
    });
  }

  function setAccountTransfer(index: number, patch: Partial<BankAccountOption>) {
    setDraft({
      ...draft,
      accountTransfers: draft.accountTransfers.map((account, accountIndex) => (accountIndex === index ? { ...account, ...patch } : account))
    });
  }

  function addAccountTransfer() {
    setDraft({
      ...draft,
      accountTransfers: [...draft.accountTransfers, { id: `account-${Date.now().toString(36)}`, label: "New Account Transfer", accountName: "", accountNumber: "", ifsc: "", bankName: "" }]
    });
  }

  function removeAccountTransfer(index: number) {
    if (draft.accountTransfers.length <= 1) return;
    setDraft({ ...draft, accountTransfers: draft.accountTransfers.filter((_, accountIndex) => accountIndex !== index) });
  }

  function setCdmAccount(index: number, patch: Partial<BankAccountOption>) {
    setDraft({
      ...draft,
      cdmAccounts: draft.cdmAccounts.map((account, accountIndex) => (accountIndex === index ? { ...account, ...patch } : account))
    });
  }

  function addCdmAccount() {
    setDraft({
      ...draft,
      cdmAccounts: [...draft.cdmAccounts, { id: `cdm-${Date.now().toString(36)}`, label: "New CDM Account", accountName: "", accountNumber: "", ifsc: "", bankName: "" }]
    });
  }

  function removeCdmAccount(index: number) {
    if (draft.cdmAccounts.length <= 1) return;
    setDraft({ ...draft, cdmAccounts: draft.cdmAccounts.filter((_, accountIndex) => accountIndex !== index) });
  }

  function uploadQr(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPayment("upiQr", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function uploadSellerQr(index: number, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBlockchain(index, { qr: String(reader.result || "") });
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
          Upload UPI QR barcode
          <input type="file" accept="image/*" onChange={(event) => uploadQr(event.target.files?.[0])} />
        </label>
        <div className="chainManager">
          <div className="chainManagerHead">
            <strong>Seller Blockchain Deposit Wallets</strong>
            <button type="button" onClick={addBlockchain}>Add Blockchain</button>
          </div>
          {draft.blockchains.map((chain, index) => (
            <div className="chainCard" key={chain.id}>
              <label>
                Blockchain name
                <input value={chain.name} onChange={(event) => setBlockchain(index, { name: event.target.value })} placeholder="Example: USDT TRC20" />
              </label>
              <label>
                Wallet address
                <input value={chain.wallet} onChange={(event) => setBlockchain(index, { wallet: event.target.value })} placeholder="Deposit wallet address" />
              </label>
              <label>
                Upload QR
                <input type="file" accept="image/*" onChange={(event) => uploadSellerQr(index, event.target.files?.[0])} />
              </label>
              <button type="button" onClick={() => removeBlockchain(index)} disabled={draft.blockchains.length <= 1}>Remove</button>
            </div>
          ))}
        </div>
        <BankOptionManager
          title="Account Transfer Options"
          addLabel="Add Account"
          options={draft.accountTransfers}
          onAdd={addAccountTransfer}
          onRemove={removeAccountTransfer}
          onChange={setAccountTransfer}
        />
        <BankOptionManager
          title="CDM Cash Deposit Options"
          addLabel="Add CDM Account"
          options={draft.cdmAccounts}
          onAdd={addCdmAccount}
          onRemove={removeCdmAccount}
          onChange={setCdmAccount}
        />
      </div>
    </section>
  );
}

function BankOptionManager({
  addLabel,
  onAdd,
  onChange,
  onRemove,
  options,
  title
}: {
  addLabel: string;
  onAdd: () => void;
  onChange: (index: number, patch: Partial<BankAccountOption>) => void;
  onRemove: (index: number) => void;
  options: BankAccountOption[];
  title: string;
}) {
  return (
    <div className="chainManager">
      <div className="chainManagerHead">
        <strong>{title}</strong>
        <button type="button" onClick={onAdd}>{addLabel}</button>
      </div>
      {options.map((option, index) => (
        <div className="chainCard" key={option.id}>
          <label>
            Label
            <input value={option.label} onChange={(event) => onChange(index, { label: event.target.value })} placeholder="Display label" />
          </label>
          <label>
            Account name
            <input value={option.accountName} onChange={(event) => onChange(index, { accountName: event.target.value })} placeholder="Account name" />
          </label>
          <label>
            Account number
            <input value={option.accountNumber} onChange={(event) => onChange(index, { accountNumber: event.target.value })} placeholder="Account number" />
          </label>
          <label>
            IFSC
            <input value={option.ifsc} onChange={(event) => onChange(index, { ifsc: event.target.value.toUpperCase() })} placeholder="IFSC" />
          </label>
          <label>
            Bank name
            <input value={option.bankName} onChange={(event) => onChange(index, { bankName: event.target.value })} placeholder="Bank name" />
          </label>
          <button type="button" onClick={() => onRemove(index)} disabled={options.length <= 1}>Remove</button>
        </div>
      ))}
    </div>
  );
}
