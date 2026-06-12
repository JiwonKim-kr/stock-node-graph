export type GraphNodeType = "stock" | "sector";

export interface GraphNode {
  id: string; // 종목: 6자리 티커 / 섹터: 섹터명
  label: string;
  val: number; // 노드 반경 가중치 (등락률 절대값에 선형 비례)
  color: string;
  type: GraphNodeType;
  // 종목 노드 전용 부가 정보 (드로어/툴팁용)
  name?: string;
  price?: number;
  changePercent?: number;
  sector?: string;
  market?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// 한국 시장 전용 색상 룰: 상승 빨강 / 하락 파랑 / 보합 회색
export const COLOR_UP = "#ef4444";
export const COLOR_DOWN = "#3b82f6";
export const COLOR_FLAT = "#6b7280";
export const COLOR_SECTOR = "#4b5563";

export function changeColor(changePercent: number): string {
  if (changePercent > 0) return COLOR_UP;
  if (changePercent < 0) return COLOR_DOWN;
  return COLOR_FLAT;
}
