export type MarketType = "KOSPI" | "KOSDAQ";

/** 시세 스냅샷 — StockPriceHistory 한 레코드에 대응 */
export interface StockQuote {
  price: number; // 현재가 (KRW)
  changePercent: number; // 전일 대비 등락률 (%)
  volume: bigint; // 누적 거래량
}

/** 종목 메타데이터 — Stock 테이블에 대응 */
export interface StockMeta {
  ticker: string;
  name: string;
  sector: string;
  market: MarketType;
}

export interface QuoteProvider {
  /** 로그 식별용 공급자 이름 */
  readonly providerName: string;
  fetchQuote(ticker: string, market: MarketType): Promise<StockQuote>;
}
