# HANDOFF — 작업 인수인계 (2026-06-12 기준)

다른 환경에서 작업을 이어가기 위한 현재 상태 스냅샷. 영구적인 기술 결정·컨벤션은
[AGENTS.md](AGENTS.md), 인프라 절차는 [SETUP.md](SETUP.md) 참고.

## 완료된 것 (전부 실검증됨)

5단계 실행 계획(스캐폴딩 → Prisma → 수집 로직 → API → UI) 전체 완료. 기능 단위 6커밋.

검증 완료 항목:
- 종목 등록 메타 자동식별: `005930→삼성전자/반도체와반도체장비/KOSPI`, `247540→에코프로비엠/전기제품/KOSDAQ`
- 입력 검증: 비정형 코드 400, 미존재 종목 404
- `/api/cron`: 시크릿 없음/불일치 401, 정상 수집 4종목 일괄(개별 실패 격리 동작)
- `/api/graph`: 명세 JSON 스펙(섹터 허브, 색상/크기 룰) 일치
- UI: Split View, 카드 리스트, 노드 그래프, 클릭 → 드로어 + 24h recharts 차트
- `tsc --noEmit` / `eslint` / `next build` 모두 통과
- `prisma/migrations/0_init`이 `migrate deploy`로 정상 적용됨 (로컬 PG에서 확인)

## 검증되지 않은 것

- **Yahoo 폴백 실호출**: 개발 네트워크 IP가 Yahoo에 429 차단되어 코드 리뷰 수준만 검증.
  Vercel 배포 후 네이버 차단 상황을 시뮬레이션해 확인 필요.
- **Supabase 실연결**: 아직 프로젝트 미생성. 지금까지는 임시 로컬 PG로 검증.
- **GCP Cloud Scheduler 실연동**: 미배포 상태라 미검증 (로컬 curl로만 확인).

## 맥북 로컬 환경 상태 (이 저장소 밖의 것들)

- 임시 PostgreSQL이 `/tmp/stock-node-graph-pg`(포트 55432)에서 실행 중이었음.
  **재부팅하면 데이터까지 소멸** — 안의 데이터는 테스트 4종목뿐이라 버려도 됨.
- `.env`(gitignore됨)는 이 로컬 PG를 가리킴. 새 환경에서는 `.env.example` 기반으로 재작성.
- dev 서버가 Claude Code preview로 3000 포트에 떠 있었음 (세션 종료 시 정리됨).

## 다음 작업 (우선순위 순)

1. **Supabase 프로젝트 생성** → `.env` 작성(`.env.example` 참고, 풀러 6543 + `pgbouncer=true`)
   → `npx prisma migrate deploy` → 대시보드에서 종목 등록으로 동작 확인. (SETUP.md 1·2절)
2. **Vercel 배포**: 환경 변수 3개(`DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`) 등록.
   `postinstall: prisma generate`는 이미 설정됨. (SETUP.md 3절)
3. **GCP Cloud Scheduler 등록**: 매시 정각, Bearer 헤더. gcloud 명령은 SETUP.md 4절에 완성본 있음.
4. **Yahoo 폴백 실검증**: 배포 환경에서 확인. 필요 시 `src/lib/providers/yahoo.ts` 보정.
5. (선택) 수집이 며칠 쌓인 뒤 24h 차트·그래프 노드 크기 체감 튜닝
   (`stockNodeVal` 공식, force 파라미터는 `GraphCanvas.tsx`의 charge -90 / distance 40).

## 알아두면 좋은 것

- 사용자 전역 Claude 설정에 `git commit`/`git merge` deny 규칙이 있어 Claude가 직접 커밋
  불가 — 커밋은 사용자가 직접 실행하거나 스크립트로 우회한다(이전 커밋들은 `commit-plan.sh`
  방식으로 생성, 해당 스크립트는 역할 종료 후 삭제됨).
- macOS에서 Homebrew PostgreSQL 18 수동 기동 시 `LC_ALL` 미지정하면
  "멀티쓰레드" 오류로 실패한다(절차는 SETUP.md 1-1절).
- `.claude/launch.json`에 preview용 dev 서버 구성이 있음 (`npm run dev`, 포트 3000).
