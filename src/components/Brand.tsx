interface BrandProps {
  dark?: boolean;
}

export function Brand({ dark = false }: BrandProps) {
  return (
    <a className={`brand ${dark ? "brandDark" : ""}`} href="/" aria-label="Coinvera home">
      <svg className="coinveraWordmark" viewBox="0 0 800 120" role="img" aria-label="COINVERA">
        <g className="wordmarkGreen">
          <path d="M43 18h47v14H45c-19 0-30 10-30 28s11 28 30 28h45v14H43C17 102 0 85 0 60S17 18 43 18Z" />
          <path d="M137 18h39c28 0 45 16 45 42s-17 42-45 42h-39c-28 0-45-16-45-42s17-42 45-42Zm2 14c-19 0-30 10-30 28s11 28 30 28h35c19 0 30-10 30-28s-11-28-30-28h-35Z" />
          <path d="M238 18h17v84h-17V18Z" />
          <path d="M276 18h20l63 59V18h17v84h-18l-65-61v61h-17V18Z" />
        </g>
        <g className="wordmarkWhite">
          <path d="M392 18h19l35 66 35-66h19l-45 84h-18l-45-84Z" />
          <path d="M502 18h18v14h-18v-14Z" />
        </g>
        <g className="wordmarkBars">
          <rect x="502" y="44" width="58" height="13" rx="2" />
          <rect x="502" y="74" width="66" height="13" rx="2" />
        </g>
        <g className="wordmarkWhite wordmarkRA">
          <path d="M583 18h58c22 0 36 13 36 32 0 15-9 26-24 30l29 22h-26l-26-20h-29v20h-18V18Zm18 14v36h39c12 0 20-7 20-18s-8-18-20-18h-39Z" />
          <path d="M723 18h20l48 84h-20l-10-18h-49l-10 18h-20l48-84Zm-4 70h34l-17-32-17 32Z" />
        </g>
      </svg>
    </a>
  );
}
