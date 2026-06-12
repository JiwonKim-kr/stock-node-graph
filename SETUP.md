# SETUP — Supabase · 로컬 실행 · Vercel 배포 · GCP Cloud Scheduler

## 1. Supabase 프로젝트 생성 및 연결

1. <https://supabase.com/dashboard> → **New project** (리전: `ap-northeast-2` Seoul 권장, DB 비밀번호 기록).
2. **Project Settings → Database → Connection string**에서 두 가지 주소를 복사한다.
   - **Transaction pooler (포트 6543)** → `DATABASE_URL`
   - **Direct connection / Session (포트 5432)** → `DIRECT_URL`
3. 프로젝트 루트에 `.env`를 만들고 `.env.example`을 참고해 채운다.
   - `DATABASE_URL`에는 반드시 `?pgbouncer=true&connection_limit=1`을 붙인다 (서버리스 + PgBouncer 환경에서 prepared statement 오류 방지).
4. 스키마 적용 (이미 생성된 마이그레이션 SQL을 그대로 배포):

   ```bash
   npx prisma migrate deploy
   ```

## 1-1. (대안) Supabase 없이 로컬 PostgreSQL로 개발

이 저장소는 Homebrew `postgresql@18` 기반의 임시 로컬 DB로 E2E 검증되었다.
현재 `.env`가 이 로컬 인스턴스(포트 55432, 데이터 디렉토리 `/tmp/stock-node-graph-pg`)를
가리키고 있으며, 재부팅하면 사라지므로 개발용으로만 사용할 것.

```bash
# 시작 (재부팅 후에는 initdb부터 다시)
LC_ALL=en_US.UTF-8 /opt/homebrew/opt/postgresql@18/bin/pg_ctl \
  -D /tmp/stock-node-graph-pg -o "-p 55432 -k /tmp" -l /tmp/stock-node-graph-pg.log start

# 중지
/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D /tmp/stock-node-graph-pg stop
```

Supabase로 전환하려면 `.env`를 `.env.example` 형식으로 교체한 뒤
`npx prisma migrate deploy`만 다시 실행하면 된다.

## 2. 로컬 개발

```bash
npm install
npx prisma generate   # postinstall로도 실행됨
npm run dev           # http://localhost:3000
```

수동 수집 테스트:

```bash
# 종목 등록
curl -X POST http://localhost:3000/api/stocks -H 'Content-Type: application/json' -d '{"ticker":"005930"}'

# 배치 수집 (CRON_SECRET은 .env 값)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron

# 그래프 데이터 확인
curl http://localhost:3000/api/graph
```

## 3. Vercel 배포

1. GitHub 저장소 푸시 후 Vercel에서 Import.
2. **Environment Variables**에 `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET` 3개를 등록.
3. 빌드 명령은 기본값(`next build`) 그대로 사용 — `package.json`의 `postinstall: prisma generate`가 Vercel 빌드 캐시 환경에서 Prisma Client를 재생성한다.

## 4. GCP Cloud Scheduler (1시간 주기 크론)

배포된 도메인이 `https://<YOUR-APP>.vercel.app`이라고 할 때:

```bash
gcloud scheduler jobs create http stock-hourly-collect \
  --location=asia-northeast3 \
  --schedule="0 * * * *" \
  --time-zone="Asia/Seoul" \
  --uri="https://<YOUR-APP>.vercel.app/api/cron" \
  --http-method=GET \
  --headers="Authorization=Bearer <CRON_SECRET>" \
  --attempt-deadline=180s
```

- `--schedule="0 * * * *"` : 매 시 정각 실행.
- 헤더의 `<CRON_SECRET>`은 Vercel 환경 변수와 동일한 값이어야 하며, 불일치 시 API가 `401 Unauthorized`를 반환한다.
- 수동 실행 테스트: `gcloud scheduler jobs run stock-hourly-collect --location=asia-northeast3`

## 5. 데이터 소스 구성 (폴백 체인)

| 우선순위 | 소스 | 용도 | 비고 |
|---|---|---|---|
| 1 | 네이버 금융 모바일 API (`m.stock.naver.com`) | 시세 + 메타데이터(종목명/업종/시장) | 키 불필요 |
| 2 | Yahoo Finance (`query1.finance.yahoo.com`) | 시세 폴백 | KOSPI `.KS` / KOSDAQ `.KQ` 접미사 자동 처리 |

네이버 응답 실패 시 Yahoo로 무중단 전환되며, 특정 종목 실패는 전체 배치를 중단시키지 않고 로그로만 남는다.
