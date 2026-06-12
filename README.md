# KR Stock Galaxy — 한국 주식 노드 그래프 대시보드

한국 주식 시세를 1시간 주기로 자동 수집하고, Obsidian 스타일의 인터랙티브
노드 그래프로 시각화하는 Next.js 대시보드.

![stack](https://img.shields.io/badge/Next.js-16-black) ![prisma](https://img.shields.io/badge/Prisma-6-2D3748) ![db](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E)

## 아키텍처

- **수집**: GCP Cloud Scheduler → `GET /api/cron` (`Authorization: Bearer CRON_SECRET`) → 등록 종목 일괄 수집 → `StockPriceHistory` 적재
- **데이터 소스**: 네이버 금융 모바일 API(주 소스: 시세 + 종목명/업종/시장 메타데이터) → 실패 시 Yahoo Finance(`.KS`/`.KQ`)로 무중단 폴백
- **시각화**: `react-force-graph-2d` 허브-스포크 그래프 — 섹터 노드가 허브, 종목 노드는 등락률에 비례한 크기로 상승 빨강(`#ef4444`) / 하락 파랑(`#3b82f6`) / 보합 회색 채색
- **상세**: 노드/카드 클릭 시 우측 드로어에서 최근 24시간 가격 추이(`recharts`) 표시

## 빠른 시작

```bash
npm install
cp .env.example .env   # Supabase 연결 문자열 + CRON_SECRET 기입
npx prisma migrate deploy
npm run dev
```

종목 추가는 대시보드 좌측 패널에서 6자리 코드(예: `005930`)를 입력하거나:

```bash
curl -X POST localhost:3000/api/stocks -H 'Content-Type: application/json' -d '{"ticker":"005930"}'
```

Supabase 생성, Vercel 배포, GCP Cloud Scheduler 등록 절차는 [SETUP.md](SETUP.md) 참고.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET/POST` | `/api/stocks` | 종목 목록(최신가 포함) / 6자리 코드 등록(메타 자동 식별) |
| `DELETE` | `/api/stocks/[ticker]` | 종목 삭제 (이력 Cascade) |
| `GET` | `/api/stocks/[ticker]/history` | 최근 24시간 가격 이력 |
| `GET\|POST` | `/api/cron` | 배치 수집 (Bearer 시크릿 필수, 종목별 실패 격리) |
| `GET` | `/api/graph` | 노드/링크 그래프 JSON |
