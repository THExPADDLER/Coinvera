import { ArrowLeft, Clock3, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { Brand } from "../components/Brand";

const values = [
  { icon: <ShieldCheck size={22} />, title: "Safe and trusted", text: "Every order keeps proof, payment method, and status visible so customers know where their transaction stands." },
  { icon: <Clock3 size={22} />, title: "30 minute target", text: "Most clean orders are targeted for completion within 30 minutes after correct payment and verification." },
  { icon: <MessageCircle size={22} />, title: "Order chat support", text: "Customer and staff can keep proof, updates, and settlement confirmation in one order chat." },
  { icon: <Wallet size={22} />, title: "Wallet-ready flow", text: "Customers can hold verified USDT in Coinvera wallet, sell in smaller parts, or request withdrawal." }
];

export function AboutPage() {
  return (
    <main className="flowShell">
      <AboutNav />
      <section className="aboutShell">
        <div className="aboutHero">
          <p className="eyebrow dark">About Coinvera</p>
          <h1>USDT-INR exchange built for clear, fast settlement.</h1>
          <p>
            Coinvera is designed as a focused exchange desk, not a noisy trading screen. The aim is simple:
            help customers buy USDT with INR or sell verified USDT for INR with clean proof, chat support, and visible order status.
          </p>
        </div>

        <div className="aboutValueGrid">
          {values.map((value) => (
            <article className="aboutValueCard" key={value.title}>
              <span>{value.icon}</span>
              <h2>{value.title}</h2>
              <p>{value.text}</p>
            </article>
          ))}
        </div>

        <section className="aboutProcess">
          <div>
            <p className="eyebrow dark">Our thought</p>
            <h2>Trust grows when the customer can see the complete journey.</h2>
          </div>
          <ol>
            <li><strong>Customer creates order</strong><span>Buy, sell, wallet deposit, or withdrawal request starts with clear details.</span></li>
            <li><strong>Proof and chat stay together</strong><span>Payment screenshots, staff replies, and final proof remain attached to the order.</span></li>
            <li><strong>Staff completes settlement</strong><span>Admin completes the transaction after verification and the customer sees the result.</span></li>
          </ol>
        </section>
      </section>
    </main>
  );
}

function AboutNav() {
  return (
    <nav className="adminNav">
      <Brand dark />
      <div className="navActions">
        <a className="softButton dark" href="/"><ArrowLeft size={16} /> Home</a>
        <a className="softButton dark" href="/reviews">Reviews</a>
      </div>
    </nav>
  );
}
