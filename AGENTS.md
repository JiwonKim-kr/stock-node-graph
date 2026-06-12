<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 프로젝트 컨텍스트 (코드만 봐서는 안 보이는 결정들)

현재 진행 상태와 다음 작업은 **HANDOFF.md**를 먼저 읽을 것.

## 기술 결정과 이유

- **Prisma 6.x 핀 (업그레이드 금지)**: Prisma 7은 `prisma-client-js` 제너레이터를 제거하고
  드라이버 어댑터(`@prisma/adapter-pg`)를 강제한다. 명세가 요구한 스키마를 유지하려고 6 LTS에 고정했다.
- **데이터 소스 체인**: 네이버 금융(주 소스) → Yahoo Finance(폴백). 토스증권은 공식 공개
  OpenAPI가 없어 사용자 결정으로 제외했다. 한국투자증권(KIS)도 범위 제외(키 미보유).
- **DB 스키마는 명세 고정**: `prisma/schema.prisma`의 모델 구조(BigInt volume 포함)는 발주
  명세 그대로다. 인덱스 추가 외 임의 변경 금지.

## 외부 API 동작 특성 (2026-06 실측)

- 네이버 시세: `polling.finance.naver.com/api/realtime/domestic/stock/{code}` —
  가격·등락률·누적거래량 일괄 제공. **브라우저 User-Agent 헤더 필수.**
- 네이버 메타: `basic`(종목명/시장) + `integration`→`industryCode`→
  `/api/stocks/industry/{code}`의 `groupInfo.name`(업종명) 경로.
- 네이버 수치는 **콤마 포함 문자열**("332,500"), 등락률은 부호 포함("-5.91").
  `basic` 응답에는 거래량이 없다(polling에만 있음).
- Yahoo: `query{1,2}.finance.yahoo.com/v8/finance/chart/{code}.KS|.KQ`. 개발자 자택망에서
  IP 단위 429가 걸려 있어 **실호출 미검증** — Vercel 등 다른 IP에서 검증 필요.

## 코드 컨벤션 제약

- ESLint가 react-hooks v6 엄격 룰(React Compiler 계열)을 쓴다: effect 본문에서 동기
  setState 금지, 렌더 중 ref 접근 금지. 그래프 좌표 보존 병합을 Dashboard의 함수형
  setState에서 하는 이유가 이것이다(GraphCanvas로 옮기지 말 것).
- `volume: BigInt`는 JSON 직렬화 불가 → API 응답은 반드시 `src/lib/serialize.ts`의
  `jsonSafe()`를 거칠 것.
- 색상 룰(상승 빨강/하락 파랑/보합 회색)과 노드 크기 공식은 `src/types/graph.ts`와
  `/api/graph`에 있다. UI·API 양쪽에서 이 상수만 참조할 것.
- shadcn CLI는 v4(`init -b radix`, preset 선택형)로 초기화됨. 컴포넌트 추가는
  `npx shadcn@latest add <name>`.
