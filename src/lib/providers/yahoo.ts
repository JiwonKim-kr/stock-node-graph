import type { MarketType, QuoteProvider, StockQuote } from "./types";

// Yahoo Finance 폴백: 한국 종목코드 뒤에 KOSPI는 .KS, KOSDAQ는 .KQ 접미사를 붙인다.
const MARKET_SUFFIX: Record<MarketType, string> = {
  KOSPI: ".KS",
  KOSDAQ: ".KQ",
};

const FETCH_TIMEOUT_MS = 8000;

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketVolume?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{ meta?: YahooChartMeta }>;
    error?: { code?: string; description?: string } | null;
  };
}

async function fetchQuote(ticker: string, market: MarketType): Promise<StockQuote> {
  const symbol = `${ticker}${MARKET_SUFFIX[market]}`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Yahoo API ${res.status} ${res.statusText}: ${symbol}`);
  }

  const data = (await res.json()) as YahooChartResponse;
  if (data.chart?.error) {
    throw new Error(`Yahoo API error for ${symbol}: ${data.chart.error.description}`);
  }
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const prevClose = meta?.chartPreviousClose ?? meta?.previousClose;
  if (typeof price !== "number" || !Number.isFinite(price)) {
    throw new Error(`Yahoo: no market price for ${symbol}`);
  }
  if (typeof prevClose !== "number" || !Number.isFinite(prevClose) || prevClose === 0) {
    throw new Error(`Yahoo: no previous close for ${symbol}`);
  }

  const changePercent = Math.round(((price - prevClose) / prevClose) * 10000) / 100;
  const volume = meta?.regularMarketVolume;
  return {
    price,
    changePercent,
    volume: BigInt(Math.max(0, Math.round(volume ?? 0))),
  };
}

export const yahooProvider: QuoteProvider = {
  providerName: "yahoo",
  fetchQuote,
};
