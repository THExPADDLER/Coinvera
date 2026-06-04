export interface MarketPair {
  label: string;
  symbol: string;
  category: "Crypto" | "Metal" | "FX";
  tradingViewPath: string;
}

export const marketPairs: MarketPair[] = [
  { label: "BTCUSD", symbol: "BINANCE:BTCUSDT", category: "Crypto", tradingViewPath: "BINANCE-BTCUSDT" },
  { label: "ETHUSD", symbol: "BINANCE:ETHUSDT", category: "Crypto", tradingViewPath: "BINANCE-ETHUSDT" },
  { label: "BNBUSD", symbol: "BINANCE:BNBUSDT", category: "Crypto", tradingViewPath: "BINANCE-BNBUSDT" },
  { label: "SOLUSD", symbol: "BINANCE:SOLUSDT", category: "Crypto", tradingViewPath: "BINANCE-SOLUSDT" },
  { label: "XRPUSD", symbol: "BINANCE:XRPUSDT", category: "Crypto", tradingViewPath: "BINANCE-XRPUSDT" },
  { label: "DOGEUSD", symbol: "BINANCE:DOGEUSDT", category: "Crypto", tradingViewPath: "BINANCE-DOGEUSDT" },
  { label: "TRXUSD", symbol: "BINANCE:TRXUSDT", category: "Crypto", tradingViewPath: "BINANCE-TRXUSDT" },
  { label: "ADAUSD", symbol: "BINANCE:ADAUSDT", category: "Crypto", tradingViewPath: "BINANCE-ADAUSDT" },
  { label: "XAUUSD", symbol: "OANDA:XAUUSD", category: "Metal", tradingViewPath: "OANDA-XAUUSD" },
  { label: "XAGUSD", symbol: "OANDA:XAGUSD", category: "Metal", tradingViewPath: "OANDA-XAGUSD" },
  { label: "USDINR", symbol: "FX_IDC:USDINR", category: "FX", tradingViewPath: "FX_IDC-USDINR" }
];

export function tradingViewUrl(pair: MarketPair): string {
  return `https://www.tradingview.com/symbols/${pair.tradingViewPath}/`;
}
