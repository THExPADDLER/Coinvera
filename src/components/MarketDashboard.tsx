import { ArrowRight, BarChart3, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { marketPairs, tradingViewUrl } from "../lib/markets";
import type { MarketPair } from "../lib/markets";
import { TradingViewWidget } from "./TradingViewWidget";

export function MarketDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BINANCE:BTCUSDT");
  const selectedPair = useMemo(() => marketPairs.find((pair) => pair.symbol === selectedSymbol) ?? marketPairs[0], [selectedSymbol]);

  function openTradingView(pair: MarketPair) {
    window.open(tradingViewUrl(pair), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="marketDashboard" aria-label="Live market dashboard">
      <div className="tickerShell">
        <TradingViewWidget kind="ticker-tape" />
      </div>

      <div className="marketHeader">
        <div>
          <p className="eyebrow">Coinvera market terminal</p>
          <h1>Track crypto, gold, silver, and INR before you trade.</h1>
          <p className="lead">Check market movement first, open the selected pair on TradingView, then create a USDT order when the customer is ready.</p>
        </div>
        <a className="primaryButton" href="#trade-request">
          Create order
          <ArrowRight size={18} />
        </a>
      </div>

      <div className="marketGrid">
        <div className="pairBoard">
          <div className="panelTitle">
            <BarChart3 size={19} />
            Market rates
          </div>
          <div className="pairCards">
            {marketPairs.map((pair) => (
              <button className={pair.symbol === selectedSymbol ? "pairCard active" : "pairCard"} key={pair.symbol} type="button" onClick={() => setSelectedSymbol(pair.symbol)}>
                <span>{pair.category}</span>
                <strong>{pair.label}</strong>
                <small>{pair.symbol}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="chartPanel">
          <div className="chartToolbar">
            <label>
              <Search size={16} />
              <select value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value)}>
                {marketPairs.map((pair) => (
                  <option value={pair.symbol} key={pair.symbol}>
                    {pair.label} - {pair.symbol}
                  </option>
                ))}
              </select>
            </label>
            <button className="softButton" type="button" onClick={() => openTradingView(selectedPair)}>
              Open TradingView
              <ExternalLink size={16} />
            </button>
          </div>
          <TradingViewWidget kind="advanced-chart" symbol={selectedSymbol} />
        </div>
      </div>
    </section>
  );
}
