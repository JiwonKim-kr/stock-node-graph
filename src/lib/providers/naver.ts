import type { MarketType, QuoteProvider, StockMeta, StockQuote } from "./types";

// 네이버 금융 모바일 API는 브라우저 User-Agent가 없으면 요청을 차단한다.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
} as const;

const FETCH_TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Naver API ${res.status} ${res.statusText}: ${url}`);
  }
  return (await res.json()) as T;
}

/** "332,500" → 332500. 네이버 수치 응답은 콤마 포함 문자열이다. */
function parseKrNumber(raw: string | undefined, field: string): number {
  if (!raw || raw === "-" || raw === "N/A") {
    throw new Error(`Naver field "${field}" is empty: ${raw}`);
  }
  const n = Number(raw.replaceAll(",", ""));
  if (!Number.isFinite(n)) {
    throw new Error(`Naver field "${field}" is not numeric: ${raw}`);
  }
  return n;
}

interface NaverRealtimeData {
  itemCode: string;
  stockName: string;
  closePrice: string;
  fluctuationsRatio: string; // 부호 포함 ("-5.91")
  accumulatedTradingVolume: string;
  stockExchangeType?: { name?: string };
}

interface NaverBasic {
  stockEndType: string;
  itemCode: string;
  stockName: string;
  stockExchangeType?: { name?: string };
}

interface NaverIntegration {
  industryCode?: string;
}

interface NaverIndustryGroup {
  groupInfo?: { name?: string };
}

/** 실시간 시세: 가격·등락률·누적거래량을 한 번에 제공한다. */
async function fetchQuote(ticker: string): Promise<StockQuote> {
  const data = await fetchJson<{ datas?: NaverRealtimeData[] }>(
    `https://polling.finance.naver.com/api/realtime/domestic/stock/${ticker}`,
  );
  const item = data.datas?.[0];
  if (!item || item.itemCode !== ticker) {
    throw new Error(`Naver realtime: no data for ${ticker}`);
  }
  return {
    price: parseKrNumber(item.closePrice, "closePrice"),
    changePercent: parseKrNumber(item.fluctuationsRatio, "fluctuationsRatio"),
    volume: BigInt(
      Math.max(0, parseKrNumber(item.accumulatedTradingVolume, "accumulatedTradingVolume")),
    ),
  };
}

/**
 * 종목 메타데이터: basic에서 종목명/시장, integration → industry 경로로 업종명을
 * 식별한다. 업종 식별 실패는 등록을 막지 않고 "기타"로 폴백한다.
 */
async function fetchMeta(ticker: string): Promise<StockMeta> {
  const basic = await fetchJson<NaverBasic>(
    `https://m.stock.naver.com/api/stock/${ticker}/basic`,
  );
  if (!basic.itemCode || basic.itemCode !== ticker || !basic.stockName) {
    throw new Error(`Naver basic: invalid response for ${ticker}`);
  }
  const marketName = basic.stockExchangeType?.name;
  if (marketName !== "KOSPI" && marketName !== "KOSDAQ") {
    throw new Error(
      `Unsupported market "${marketName}" for ${ticker} (KOSPI/KOSDAQ only)`,
    );
  }

  let sector = "기타";
  try {
    const integration = await fetchJson<NaverIntegration>(
      `https://m.stock.naver.com/api/stock/${ticker}/integration`,
    );
    if (integration.industryCode) {
      const industry = await fetchJson<NaverIndustryGroup>(
        `https://m.stock.naver.com/api/stocks/industry/${integration.industryCode}?page=1&pageSize=1`,
      );
      if (industry.groupInfo?.name) sector = industry.groupInfo.name;
    }
  } catch (error) {
    console.error(`[naver] sector lookup failed for ${ticker}:`, error);
  }

  return {
    ticker,
    name: basic.stockName,
    sector,
    market: marketName as MarketType,
  };
}

export const naverProvider: QuoteProvider & {
  fetchMeta: (ticker: string) => Promise<StockMeta>;
} = {
  providerName: "naver",
  fetchQuote: (ticker: string) => fetchQuote(ticker),
  fetchMeta,
};
