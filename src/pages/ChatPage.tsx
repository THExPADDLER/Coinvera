import { ArrowLeft, Clock, Image as ImageIcon, LockKeyhole, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { StatusPill } from "../components/StatusPill";
import { loadCustomerSession } from "../lib/auth";
import { addOrderMessage, loadOrders, money, usdt } from "../lib/desk";
import { isImageData } from "../lib/files";
import type { DeskOrder } from "../lib/types";

export function ChatPage() {
  const orderId = window.location.pathname.split("/").filter(Boolean)[1];
  const isAdminView = new URLSearchParams(window.location.search).get("admin") === "1";
  const session = loadCustomerSession();
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [text, setText] = useState("");
  const [tick, setTick] = useState(Date.now());
  const order = useMemo(() => orders.find((item) => item.id === orderId), [orders, orderId]);
  const chatClosed = Boolean(order && ["Completed", "Cancelled"].includes(order.status));

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
    if (!order || chatClosed || !text.trim()) return;
    setOrders(addOrderMessage(order.id, { sender: isAdminView ? "admin" : "customer", text: text.trim() }));
    setText("");
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
          {chatClosed && (
            <div className={`finalChatState ${order.status === "Completed" ? "success" : "danger"}`}>
              <LockKeyhole size={18} />
              {order.status === "Completed" ? "Order completed by Coinvera staff. Chat closed successfully." : "Order cancelled. Chat is closed."}
            </div>
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
            <input value={text} onChange={(event) => setText(event.target.value)} disabled={chatClosed} placeholder={chatClosed ? "Chat closed" : "Type message..."} />
            <button className="primaryButton" type="submit">
              <Send size={17} />
              Send
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

function ProofBox({ proof, title }: { proof?: string; title: string }) {
  return (
    <div className="proofBox">
      <span>{title}</span>
      {proof ? (
        isImageData(proof) ? (
          <img className="proofThumb" src={proof} alt={title} />
        ) : (
          <strong><ImageIcon size={16} /> {proof}</strong>
        )
      ) : (
        <small>Not uploaded yet</small>
      )}
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
