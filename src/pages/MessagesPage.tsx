import { ArrowLeft, MessageCircle, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { StatusPill } from "../components/StatusPill";
import { loadCustomerSession } from "../lib/auth";
import { loadOrders, money, usdt } from "../lib/desk";
import type { DeskOrder } from "../lib/types";

export function MessagesPage() {
  const session = loadCustomerSession();
  const [orders, setOrders] = useState<DeskOrder[]>([]);

  useEffect(() => {
    const sync = () => {
      const all = loadOrders();
      setOrders(session ? all.filter((order) => order.customerMobile === session.mobile || order.phone === session.mobile) : []);
    };
    sync();
    window.addEventListener("desk-orders-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("desk-orders-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [session]);

  const grouped = useMemo(() => {
    const groups = new Map<string, DeskOrder[]>();
    orders.forEach((order) => {
      const label = dayLabel(order.createdAt);
      groups.set(label, [...(groups.get(label) || []), order]);
    });
    return Array.from(groups.entries());
  }, [orders]);

  return (
    <main className="flowShell">
      <nav className="adminNav">
        <Brand dark />
        <div className="navActions">
          <a className="softButton dark" href="/">
            <ArrowLeft size={16} />
            Home
          </a>
          <a className="softButton dark" href="/orders">
            My Orders
          </a>
        </div>
      </nav>

      <section className="ordersPage">
        <div className="flowIntro">
          <p className="eyebrow dark">Messages</p>
          <h1>Your Coinvera chat history.</h1>
          <p>Chats are grouped by day. My Orders stays clean for status, amount, and order information.</p>
        </div>

        {!session ? (
          <div className="lockedPanel">
            <MessageCircle size={36} />
            <h2>Login required</h2>
            <p>Please login/signup from the home page to view your messages.</p>
            <a className="primaryButton" href="/">Go to Login</a>
          </div>
        ) : grouped.length === 0 ? (
          <div className="lockedPanel">
            <PackageCheck size={36} />
            <h2>No messages yet</h2>
            <p>Your buy and sell chats will appear here after you create an order.</p>
          </div>
        ) : (
          <div className="messageDayList">
            {grouped.map(([label, dayOrders]) => (
              <section className="messageDay" key={label}>
                <h2>{label}</h2>
                <div className="messageThreads">
                  {dayOrders.map((order) => {
                    const last = order.chat?.[order.chat.length - 1];
                    return (
                      <a className="messageThread" href={`/chat/${order.id}`} key={order.id}>
                        <div>
                          <strong>{order.mode === "buy" ? "Buy USDT" : "Sell USDT"} · {order.id}</strong>
                          <span>{new Date(last?.at || order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <StatusPill label={order.status} mode={order.mode} />
                        <p>{last?.text || `${usdt(order.amount)} for ${money(order.inr)}`}</p>
                      </a>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function dayLabel(dateValue: string): string {
  const date = new Date(dateValue);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
