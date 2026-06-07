import { Sparkles } from "lucide-react";

interface BrandProps {
  dark?: boolean;
}

export function Brand({ dark = false }: BrandProps) {
  return (
    <a className={`brand ${dark ? "brandDark" : ""}`} href="/" aria-label="Coinvera Exchange Desk home">
      <svg className="brandMark" viewBox="0 0 92 92" role="img" aria-label="Coinvera USDT INR mark">
        <rect x="5" y="5" width="82" height="82" rx="18" />
        <path className="brandRupee" d="M20 28h30M20 38h28M49 28c0 20-14 31-30 31l23 25M22 48h28" />
        <path className="brandDivider" d="M46 20v56" />
        <path className="brandT" d="M53 28h28M67 28v43M55 53c8-6 24-6 32 0M57 61c8-5 20-5 28 0" />
      </svg>
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
