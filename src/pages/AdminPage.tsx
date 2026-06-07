import { ArrowLeft, ClipboardList, Copy, Download, Eye, Lock, LogOut, PackageCheck, RefreshCw, ShieldCheck, SlidersHorizontal, UserCheck, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { StatusPill } from "../components/StatusPill";
import { Toast } from "../components/Toast";
import { loadCustomerUsers } from "../lib/auth";
import { addActivityLog, addOrderMessage, assignOrderToStaff, loadActivityLogs, loadDeskSettings, loadOrders, money, saveDeskSettings, statusFlow, toCsv, updateOrder, updateOrderStatus, usdt } from "../lib/desk";
import type { AdminActivityLog, AdminRole, BankAccountOption, BlockchainDeposit, CustomerUser, DeskOrder, DeskSettings, OrderStatus } from "../lib/types";
import { ImageCropModal } from "../components/ImageCropModal";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { fileToDataUrl, isImageData } from "../lib/files";

interface AdminUser {
  username: string;
  role: AdminRole;
  label: string;
  staffId: string;
}

const adminUsers: Array<AdminUser & { password: string }> = [
  { username: "owner", password: "1234", role: "owner", label: "Owner", staffId: "CV-OWNER-001" },
  { username: "manager", password: "1234", role: "manager", label: "Manager", staffId: "CV-MGR-001" },
  { username: "operator", password: "1234", role: "operator", label: "Operator", staffId: "CV-OP-101" },
  { username: "viewer", password: "1234", role: "viewer", label: "Viewer", staffId: "CV-VIEW-001" }
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
  operator: { canEditSettings: false, canExport: false, canUploadProof: true, canComplete: true, canChangeStatus: true },
  viewer: { canEditSettings: false, canExport: false, canUploadProof: false, canComplete: false, canChangeStatus: false }
};

type AdminSection = "home" | "orders" | "users" | "settings" | "logs";

export function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [settings, setSettings] = useState<DeskSettings>(loadDeskSettings());
  const [toast, setToast] = useState("");
  const [cropTarget, setCropTarget] = useState<{ file: File; type: "upi" | "chain"; index?: number } | null>(null);
  const [previewProof, setPreviewProof] = useState<{ src: string; alt: string } | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("home");
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
    setUsers(loadCustomerUsers());
    setLogs(loadActivityLogs());
    const sync = () => {
      setOrders(loadOrders());
      setUsers(loadCustomerUsers());
      setSettings(loadDeskSettings());
      setLogs(loadActivityLogs());
    };
    window.addEventListener("desk-orders-updated", sync);
    window.addEventListener("desk-settings-updated", sync);
    window.addEventListener("coinvera-activity-log-updated", sync);
    window.addEventListener("coinvera-users-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("desk-orders-updated", sync);
      window.removeEventListener("desk-settings-updated", sync);
      window.removeEventListener("coinvera-activity-log-updated", sync);
      window.removeEventListener("coinvera-users-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function unlock() {
    const found = adminUsers.find((user) => user.username === username.trim().toLowerCase() && user.password === password);
    if (!found) {
      setToast("Incorrect admin credentials");
      return;
    }
    setAdminUser({ username: found.username, role: found.role, label: found.label, staffId: found.staffId });
    setLogs(addActivityLog({ staffId: found.staffId, staffName: found.label, role: found.role, action: "Signed in to admin panel" }));
    setUsername("");
    setPassword("");
    setActiveSection("home");
    setToast(`${found.label} access unlocked`);
  }

  function changeStatus(orderId: string, status: OrderStatus) {
    if (!permissions.canChangeStatus) {
      setToast("This role cannot change order status");
      return;
    }
    setOrders(updateOrderStatus(orderId, status));
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: `Changed status to ${status}`, orderId }));
    }
  }

  function takeChat(order: DeskOrder) {
    if (!adminUser || adminUser.role === "viewer") {
      setToast("This role cannot take chats");
      return;
    }
    setOrders(assignOrderToStaff(order.id, { staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role }));
    setOrders(addOrderMessage(order.id, { sender: "system", text: `${adminUser.label} (${adminUser.staffId}) is now handling this chat.` }));
    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: order.assignedStaffId ? "Reassigned chat to self" : "Took chat", orderId: order.id }));
    setToast(`${order.id} assigned to ${adminUser.staffId}`);
  }

  async function uploadAdminProof(order: DeskOrder, file: File | undefined) {
    if (!permissions.canUploadProof) {
      setToast("This role cannot upload proof");
      return;
    }
    if (!file) return;
    const proof = await fileToDataUrl(file);
    updateOrder(order.id, { adminProof: proof, adminConfirmed: true, status: order.mode === "buy" ? "USDT Released" : "INR Paid" });
    setOrders(addOrderMessage(order.id, { sender: "admin", text: order.mode === "buy" ? "USDT released. Proof uploaded from Coinvera side." : "INR payout completed. Proof uploaded from Coinvera side.", attachment: file.name, staffId: adminUser?.staffId, staffName: adminUser?.label }));
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Uploaded Coinvera proof", orderId: order.id }));
    }
    setToast(`${order.id} proof uploaded`);
  }

  function completeOrder(order: DeskOrder) {
    if (!permissions.canComplete) {
      setToast("This role cannot complete orders");
      return;
    }
    if (!order.adminProof) {
      setToast("Upload Coinvera proof before completing the order");
      return;
    }
    updateOrder(order.id, { adminConfirmed: true, status: "Completed" });
    setOrders(addOrderMessage(order.id, { sender: "admin", text: "Coinvera staff completed this order. Chat is now closed.", staffId: adminUser?.staffId, staffName: adminUser?.label }));
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Completed order", orderId: order.id }));
    }
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
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Exported order CSV" }));
    }
  }

  function copyMobile(user: CustomerUser) {
    navigator.clipboard?.writeText(user.mobile);
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Copied customer mobile", detail: user.mobile }));
    }
    setToast(`${user.mobile} copied`);
  }

  function updateSettings(next: DeskSettings) {
    if (!permissions.canEditSettings) {
      setToast("This role cannot edit website settings");
      return;
    }
    setSettings(saveDeskSettings(next));
    if (adminUser) {
      setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Updated website rates/payment settings" }));
    }
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
              <span className={`roleBadge ${adminUser.role}`}>{adminUser.label} · {adminUser.staffId}</span>
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
                <span>{user.staffId}</span>
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

          {activeSection === "home" && (
            <section className="adminMenuGrid">
              <AdminMenuCard icon={<PackageCheck size={24} />} title="Orders" meta={`${orders.length} orders`} detail="Chats, proof, staff assignment, status, and completion controls." onClick={() => setActiveSection("orders")} />
              <AdminMenuCard icon={<UsersRound size={24} />} title="Customer Users" meta="Customer registry" detail="Customer profiles, order totals, volume, and quick actions." onClick={() => setActiveSection("users")} />
              <AdminMenuCard icon={<SlidersHorizontal size={24} />} title="Rates & Payment" meta={permissions.canEditSettings ? "Editable" : "Read only"} detail="Rates, UPI QR, bank accounts, CDM, and blockchain wallets." onClick={() => setActiveSection("settings")} />
              <AdminMenuCard icon={<ClipboardList size={24} />} title="Activity Log" meta={`${logs.length} entries`} detail="Staff logins, assignments, proof views, status changes, and exports." onClick={() => setActiveSection("logs")} />
            </section>
          )}

          {activeSection !== "home" && <SectionBack activeSection={activeSection} onBack={() => setActiveSection("home")} />}

          {activeSection === "settings" && (
            permissions.canEditSettings ? (
              <AdminSettings settings={settings} onCropRequest={setCropTarget} onSave={updateSettings} />
            ) : (
              <section className="adminSettings restrictedPanel">
                <h2>Website Rates & Payment Setup</h2>
                <p>Your role can view orders, but only Owner can edit rates, UPI, bank, CDM, and seller deposit details.</p>
              </section>
            )
          )}

          {activeSection === "users" && <CustomerUsersSection users={users} orders={orders} onCopyMobile={copyMobile} />}

          {activeSection === "orders" && <section className="ordersSurface">
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
                          <span>{order.assignedStaffId ? `Agent: ${order.assignedStaffId}` : "Unassigned"}</span>
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
                          {order.paymentScreenshot && <span>Customer proof: {isImageData(order.paymentScreenshot) ? "Uploaded image" : order.paymentScreenshot}</span>}
                          {order.adminProof && <span>Coinvera proof: {isImageData(order.adminProof) ? "Uploaded image" : order.adminProof}</span>}
                        </td>
                        <td>
                          <StatusPill label={order.status} mode={order.mode} />
                        </td>
                        <td>
                          <div className="actionRow">
                            <a className="miniLink" href={`/chat/${order.id}?admin=1&staffId=${encodeURIComponent(adminUser.staffId)}&staffName=${encodeURIComponent(adminUser.label)}`}>Chat</a>
                            <button type="button" onClick={() => takeChat(order)}>
                              <UserCheck size={15} />
                              {order.assignedStaffId ? "Take / Reassign" : "Take Chat"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                order.paymentScreenshot && isImageData(order.paymentScreenshot)
                                  ? (setPreviewProof({ src: order.paymentScreenshot, alt: `${order.id} customer proof` }),
                                    setLogs(addActivityLog({ staffId: adminUser.staffId, staffName: adminUser.label, role: adminUser.role, action: "Viewed customer proof", orderId: order.id })))
                                  : setToast(order.paymentScreenshot ? "This older proof has only a file name. New uploads will open as images." : "No customer proof uploaded yet")
                              }
                            >
                              <Eye size={15} />
                              View Customer Proof
                            </button>
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
          </section>}
          {activeSection === "logs" && <section className="activityLogPanel">
            <div className="settingsHead">
              <div>
                <h2>Admin Activity Log</h2>
                <p>Staff login, chat assignment, proof upload, status updates, completion, and export actions.</p>
              </div>
              <ClipboardList size={28} />
            </div>
            {logs.length === 0 ? (
              <div className="emptyState">No admin activity recorded yet.</div>
            ) : (
              <div className="activityLogList">
                {logs.slice(0, 80).map((log) => (
                  <article className="activityLogItem" key={log.id}>
                    <div>
                      <strong>{log.staffId}</strong>
                      <span>{log.staffName} · {log.role}</span>
                    </div>
                    <p>{log.action}</p>
                    <span>{log.orderId || "System"} · {new Date(log.at).toLocaleString("en-IN")}</span>
                  </article>
                ))}
              </div>
            )}
          </section>}
        </>
      )}

      <Toast message={toast} onDone={() => setToast("")} />
      {cropTarget && (
        <ImageCropModal
          file={cropTarget.file}
          onCancel={() => setCropTarget(null)}
          onSave={(dataUrl) => {
            if (cropTarget.type === "upi") {
              updateSettings({ ...settings, payment: { ...settings.payment, upiQr: dataUrl } });
            } else if (typeof cropTarget.index === "number") {
              updateSettings({
                ...settings,
                blockchains: settings.blockchains.map((chain, index) => (index === cropTarget.index ? { ...chain, qr: dataUrl } : chain))
              });
            }
            setCropTarget(null);
          }}
        />
      )}
      {previewProof && <ImagePreviewModal src={previewProof.src} alt={previewProof.alt} onClose={() => setPreviewProof(null)} />}
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

