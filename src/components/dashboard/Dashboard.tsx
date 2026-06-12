"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { GraphCanvas } from "@/components/dashboard/GraphCanvas";
import { StockDrawer } from "@/components/dashboard/StockDrawer";
import type { GraphData } from "@/types/graph";
import type { StockWithLatest } from "@/types/stock";

const POLL_INTERVAL_MS = 60_000;

export function Dashboard() {
  const [stocks, setStocks] = useState<StockWithLatest[]>([]);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  const [adding, setAdding] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const failureNotified = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [stocksRes, graphRes] = await Promise.all([
        fetch("/api/stocks"),
        fetch("/api/graph"),
      ]);
      if (!stocksRes.ok || !graphRes.ok) throw new Error("API 응답 오류");
      const stocksJson: StockWithLatest[] = await stocksRes.json();
      const graphJson: GraphData = await graphRes.json();
      setStocks(stocksJson);
      // force-graph가 노드 객체에 기록한 시뮬레이션 좌표(x/y)를 보존하도록
      // 이전 노드 객체에 새 값을 병합해 폴링마다 그래프가 흩어지지 않게 한다.
      setGraph((prev) => {
        const prevNodes = new Map(prev.nodes.map((n) => [n.id, n]));
        return {
          nodes: graphJson.nodes.map(
            (n) => Object.assign(prevNodes.get(n.id) ?? {}, n) as GraphData["nodes"][number],
          ),
          links: graphJson.links.map((l) => ({ ...l })),
        };
      });
      failureNotified.current = false;
    } catch (error) {
      console.error("refresh failed:", error);
      if (!failureNotified.current) {
        failureNotified.current = true;
        toast.error("데이터를 불러오지 못했습니다. DB 연결을 확인하세요.");
      }
    }
  }, []);

  useEffect(() => {
    // 최초 호출도 비동기로 미뤄 effect 본문에서의 동기 setState를 피한다.
    const initial = setTimeout(refresh, 0);
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [refresh]);

  const handleAdd = useCallback(
    async (ticker: string) => {
      setAdding(true);
      try {
        const res = await fetch("/api/stocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "등록에 실패했습니다.");
        toast.success(`${body.name} (${body.ticker}) 등록 완료`);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "등록에 실패했습니다.");
      } finally {
        setAdding(false);
      }
    },
    [refresh],
  );

  const handleRemove = useCallback(
    async (ticker: string) => {
      try {
        const res = await fetch(`/api/stocks/${ticker}`, { method: "DELETE" });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "삭제에 실패했습니다.");
        }
        toast.success(`${ticker} 삭제 완료`);
        if (selectedTicker === ticker) setDrawerOpen(false);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
      }
    },
    [refresh, selectedTicker],
  );

  const handleSelect = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
    setDrawerOpen(true);
  }, []);

  return (
    <main className="flex h-dvh w-full overflow-hidden">
      <ControlPanel
        stocks={stocks}
        adding={adding}
        onAdd={handleAdd}
        onSelect={handleSelect}
        onRemove={handleRemove}
      />
      <section className="relative min-w-0 flex-1 bg-background">
        <GraphCanvas data={graph} onStockClick={handleSelect} />
      </section>
      <StockDrawer ticker={selectedTicker} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </main>
  );
}
