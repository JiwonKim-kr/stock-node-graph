-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Stock" (
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("ticker")
);

-- CreateTable
CREATE TABLE "StockPriceHistory" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockPriceHistory_ticker_timestamp_idx" ON "StockPriceHistory"("ticker", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "StockPriceHistory" ADD CONSTRAINT "StockPriceHistory_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Stock"("ticker") ON DELETE CASCADE ON UPDATE CASCADE;

