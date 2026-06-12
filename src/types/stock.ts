/** /api/stocks 응답 항목 — Stock + 최신 시세 스냅샷 */
export interface StockWithLatest {
  ticker: string;
  name: string;
  sector: string;
  market: string;
  createdAt: string;
  latest: {
    price: number;
    changePercent: number;
    volume: number;
    timestamp: string;
  } | null;
}

/** /api/stocks/[ticker]/history 응답 */
export interface StockHistoryResponse {
  stock: {
    ticker: string;
    name: string;
    sector: string;
    market: string;
  };
  histories: Array<{
    price: number;
    changePercent: number;
    volume: number;
    timestamp: string;
  }>;
}

export function formatKRW(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export function formatChangePercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
