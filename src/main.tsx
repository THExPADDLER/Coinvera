import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminPage } from "./pages/AdminPage";
import { BuyPage } from "./pages/BuyPage";
import { CustomerPage } from "./pages/CustomerPage";
import { OrdersPage } from "./pages/OrdersPage";
import { SellPage } from "./pages/SellPage";
import "./styles.css";

function App() {
  const path = window.location.pathname;
  if (path.startsWith("/buy")) return <BuyPage />;
  if (path.startsWith("/sell")) return <SellPage />;
  if (path.startsWith("/orders")) return <OrdersPage />;
  return path.startsWith("/admin") ? <AdminPage /> : <CustomerPage />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
