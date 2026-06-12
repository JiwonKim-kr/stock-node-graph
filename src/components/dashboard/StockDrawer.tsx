"use client";

import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { COLOR_DOWN, COLOR_FLAT, COLOR_UP } from "@/types/graph";
import {
  formatChangePercent,
  formatKRW,
  type StockHistoryResponse,
} from "@/types/stock";

interface StockDrawerProps {
  ticker: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockDrawer({ ticker, open, onOpenChange }: StockDrawerProps) {
  const [fetched, setFetched] = useState<StockHistoryResponse | null>(null);
  const [failedTicker, setFailedTicker] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker || !open) return;
    let cancelled = false;
    fetch(`/api/stocks/${ticker}/history`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((json: StockHistoryResponse) => {
        if (!cancelled) {
          setFetched(json);
          setFailedTicker(null);
        }
      })
      .catch(() => {
        if (!cancelled) setFailedTicker(ticker);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, open]);

  // 로딩 여부는 setState 없이 "현재 티커의 응답이 도착했는가"로 파생한다.
  const data = fetched && fetched.stock.ticker === ticker ? fetched : null;
  const failed = failedTicker === ticker;
  const loading = !data && !failed;

  const latest = data?.histories.at(-1) ?? null;
  const change = latest?.changePercent ?? 0;
  const lineColor = change > 0 ? COLOR_UP : change < 0 ? COLOR_DOWN : COLOR_FLAT;

  const chartData =
    data?.histories.map((h) => ({
      time: new Date(h.timestamp).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      price: h.price,
    })) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] gap-0 sm:max-w-[400px]">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            {data?.stock.name ?? ticker ?? ""}
            {data && (
              <Badge variant="outline" className="text-[10px]">
                {data.stock.market}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {data ? `${data.stock.ticker} · ${data.stock.sector}` : "종목 상세"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {latest && (
            <div>
              <p className="text-2xl font-bold tabular-nums">{formatKRW(latest.price)}</p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-medium tabular-nums",
                  change > 0 ? "text-red-400" : change < 0 ? "text-blue-400" : "text-muted-foreground",
                )}
              >
                전일 대비 {formatChangePercent(change)}
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">최근 24시간 가격 추이</p>
            <div className="h-[220px] w-full rounded-lg border border-border bg-card p-2">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  불러오는 중…
                </div>
              ) : failed ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  이력을 불러오지 못했습니다.
                </div>
              ) : chartData.length < 2 ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
                  수집된 이력이 아직 부족합니다. 1시간 주기 수집이 쌓이면 추이가 표시됩니다.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={32}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                      formatter={(value) => [formatKRW(Number(value)), "가격"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={lineColor}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {latest && (
            <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>거래량</span>
                <span className="tabular-nums text-foreground">
                  {latest.volume.toLocaleString("ko-KR")}주
                </span>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span>마지막 수집</span>
                <span className="tabular-nums text-foreground">
                  {new Date(latest.timestamp).toLocaleString("ko-KR")}
                </span>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
