import { ArrowLeft, CheckCircle2, Clock, Image as ImageIcon, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { StatusPill } from "../components/StatusPill";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { addOrderMessage, loadOrders, money, updateOrder, usdt } from "../lib/desk";
import type { DeskOrder } from "../lib/types";

export function ChatPage() {
  const orderId = window.location.pathname.split("/").filter(Boolean)[1];
  const isAdminView = new URLSearchParams(window.location.search).get("admin") === "1";
  const session = loadCustomerSession();
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [text, setText] = useState("");
  const [toast, setToast] = useState("");
  const [tick, setTick] = useState(Date.now());
  const order = useMemo(() => orders.find((item) => item.id === orderId), [orders, orderId]);

  useEffect(() => {
    const sync = () => setOrders(loadOrders());
    sync();
    window.addEventListener("desk-orders-updated", sync);
    window.addEventListener("storage", sync);
    const timer = window.setInterval(() => {
      setTick(Date.now());
      sync();
    }, 1000);
    return () => {
      window.removeEventListener("desk-orders-updated", sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(timer);
    };
  }, []);

  const remaining = useMemo(() => {
    if (!order?.expiresAt || ["Completed", "Cancelled"].includes(order.status)) return "";
    const ms = Math.max(0, new Date(order.expiresAt).getTime() - tick);
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [order, tick]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !text.trim()) return;
    setOrders(addOrderMessage(order.id, { sender: isAdminView ? "admin" : "customer", text: text.trim() }));
    setText("");
  }

  function confirmReceived() {
    if (!order) return;
    updateOrder(order.id, { customerConfirmed: true });
    setOrders(addOrderMessage(order.id, { sender: "customer", text: "I confirm that I have received what I paid for." }));
    setToast("Confirmation submitted");
  }

  if (!session && !isAdminView) {
    return (
      <main className="flowShell">
        <ChatNav />
        <section className="lockedPanel">
          <Send size={36} />
          <h2>Login required</h2>
          <p>Please login from the home page to view this order chat.</p>
          <a className="primaryButton" href="/">Go to Login</a>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flowShell">
        <ChatNav />
        <section className="lockedPanel">
          <Send size={36} />
          <h2>Order not found</h2>
          <p>This chat will appear after an order is submitted.</p>
          <a className="primaryButton" href="/orders">My Orders</a>
        </section>
      </main>
    );
  }

  return (
    <main className="flowShell">
      <ChatNav />
      <section className="chatShell">
        <aside className="chatSummary">
          <p className="eyebrow dark">Order Chat</p>
          <h1>{order.id}</h1>
          <StatusPill label={order.status} mode={order.mode} />
          <div className="timerBadge">
            <Clock size={17} />
            {remaining ? `${remaining} left` : order.status}
          </div>
          <div className="summaryRows">
            <span>{order.mode === "buy" ? "Buy" : "Sell"} {usdt(order.amount)}</span>
            <strong>{money(order.inr)}</strong>
            <span>Network: {order.network}</span>
            <span>Ref: {order.paymentReference || "Pending"}</span>
          </div>
          <ProofBox title="Customer proof" proof={order.paymentScreenshot} />
          <ProofBox title="Coinvera proof" proof={order.adminProof} />
          {!isAdminView && (
            <button className="primaryButton" type="button" onClick={confirmReceived} disabled={order.customerConfirmed || order.status === "Cancelled"}>
              <CheckCircle2 size={18} />
              {order.customerConfirmed ? "Confirmed Received" : "I have received"}
            </button>
          )}
        </aside>

        <section className="chatPanel">
          <div className="chatMessages">
            {(order.chat || []).map((message) => (
              <article className={`chatBubble ${message.sender}`} key={message.id}>
                <span>{message.sender === "admin" ? "Coinvera" : message.sender === "system" ? "System" : "Customer"}</span>
                <p>{message.text}</p>
                {message.attachment && <small><ImageIcon size={14} /> {message.attachment}</small>}
                <time>{new Date(message.at).toLocaleString("en-IN")}</time>
              </article>
            ))}
          </div>
          <form className="chatComposer" onSubmit={sendMessage}>
            <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Type message..." />
            <button className="primaryButton" type="submit">
              <Send size={17} />
              Send
            </button>
          </form>
        </section>
      </section>
      <Toast message={toast} onDone={() => setToast("")} />
    </main>
  );
}

function ProofBox({ proof, title }: { proof?: string; title: string }) {
  return (
    <div className="proofBox">
      <span>{title}</span>
      {proof ? <strong><ImageIcon size={16} /> {proof}</strong> : <small>Not uploaded yet</small>}
    </div>
  );
}

function ChatNav() {
  return (
    <nav className="adminNav">
      <Brand dark />
      <div className="navActions">
        <a className="softButton dark" href="/orders"><ArrowLeft size={16} /> My Orders</a>
      </div>
    </nav>
  );
}
