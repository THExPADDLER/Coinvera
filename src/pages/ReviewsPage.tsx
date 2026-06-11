import { ArrowLeft, Send, ShieldCheck, Star } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { loadCustomerUsers } from "../lib/auth";
import { maskEmail } from "../lib/mask";

interface Review {
  id: string;
  name: string;
  email: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const reviewStorageKey = "coinvera-customer-reviews";

const seededReviews: Review[] = [
  {
    id: "seed-vivek-patil",
    name: "Vivek Patil",
    email: "patilxvivek@gmail.com",
    rating: 5,
    comment: "I bought USDT through Coinvera and the order was completed within 30 minutes. The payment process was simple and chat support kept me updated.",
    createdAt: "2026-06-01T10:30:00.000Z"
  },
  {
    id: "seed-rahul-sharma",
    name: "Rahul Sharma",
    email: "rahulsharma88@gmail.com",
    rating: 5,
    comment: "Very safe and trusted service for USDT to INR. I sold USDT and received payment quickly after verification.",
    createdAt: "2026-06-02T12:15:00.000Z"
  },
  {
    id: "seed-priya-mehta",
    name: "Priya Mehta",
    email: "priyamehta24@gmail.com",
    rating: 5,
    comment: "Coinvera feels professional and transparent. My buy order was processed smoothly and I could track everything from the order section.",
    createdAt: "2026-06-03T16:00:00.000Z"
  },
  {
    id: "seed-aman-verma",
    name: "Aman Verma",
    email: "amanverma07@gmail.com",
    rating: 4,
    comment: "Fast order completion and proper communication. My INR payout was handled safely and completed in less than 30 minutes.",
    createdAt: "2026-06-04T09:45:00.000Z"
  },
  {
    id: "seed-neha-kulkarni",
    name: "Neha Kulkarni",
    email: "nehakulkarni91@gmail.com",
    rating: 5,
    comment: "Trusted platform for INR to USDT. I liked that payment proof and order status were clearly shown in chat.",
    createdAt: "2026-06-05T18:10:00.000Z"
  },
  {
    id: "seed-karan-joshi",
    name: "Karan Joshi",
    email: "karanjoshi18@gmail.com",
    rating: 5,
    comment: "Safe, fast, and simple. Coinvera completed my transaction within 30 minutes and support response was good.",
    createdAt: "2026-06-06T14:20:00.000Z"
  }
];

function loadReviews(): Review[] {
  try {
    const custom = JSON.parse(localStorage.getItem(reviewStorageKey) || "[]") as Review[];
    return [...custom, ...seededReviews];
  } catch {
    return seededReviews;
  }
}

function saveReview(review: Review) {
  const current = loadReviews().filter((item) => !item.id.startsWith("seed-"));
  localStorage.setItem(reviewStorageKey, JSON.stringify([review, ...current]));
}

export function ReviewsPage() {
  const session = loadCustomerSession();
  const users = loadCustomerUsers();
  const user = session ? users.find((item) => item.mobile === session.mobile) : null;
  const [reviews, setReviews] = useState<Review[]>(loadReviews());
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const displayName = session?.fullName || "Coinvera Customer";
  const displayEmail = user?.email || "";
  const average = useMemo(() => reviews.reduce((sum, review) => sum + review.rating, 0) / Math.max(1, reviews.length), [reviews]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) {
      setToast("Please write your review");
      return;
    }
    const review: Review = {
      id: `REV-${Date.now().toString(36)}`,
      name: displayName,
      email: displayEmail,
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };
    saveReview(review);
    setReviews(loadReviews());
    setComment("");
    setRating(5);
    setToast("Review submitted");
  }

  return (
    <main className="flowShell">
      <ReviewsNav />
      <section className="reviewsShell">
        <div className="reviewsHero">
          <div>
            <p className="eyebrow dark">Reviews & Feedback</p>
            <h1>Safe, trusted USDT-INR orders with fast completion.</h1>
            <p>Customers value clear payment proof, chat updates, and Coinvera's 30 minute completion target for clean orders.</p>
          </div>
          <div className="reviewScoreCard">
            <strong>{average.toFixed(1)}</strong>
            <Stars count={Math.round(average)} />
            <span>{reviews.length} customer reviews</span>
          </div>
        </div>

        <section className="reviewsGrid">
          <form className="reviewForm" onSubmit={submit}>
            <h2>Submit Feedback</h2>
            <div className="ratingPicker">
              {[1, 2, 3, 4, 5].map((value) => (
                <button className={value <= rating ? "active" : ""} type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} star`}>
                  <Star size={22} />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share your Coinvera experience" />
            <button className="primaryButton" type="submit"><Send size={16} /> Submit Review</button>
            <small>Your public review shows your name and masked email only: {maskEmail(displayEmail)}</small>
          </form>

          <div className="reviewList">
            {reviews.map((review) => (
              <article className="reviewCard" key={review.id}>
                <div className="reviewAvatar">{review.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <div className="reviewCardHead">
                    <strong>{review.name}</strong>
                    <Stars count={review.rating} />
                  </div>
                  <span>{maskEmail(review.email)}</span>
                  <p>{review.comment}</p>
                  <div className="reviewBadges">
                    <em><ShieldCheck size={13} /> Safe</em>
                    <em>Trusted</em>
                    <em>30 min target</em>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
      <Toast message={toast} onDone={() => setToast("")} />
    </main>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((item) => <Star className={item <= count ? "filled" : ""} size={16} key={item} />)}
    </span>
  );
}

function ReviewsNav() {
  return (
    <nav className="adminNav">
      <Brand dark />
      <div className="navActions">
        <a className="softButton dark" href="/"><ArrowLeft size={16} /> Home</a>
        <a className="softButton dark" href="/about">About</a>
      </div>
    </nav>
  );
}
