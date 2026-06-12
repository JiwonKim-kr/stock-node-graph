import { prisma } from "@/lib/prisma";
import { naverProvider } from "@/lib/providers/naver";
import { yahooProvider } from "@/lib/providers/yahoo";
import type { MarketType, QuoteProvider, StockMeta, StockQuote } from "@/lib/providers/types";

// 폴백 체인: 네이버(주 소스) 실패 시 Yahoo Finance로 무중단 전환.
const PROVIDER_CHAIN: QuoteProvider[] = [naverProvider, yahooProvider];

const TICKER_PATTERN = /^\d{6}$/;

export function isValidTicker(ticker: string): boolean {
  return TICKER_PATTERN.test(ticker);
}

/** 공급자 체인을 순서대로 시도하고, 전부 실패하면 누적 사유와 함께 throw한다. */
export async function fetchQuoteWithFallback(
  ticker: string,
  market: MarketType,
): Promise<StockQuote> {
  const failures: string[] = [];
  for (const provider of PROVIDER_CHAIN) {
    try {
      return await provider.fetchQuote(ticker, market);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${provider.providerName}: ${message}`);
      console.error(`[${provider.providerName}] quote failed for ${ticker}: ${message}`);
    }
  }
  throw new Error(`All providers failed for ${ticker} — ${failures.join(" / ")}`);
}

/** 6자리 코드로 종목명/업종/시장을 자동 식별한다. */
export async function resolveMeta(ticker: string): Promise<StockMeta> {
  return naverProvider.fetchMeta(ticker);
}

/**
 * 종목 등록: 메타데이터 식별 → Stock upsert(중복 없이 적재) → 즉시 1회 시세 수집.
 * 최초 시세 수집 실패는 등록 자체를 실패시키지 않는다(다음 크론에서 수집).
 */
export async function registerStock(ticker: string) {
  const meta = await resolveMeta(ticker);
  const stock = await prisma.stock.upsert({
    where: { ticker },
    update: { name: meta.name, sector: meta.sector, market: meta.market },
    create: { ticker, name: meta.name, sector: meta.sector, market: meta.market },
  });

  try {
    const quote = await fetchQuoteWithFallback(ticker, meta.market);
    await prisma.stockPriceHistory.create({
      data: { ticker, price: quote.price, changePercent: quote.changePercent, volume: quote.volume },
    });
  } catch (error) {
    console.error(`[register] initial quote failed for ${ticker}:`, error);
  }

  return stock;
}

export interface CollectResult {
  ticker: string;
  ok: boolean;
  price?: number;
  changePercent?: number;
  error?: string;
}

const COLLECT_CONCURRENCY = 5;

/**
 * 배치 수집: 등록된 모든 종목을 순회하며 시세를 수집한다.
 * 개별 종목 실패는 try-catch로 격리되어 전체 배치를 중단시키지 않는다.
 */
export async function collectAll(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: CollectResult[];
}> {
  const stocks = await prisma.stock.findMany({ select: { ticker: true, market: true } });
  const results: CollectResult[] = [];

  for (let i = 0; i < stocks.length; i += COLLECT_CONCURRENCY) {
    const chunk = stocks.slice(i, i + COLLECT_CONCURRENCY);
    const settled = await Promise.all(
      chunk.map(async ({ ticker, market }): Promise<CollectResult> => {
        try {
          const quote = await fetchQuoteWithFallback(ticker, market as MarketType);
          await prisma.stockPriceHistory.create({
            data: {
              ticker,
              price: quote.price,
              changePercent: quote.changePercent,
              volume: quote.volume,
            },
          });
          return { ticker, ok: true, price: quote.price, changePercent: quote.changePercent };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[cron] collect failed for ${ticker}: ${message}`);
          return { ticker, ok: false, error: message };
        }
      }),
    );
    results.push(...settled);
  }

  const succeeded = results.filter((r) => r.ok).length;
  return { total: results.length, succeeded, failed: results.length - succeeded, results };
}
