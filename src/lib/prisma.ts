import { PrismaClient } from "@prisma/client";

// 서버리스(Vercel) 환경에서 핫 리로드/함수 재사용 시 커넥션이 중복 생성되는 것을
// 막기 위한 globalThis 싱글톤 패턴. DATABASE_URL은 Supabase 트랜잭션 풀러(6543,
// pgbouncer=true), DIRECT_URL은 마이그레이션용 직접 연결(5432)을 사용한다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
