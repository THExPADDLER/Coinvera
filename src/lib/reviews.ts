export interface CustomerReview {
  id: string;
  name: string;
  email: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export const reviewStorageKey = "coinvera-customer-reviews";
const hiddenSeedReviewsKey = "coinvera-hidden-seed-reviews";

export const seededReviews: CustomerReview[] = [
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

export function loadCustomReviews(): CustomerReview[] {
  try {
    return JSON.parse(localStorage.getItem(reviewStorageKey) || "[]") as CustomerReview[];
  } catch {
    return [];
  }
}

function loadHiddenSeedReviews(): string[] {
  try {
    return JSON.parse(localStorage.getItem(hiddenSeedReviewsKey) || "[]") as string[];
  } catch {
    return [];
  }
}

export function loadReviews(): CustomerReview[] {
  const hidden = new Set(loadHiddenSeedReviews());
  return [...loadCustomReviews(), ...seededReviews.filter((review) => !hidden.has(review.id))];
}

export function saveReview(review: CustomerReview): CustomerReview[] {
  const next = [review, ...loadCustomReviews().filter((item) => item.id !== review.id)];
  localStorage.setItem(reviewStorageKey, JSON.stringify(next));
  window.dispatchEvent(new Event("coinvera-reviews-updated"));
  return loadReviews();
}

export function deleteReview(reviewId: string): CustomerReview[] {
  if (reviewId.startsWith("seed-")) {
    localStorage.setItem(hiddenSeedReviewsKey, JSON.stringify([...new Set([...loadHiddenSeedReviews(), reviewId])]));
    window.dispatchEvent(new Event("coinvera-reviews-updated"));
    return loadReviews();
  }
  const custom = loadCustomReviews().filter((item) => item.id !== reviewId);
  localStorage.setItem(reviewStorageKey, JSON.stringify(custom));
  window.dispatchEvent(new Event("coinvera-reviews-updated"));
  return loadReviews().filter((item) => item.id !== reviewId);
}
