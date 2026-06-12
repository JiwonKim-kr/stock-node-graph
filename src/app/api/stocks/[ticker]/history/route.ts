import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const WINDOW_HOURS = 24;

/** 최근 24시간 가격 이력 (드로어 라인 차트용, 시간 오름차순) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  try {
    const stock = await prisma.stock.findUnique({ where: { ticker } });
    if (!stock) {
      return NextResponse.json({ error: "등록되지 않은 종목입니다." }, { status: 404 });
    }

    const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
    const histories = await prisma.stockPriceHistory.findMany({
      where: { ticker, timestamp: { gte: since } },
      orderBy: { timestamp: "asc" },
      select: { price: true, changePercent: true, volume: true, timestamp: true },
    });

    return NextResponse.json(jsonSafe({ stock, histories }));
  } catch (error) {
    console.error(`[GET /api/stocks/${ticker}/history]`, error);
    return NextResponse.json({ error: "가격 이력 조회에 실패했습니다." }, { status: 500 });
  }
}
