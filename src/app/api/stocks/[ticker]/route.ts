import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 종목 삭제 — onDelete: Cascade로 가격 이력도 함께 제거된다. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  try {
    await prisma.stock.delete({ where: { ticker } });
    return NextResponse.json({ ok: true, ticker });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "등록되지 않은 종목입니다." }, { status: 404 });
    }
    console.error(`[DELETE /api/stocks/${ticker}]`, error);
    return NextResponse.json({ error: "종목 삭제에 실패했습니다." }, { status: 500 });
  }
}
