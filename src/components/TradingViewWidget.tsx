import { useEffect, useRef } from "react";

type WidgetKind = "ticker-tape" | "advanced-chart";

interface TradingViewWidgetProps {
  kind: WidgetKind;
  symbol?: string;
}

const widgetSrc: Record<WidgetKind, string> = {
  "ticker-tape": "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
  "advanced-chart": "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
};

export function TradingViewWidget({ kind, symbol = "BINANCE:BTCUSDT" }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = widgetSrc[kind];
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify(kind === "ticker-tape" ? tickerConfig : chartConfig(symbol));
    container.appendChild(script);
  }, [kind, symbol]);

  return <div className={`tradingview-widget-container tvWidget ${kind}`} ref={containerRef} />;
}

const tickerConfig = {
  symbols: [
    { proName: "BINANCE:BTCUSDT", title: "BTC" },
    { proName: "BINANCE:ETHUSDT", title: "ETH" },
    { proName: "BINANCE:BNBUSDT", title: "BNB" },
    { proName: "BINANCE:SOLUSDT", title: "SOL" },
    { proName: "BINANCE:XRPUSDT", title: "XRP" },
    { proName: "BINANCE:DOGEUSDT", title: "DOGE" },
    { proName: "OANDA:XAUUSD", title: "XAUUSD" },
    { proName: "OANDA:XAGUSD", title: "XAGUSD" },
    { proName: "FX_IDC:USDINR", title: "USDINR" }
  ],
  showSymbolLogo: true,
  isTransparent: true,
  displayMode: "adaptive",
  colorTheme: "dark",
  locale: "en"
};

function chartConfig(symbol: string) {
  return {
    autosize: true,
    symbol,
    interval: "60",
    timezone: "Asia/Kolkata",
    theme: "dark",
    style: "1",
    locale: "en",
    allow_symbol_change: true,
    save_image: true,
    calendar: false,
    hide_side_toolbar: false,
    support_host: "https://www.tradingview.com"
  };
}
