import { ArrowLeft, Send, ShieldCheck, Star } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { Toast } from "../components/Toast";
import { loadCustomerSession } from "../lib/auth";
import { loadCustomerUsers } from "../lib/auth";
import { maskEmail } from "../lib/mask";
import { loadReviews, saveReview, type CustomerReview } from "../lib/reviews";

export function ReviewsPage() {
  const session = loadCustomerSession();
  const users = loadCustomerUsers();
  const user = session ? users.find((item) => item.mobile === session.mobile) : null;
  const [reviews, setReviews] = useState<CustomerReview[]>(loadReviews());
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
    const review: CustomerReview = {
      id: `REV-${Date.now().toString(36)}`,
      name: displayName,
      email: displayEmail,
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };
    setReviews(saveReview(review));
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
