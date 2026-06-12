import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  COLOR_SECTOR,
  changeColor,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from "@/types/graph";

export const dynamic = "force-dynamic";

// 크기 가중치: 등락률 절대값에 선형 비례 (기본 4, 1%당 +2, 상한 24)
function stockNodeVal(changePercent: number): number {
  return 4 + Math.min(Math.abs(changePercent) * 2, 20);
}

/**
 * 허브-스포크 그래프 데이터: 섹터 노드가 중앙 허브, 소속 종목이 링크로 결속된다.
 * 최신 스냅샷 기준으로 상승=빨강 / 하락=파랑 / 보합=회색 채색.
 */
export async function GET() {
  try {
    const [stocks, latestSnapshots] = await Promise.all([
      prisma.stock.findMany(),
      prisma.stockPriceHistory.findMany({
        orderBy: { timestamp: "desc" },
        distinct: ["ticker"],
        select: { ticker: true, price: true, changePercent: true },
      }),
    ]);

    const snapshotByTicker = new Map(latestSnapshots.map((s) => [s.ticker, s]));
    const sectorCounts = new Map<string, number>();
    for (const stock of stocks) {
      sectorCounts.set(stock.sector, (sectorCounts.get(stock.sector) ?? 0) + 1);
    }

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    for (const [sector, count] of sectorCounts) {
      nodes.push({
        id: sector,
        label: sector,
        val: 6 + count,
        color: COLOR_SECTOR,
        type: "sector",
      });
    }

    for (const stock of stocks) {
      const snapshot = snapshotByTicker.get(stock.ticker);
      const changePercent = snapshot?.changePercent ?? 0;
      nodes.push({
        id: stock.ticker,
        label: stock.name,
        val: stockNodeVal(changePercent),
        color: changeColor(changePercent),
        type: "stock",
        name: stock.name,
        price: snapshot?.price,
        changePercent,
        sector: stock.sector,
        market: stock.market,
      });
      links.push({ source: stock.ticker, target: stock.sector });
    }

    const payload: GraphData = { nodes, links };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/graph]", error);
    return NextResponse.json({ error: "그래프 데이터 조회에 실패했습니다." }, { status: 500 });
  }
}
