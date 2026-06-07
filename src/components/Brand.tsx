import { Sparkles } from "lucide-react";

interface BrandProps {
  dark?: boolean;
}

export function Brand({ dark = false }: BrandProps) {
  return (
    <a className={`brand ${dark ? "brandDark" : ""}`} href="/" aria-label="Coinvera Exchange Desk home">
      <span className="brandMark">
        <span>CV</span>
      </span>
      <span className="brandText">
        <span className="brandName">
          <span>Coin</span>
          <span>vera</span>
        </span>
        <span className="brandTagline">
          <Sparkles size={12} />
          USDT INR Desk
        </span>
      </span>
    </a>
  );
}
