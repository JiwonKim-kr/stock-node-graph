import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonSafe } from "@/lib/serialize";
import { isValidTicker, registerStock } from "@/lib/stockService";

export const dynamic = "force-dynamic";

/** 등록 종목 목록 + 각 종목의 최신 시세 스냅샷 */
export async function GET() {
  try {
    const stocks = await prisma.stock.findMany({
      orderBy: { createdAt: "asc" },
      include: { histories: { orderBy: { timestamp: "desc" }, take: 1 } },
    });
    const payload = stocks.map(({ histories, ...stock }) => ({
      ...stock,
      latest: histories[0] ?? null,
    }));
    return NextResponse.json(jsonSafe(payload));
  } catch (error) {
    console.error("[GET /api/stocks]", error);
    return NextResponse.json({ error: "종목 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

/** 6자리 코드 등록: 메타데이터 자동 식별 → upsert → 즉시 1회 수집 */
export async function POST(request: Request) {
  let ticker: unknown;
  try {
    ({ ticker } = await request.json());
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 본문입니다." }, { status: 400 });
  }

  if (typeof ticker !== "string" || !isValidTicker(ticker)) {
    return NextResponse.json(
      { error: "6자리 한국 주식 코드를 입력하세요. (예: 005930)" },
      { status: 400 },
    );
  }

  try {
    const stock = await registerStock(ticker);
    return NextResponse.json(jsonSafe(stock), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[POST /api/stocks] ${ticker}:`, message);
    // 메타데이터 식별 실패 = 존재하지 않거나 지원하지 않는 종목
    return NextResponse.json(
      { error: `종목 정보를 찾을 수 없습니다 (${ticker}). 코드를 확인하세요.` },
      { status: 404 },
    );
  }
}