function AdminMenuCard({
  detail,
  icon,
  meta,
  onClick,
  title
}: {
  detail: string;
  icon: ReactNode;
  meta: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button className="adminMenuCard" type="button" onClick={onClick}>
      <span className="adminMenuIcon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <em>{meta}</em>
      </span>
      <small>{detail}</small>
    </button>
  );
}

function SectionBack({ activeSection, onBack }: { activeSection: AdminSection; onBack: () => void }) {
  const titles: Record<AdminSection, string> = {
    home: "Admin Dashboard",
    orders: "Orders",
    users: "Customer Users",
    settings: "Rates & Payment",
    logs: "Activity Log"
  };

  return (
    <section className="sectionBackBar">
      <button className="softButton dark" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        Dashboard
      </button>
      <strong>{titles[activeSection]}</strong>
    </section>
  );
}

function CustomerUsersSection({
  onCopyMobile,
  orders,
  users
}: {
  onCopyMobile: (user: CustomerUser) => void;
  orders: DeskOrder[];
  users: CustomerUser[];
}) {
  const userMap = new Map<string, CustomerUser>();
  users.forEach((user) => userMap.set(user.mobile, user));
  orders.forEach((order) => {
    const mobile = order.customerMobile || order.phone;
    if (!userMap.has(mobile)) {
      userMap.set(mobile, {
        id: `CUS-${mobile.slice(-4) || "ORDER"}`,
        fullName: order.name,
        mobile,
        createdAt: order.createdAt,
        lastLoginAt: order.createdAt,
        status: "active"
      });
    }
  });

  const rows = Array.from(userMap.values()).map((user) => {
    const userOrders = orders.filter((order) => order.customerMobile === user.mobile || order.phone === user.mobile);
    const lastOrder = userOrders[0];
    return {
      user,
      buyOrders: userOrders.filter((order) => order.mode === "buy").length,
      cancelled: userOrders.filter((order) => order.status === "Cancelled").length,
      completed: userOrders.filter((order) => order.status === "Completed").length,
      inr: userOrders.reduce((sum, order) => sum + order.inr, 0),
      lastOrderAt: lastOrder?.createdAt || user.lastLoginAt,
      orders: userOrders.length,
      sellOrders: userOrders.filter((order) => order.mode === "sell").length,
      usdt: userOrders.reduce((sum, order) => sum + order.amount, 0)
    };
  });

  return (
    <section className="usersPanel">
      <div className="settingsHead">
        <div>
          <h2>Customer Users</h2>
          <p>Firebase-ready user list with order totals, volume, and quick customer actions.</p>
        </div>
        <UsersRound size={28} />
      </div>

      {rows.length === 0 ? (
        <div className="emptyState">No customer users yet. Signup/login customers will appear here.</div>
      ) : (
        <div className="userCards">
          {rows.map((row) => (
            <article className="userCard" key={row.user.id}>
              <div className="userCardHead">
                <div>
                  <strong>{row.user.fullName}</strong>
                  <span>{row.user.mobile}</span>
                  {row.user.email && <span>{row.user.email}</span>}
                </div>
                <span className="roleBadge viewer">{row.user.id}</span>
              </div>
              <div className="userStats">
                <span>Orders <strong>{row.orders}</strong></span>
                <span>Buy <strong>{row.buyOrders}</strong></span>
                <span>Sell <strong>{row.sellOrders}</strong></span>
                <span>Done <strong>{row.completed}</strong></span>
                <span>Cancel <strong>{row.cancelled}</strong></span>
                <span>USDT <strong>{usdt(row.usdt)}</strong></span>
                <span>INR <strong>{money(row.inr)}</strong></span>
                <span>Last <strong>{new Date(row.lastOrderAt).toLocaleDateString("en-IN")}</strong></span>
              </div>
              <div className="actionRow">
                <button type="button" onClick={() => onCopyMobile(row.user)}>
                  <Copy size={15} />
                  Copy mobile
                </button>
                <a className="miniLink" href="/orders">View orders</a>
                <a className="miniLink" href="/messages">Messages</a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminSettings({
  onCropRequest,
  onSave,
  settings
}: {
  onCropRequest: (target: { file: File; type: "upi" | "chain"; index?: number }) => void;
  onSave: (settings: DeskSettings) => void;
  settings: DeskSettings;
}) {
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
          <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onCropRequest({ file: event.target.files[0], type: "upi" })} />
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
                <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onCropRequest({ file: event.target.files[0], type: "chain", index })} />
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
