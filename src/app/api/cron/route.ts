import { NextResponse } from "next/server";
import { collectAll } from "@/lib/stockService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GCP Cloud Scheduler가 매 시 정각 호출하는 무상태 배치 수집 엔드포인트.
 * Authorization: Bearer <CRON_SECRET> 불일치 시 401을 반환한다.
 */
async function handleCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const summary = await collectAll();
    if (summary.failed > 0) {
      console.error(
        `[cron] ${summary.failed}/${summary.total} failed:`,
        summary.results.filter((r) => !r.ok),
      );
    }
    return NextResponse.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      ...summary,
    });
  } catch (error) {
    console.error("[cron] batch collection crashed:", error);
    return NextResponse.json({ ok: false, error: "배치 수집에 실패했습니다." }, { status: 500 });
  }
}

// Cloud Scheduler HTTP 잡은 GET/POST 어느 쪽으로도 구성할 수 있어 둘 다 허용한다.
export { handleCron as GET, handleCron as POST };
