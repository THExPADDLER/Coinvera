import { ArrowLeft, Clock, Image as ImageIcon, LockKeyhole, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { StatusPill } from "../components/StatusPill";
import { loadAdminSession } from "../lib/adminSession";
import { loadCustomerSession } from "../lib/auth";
import { addActivityLog, addOrderMessage, loadOrders, money, usdt } from "../lib/desk";
import { isImageData } from "../lib/files";
import type { AdminRole, DeskOrder } from "../lib/types";

export function ChatPage() {
  const orderId = window.location.pathname.split("/").filter(Boolean)[1];
  const params = new URLSearchParams(window.location.search);
  const isAdminView = params.get("admin") === "1";
  const session = loadCustomerSession();
  const adminSession = isAdminView ? loadAdminSession() : null;
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [text, setText] = useState("");
  const [tick, setTick] = useState(Date.now());
  const order = useMemo(() => orders.find((item) => item.id === orderId), [orders, orderId]);
  const staffId = adminSession?.staffId || params.get("staffId") || order?.assignedStaffId || "CV-STAFF";
  const staffName = adminSession?.label || params.get("staffName") || order?.assignedStaffName || "Coinvera Staff";
  const staffRole = (adminSession?.role || params.get("role") || order?.assignedStaffRole || "operator") as AdminRole;
  const chatClosed = Boolean(order && ["Completed", "Cancelled"].includes(order.status));
  const customerOwnsOrder = Boolean(
    order &&
      session &&
      (order.customerAuthUid ? order.customerAuthUid === session.authUid : (order.customerMobile || order.phone) === session.mobile)
  );
  const customerBlocked = Boolean(order && !isAdminView && !customerOwnsOrder);
  const adminBlocked =
    Boolean(order && isAdminView && (!adminSession || (staffRole === "operator" && (chatClosed || order.assignedStaffId !== staffId))));
  const visibleMessages = useMemo(
    () => {
      if (!order) return [];
      return (order.chat || []).filter((message) => isAdminView || !(order.mode === "sell" && message.sender === "system"));
    },
    [isAdminView, order]
  );

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
    if (!order || chatClosed || adminBlocked || customerBlocked || !text.trim()) return;
    setOrders(addOrderMessage(order.id, { sender: isAdminView ? "admin" : "customer", text: text.trim(), staffId: isAdminView ? staffId : undefined, staffName: isAdminView ? staffName : undefined }));
    if (isAdminView) {
      addActivityLog({ staffId, staffName, role: order.assignedStaffRole || "operator", action: "Sent chat message", orderId: order.id });
    }
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

  if (adminBlocked) {
    return (
      <main className="flowShell">
        <ChatNav />
        <section className="lockedPanel">
          <LockKeyhole size={36} />
          <h2>Chat locked</h2>
          <p>This order is closed or assigned to another staff member.</p>
          <a className="primaryButton" href="/control-room">Back to Admin</a>
        </section>
      </main>
    );
  }

  if (customerBlocked) {
    return (
      <main className="flowShell">
        <ChatNav />
        <section className="lockedPanel">
          <LockKeyhole size={36} />
          <h2>Access denied</h2>
          <p>This order does not belong to your Coinvera account.</p>
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
            {order.platformFeeInr ? <span>Platform fee: {money(order.platformFeeInr)}</span> : null}
            <span>Network: {order.network}</span>
            <span>Ref: {order.paymentReference || "Pending"}</span>
          </div>
          <ProofBox title="Customer proof" proof={order.paymentScreenshot} onPreview={(src) => setPreviewImage({ src, alt: "Customer proof" })} />
          <ProofBox title="Coinvera proof" proof={order.adminProof} onPreview={(src) => setPreviewImage({ src, alt: "Coinvera proof" })} />
          {chatClosed && (
            <div className={`finalChatState ${order.status === "Completed" ? "success" : "danger"}`}>
              <LockKeyhole size={18} />
              {order.status === "Completed" ? "ORDER COMPLETED" : "ORDER CANCELLED"}
            </div>
          )}
        </aside>

        <section className="chatPanel">
          <div className="chatMessages">
            {visibleMessages.map((message) => (
              <article className={`chatBubble ${message.sender}`} key={message.id}>
                <span>{message.sender === "admin" ? `Coinvera Staff${message.staffId ? ` - ${message.staffId}` : ""}` : message.sender === "system" ? "System" : "Customer"}</span>
                <p>{displayChatText(message.text)}</p>
                {message.attachment && (
                  isImageData(message.attachment) ? (
                    <button className="chatAttachment" type="button" onClick={() => setPreviewImage({ src: message.attachment || "", alt: "Chat attachment" })}>
                      <img src={message.attachment} alt="Chat attachment" />
                      <small><ImageIcon size={14} /> View uploaded proof</small>
                    </button>
                  ) : (
                    <small><ImageIcon size={14} /> {message.attachment}</small>
                  )
                )}
                <time>{new Date(message.at).toLocaleString("en-IN")}</time>
              </article>
            ))}
          </div>
          {chatClosed || adminBlocked ? (
            <div className="chatEndedBox">Chat ended</div>
          ) : (
            <form className="chatComposer" onSubmit={sendMessage}>
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Type message..." />
              <button className="primaryButton" type="submit">
                <Send size={17} />
                Send
              </button>
            </form>
          )}
        </section>
      </section>
      {previewImage && <ImagePreviewModal src={previewImage.src} alt={previewImage.alt} onClose={() => setPreviewImage(null)} />}
    </main>
  );
}

function ProofBox({ onPreview, proof, title }: { onPreview: (src: string) => void; proof?: string; title: string }) {
  return (
    <div className="proofBox">
      <span>{title}</span>
      {proof ? (
        isImageData(proof) ? (
          <button className="proofThumbButton" type="button" onClick={() => onPreview(proof)}>
            <img className="proofThumb" src={proof} alt={title} />
          </button>
        ) : (
          <strong><ImageIcon size={16} /> {proof}</strong>
        )
      ) : (
        <small>Not uploaded yet</small>
      )}
    </div>
  );
}

function displayChatText(text: string) {
  if (text.toLowerCase().includes("completed this order") || text.toLowerCase().includes("order completed by coinvera staff")) {
    return "ORDER COMPLETED";
  }
  return text;
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
