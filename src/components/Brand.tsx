import { Sparkles } from "lucide-react";
import { useState } from "react";

interface BrandProps {
  dark?: boolean;
}

export function Brand({ dark = false }: BrandProps) {
  const [logoMissing, setLogoMissing] = useState(false);

  return (
    <a className={`brand ${dark ? "brandDark" : ""}`} href="/" aria-label="Coinvera Exchange Desk home">
      {logoMissing ? (
        <svg className="brandMark" viewBox="0 0 104 104" role="img" aria-label="Coinvera USDT INR mark">
          <defs>
            <radialGradient id="coinveraMarkGlow" cx="50%" cy="0%" r="88%">
              <stop offset="0%" stopColor="#17352f" />
              <stop offset="58%" stopColor="#071716" />
              <stop offset="100%" stopColor="#020b0b" />
            </radialGradient>
          </defs>
          <rect x="5" y="5" width="94" height="94" rx="19" />
          <path className="brandDivider" d="M53 22v62" />
          <text className="brandRupeeGlyph" x="31" y="73" textAnchor="middle">{"\u20B9"}</text>
          <g className="brandTGlyph">
            <text x="72" y="70" textAnchor="middle">T</text>
            <ellipse cx="72" cy="57" rx="25" ry="7" />
          </g>
        </svg>
      ) : (
        <img className="brandMark brandMarkImage" src="/coinvera-logo-mark.png" alt="Coinvera USDT INR mark" onError={() => setLogoMissing(true)} />
      )}
      <span className="brandText">
        <span className="brandName">
          <span>COIN</span>
          <span>VERA</span>
        </span>
        <span className="brandTagline">
          <Sparkles size={12} />
          USDT INR Desk
        </span>
      </span>
    </a>
  );
}
