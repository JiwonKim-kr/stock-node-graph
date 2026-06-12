"use client";

import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatChangePercent, formatKRW, type StockWithLatest } from "@/types/stock";

interface StockCardProps {
  stock: StockWithLatest;
  onSelect: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}

export function StockCard({ stock, onSelect, onRemove }: StockCardProps) {
  const change = stock.latest?.changePercent ?? null;
  const badgeClass =
    change == null || change === 0
      ? "bg-muted text-muted-foreground"
      : change > 0
        ? "bg-red-500/15 text-red-400"
        : "bg-blue-500/15 text-blue-400";

  return (
    // 삭제 버튼을 품어야 하므로 button 중첩(invalid HTML)을 피해 div[role=button]을 쓴다.
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(stock.ticker)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(stock.ticker);
        }
      }}
      className="group w-full cursor-pointer rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{stock.name}</p>
          <p className="text-xs text-muted-foreground">
            {stock.ticker} · {stock.market} · {stock.sector}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`${stock.name} 삭제`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(stock.ticker);
          }}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-medium tabular-nums">
          {stock.latest ? formatKRW(stock.latest.price) : "수집 대기"}
        </span>
        {change != null && (
          <Badge className={cn("tabular-nums", badgeClass)}>{formatChangePercent(change)}</Badge>
        )}
      </div>
    </div>
  );
}
