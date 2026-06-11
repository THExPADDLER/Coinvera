import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminPage } from "./pages/AdminPage";
import { AboutPage } from "./pages/AboutPage";
import { BuyPage } from "./pages/BuyPage";
import { ChatPage } from "./pages/ChatPage";
import { CustomerPage } from "./pages/CustomerPage";
import { MessagesPage } from "./pages/MessagesPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReviewsPage } from "./pages/ReviewsPage";
import { SellPage } from "./pages/SellPage";
import { WalletPage } from "./pages/WalletPage";
import { syncFirebaseToLocal } from "./lib/remoteStore";
import "./styles.css";

void syncFirebaseToLocal();

function App() {
  const path = window.location.pathname;
  if (path.startsWith("/buy")) return <BuyPage />;
  if (path.startsWith("/sell")) return <SellPage />;
  if (path.startsWith("/wallet")) return <WalletPage />;
  if (path.startsWith("/profile")) return <ProfilePage />;
  if (path.startsWith("/about")) return <AboutPage />;
  if (path.startsWith("/reviews")) return <ReviewsPage />;
  if (path.startsWith("/orders")) return <OrdersPage />;
  if (path.startsWith("/messages")) return <MessagesPage />;
  if (path.startsWith("/chat")) return <ChatPage />;
  if (path.startsWith("/control-room")) return <AdminPage />;
  if (path.startsWith("/admin")) return <NotFoundPage />;
  return <CustomerPage />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
