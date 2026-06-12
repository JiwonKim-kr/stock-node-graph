"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ForceGraphMethods, NodeObject } from "react-force-graph-2d";
import type { GraphData, GraphNode } from "@/types/graph";

type GraphNodeObject = NodeObject & GraphNode;

interface ForceGraphProps {
  forwardedRef: (instance: ForceGraphMethods | null) => void;
  [key: string]: unknown;
}

// react-force-graph-2d는 캔버스(window) 의존이라 SSR을 끄고 로드해야 하며,
// next/dynamic은 ref를 전달하지 않으므로 forwardedRef prop으로 우회한다.
const ForceGraph2D = dynamic(
  async () => {
    const { default: FG } = await import("react-force-graph-2d");
    function ForceGraphWrapper({ forwardedRef, ...props }: ForceGraphProps) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <FG ref={forwardedRef as any} {...(props as any)} />;
    }
    return ForceGraphWrapper;
  },
  { ssr: false },
);

interface GraphCanvasProps {
  data: GraphData;
  onStockClick: (ticker: string) => void;
}

export function GraphCanvas({ data, onStockClick }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | null>(null);
  const didInitialZoom = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // 컨테이너 크기를 캔버스에 동기화 (창 리사이즈 대응)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 좌표(x/y) 보존 병합은 Dashboard.refresh()의 함수형 setState에서 수행되므로
  // 여기서는 전달받은 객체를 그대로 시뮬레이션에 넘긴다(force-graph가 직접 변이).

  // 은하계형 중력장: 허브(섹터) 주위로 종목이 결속되도록 힘을 조정한다.
  const handleRef = useCallback((instance: ForceGraphMethods | null) => {
    fgRef.current = instance;
    if (!instance) return;
    instance.d3Force("charge")?.strength(-90);
    const linkForce = instance.d3Force("link") as
      | { distance?: (d: number) => unknown }
      | undefined;
    linkForce?.distance?.(40);
  }, []);

  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const graphNode = node as GraphNodeObject;
      const fg = fgRef.current;
      if (fg && typeof node.x === "number" && typeof node.y === "number") {
        fg.centerAt(node.x, node.y, 600);
        fg.zoom(4, 600);
      }
      if (graphNode.type === "stock") onStockClick(graphNode.id);
    },
    [onStockClick],
  );

  const drawNode = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as GraphNodeObject;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = Math.sqrt(Math.max(graphNode.val, 1)) * 1.6;

      // Obsidian 풍 글로우
      ctx.save();
      ctx.shadowColor = graphNode.color;
      ctx.shadowBlur = graphNode.type === "sector" ? 6 : 12;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = graphNode.color;
      ctx.fill();
      ctx.restore();

      // 줌인할수록 또렷해지는 라벨
      const labelAlpha = Math.max(0, Math.min(1, (globalScale - 0.8) / 1.2));
      if (labelAlpha > 0.02) {
        const fontSize = Math.max(11 / globalScale, 1.8);
        ctx.font = `500 ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle =
          graphNode.type === "sector"
            ? `rgba(212, 215, 222, ${labelAlpha})`
            : `rgba(160, 165, 175, ${labelAlpha})`;
        ctx.fillText(graphNode.label, x, y + radius + 2 / globalScale);
      }
    },
    [],
  );

  const paintPointerArea = useCallback(
    (node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => {
      const graphNode = node as GraphNodeObject;
      const radius = Math.sqrt(Math.max(graphNode.val, 1)) * 1.6 + 4;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {size.width > 0 && (
        <ForceGraph2D
          forwardedRef={handleRef}
          width={size.width}
          height={size.height}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          nodeId="id"
          nodeVal="val"
          nodeLabel={(node: NodeObject) => {
            const n = node as GraphNodeObject;
            return n.type === "stock" && n.price != null
              ? `${n.label} · ${Math.round(n.price).toLocaleString("ko-KR")}원 (${(n.changePercent ?? 0) > 0 ? "+" : ""}${(n.changePercent ?? 0).toFixed(2)}%)`
              : n.label;
          }}
          nodeCanvasObject={drawNode}
          nodeCanvasObjectMode={() => "replace"}
          nodePointerAreaPaint={paintPointerArea}
          linkColor={() => "rgba(255,255,255,0.10)"}
          linkWidth={1}
          onNodeClick={handleNodeClick}
          d3VelocityDecay={0.25}
          cooldownTime={4000}
          onEngineStop={() => {
            if (!didInitialZoom.current && data.nodes.length > 0) {
              didInitialZoom.current = true;
              fgRef.current?.zoomToFit(600, 60);
            }
          }}
        />
      )}
      {data.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            좌측에서 종목을 추가하면 노드 그래프가 그려집니다
          </p>
        </div>
      )}
    </div>
  );
}
