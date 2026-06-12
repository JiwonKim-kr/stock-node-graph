"use client";

import { Loader2Icon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StockCard } from "@/components/dashboard/StockCard";
import type { StockWithLatest } from "@/types/stock";

interface ControlPanelProps {
  stocks: StockWithLatest[];
  adding: boolean;
  onAdd: (ticker: string) => Promise<void>;
  onSelect: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}

export function ControlPanel({ stocks, adding, onAdd, onSelect, onRemove }: ControlPanelProps) {
  const [ticker, setTicker] = useState("");
  const valid = /^\d{6}$/.test(ticker);

  const submit = async () => {
    if (!valid || adding) return;
    await onAdd(ticker);
    setTicker("");
  };

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border p-4">
        <h1 className="text-base font-bold">KR Stock Galaxy</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          한국 주식 자동 수집 · 노드 그래프 대시보드
        </p>
        <div className="mt-4 flex gap-2">
          <Input
            value={ticker}
            inputMode="numeric"
            maxLength={6}
            placeholder="6자리 종목코드 (예: 005930)"
            onChange={(e) => setTicker(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button onClick={submit} disabled={!valid || adding} aria-label="종목 추가">
            {adding ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-xs font-medium text-muted-foreground">
          추적 중인 종목 {stocks.length > 0 && `(${stocks.length})`}
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
        <div className="flex flex-col gap-2">
          {stocks.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              아직 등록된 종목이 없습니다.
              <br />
              종목코드를 입력해 추가하세요.
            </p>
          ) : (
            stocks.map((stock) => (
              <StockCard key={stock.ticker} stock={stock} onSelect={onSelect} onRemove={onRemove} />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
