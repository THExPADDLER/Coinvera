import { BadgeIndianRupee, Sparkles } from "lucide-react";

interface BrandProps {
  dark?: boolean;
}

export function Brand({ dark = false }: BrandProps) {
  return (
    <a className={`brand ${dark ? "brandDark" : ""}`} href="/" aria-label="Coinvera Exchange Desk home">
      <span className="brandMark">
        <BadgeIndianRupee size={21} strokeWidth={2.25} />
      </span>
      <span className="brandText">
        <span className="brandName">Coinvera</span>
        <span className="brandTagline">
          <Sparkles size={12} />
          Exchange Desk
        </span>
      </span>
    </a>
  );
}
