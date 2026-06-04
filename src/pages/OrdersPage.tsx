import { ArrowLeft, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "../components/Brand";
import { StatusPill } from "../components/StatusPill";
import { loadCustomerSession } from "../lib/auth";
import { loadOrders, money, usdt } from "../lib/desk";
import type { DeskOrder } from "../lib/types";

export function OrdersPage() {
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

  return (
    <main className="flowShell">
      <nav className="adminNav">
        <Brand dark />
        <div className="navActions">
          <a className="softButton dark" href="/"><ArrowLeft size={16} /> Home</a>
        </div>
      </nav>
      <section className="ordersPage">
        <div className="flowIntro">
          <p className="eyebrow dark">My Orders</p>
          <h1>Track your Coinvera orders.</h1>
          <p>Buy orders remain processing until admin releases USDT and marks them completed.</p>
        </div>
        <div className="orderCards">
          {!session ? (
            <div className="lockedPanel">
              <PackageCheck size={36} />
              <h2>Login required</h2>
              <p>Please login/signup from the home page to view your orders.</p>
              <a className="primaryButton" href="/">Go to Login</a>
            </div>
          ) : orders.length === 0 ? (
            <div className="lockedPanel">
              <PackageCheck size={36} />
              <h2>No orders yet</h2>
              <p>Your submitted buy or sell orders will appear here.</p>
            </div>
          ) : (
            orders.map((order) => (
              <article className="orderCard" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>{new Date(order.createdAt).toLocaleString("en-IN")}</span>
                </div>
                <StatusPill label={order.status} mode={order.mode} />
                <p>{order.mode === "buy" ? "Buy" : "Sell"} {usdt(order.amount)} at {money(order.rate)}</p>
                <h3>{money(order.inr)}</h3>
                <small>{order.paymentMethod ? `${order.paymentMethod.toUpperCase()} ref: ${order.paymentReference || "Pending"}` : order.payment}</small>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
