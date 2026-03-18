-- CreateTable
CREATE TABLE "DealSummary" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "lastActivityContext" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "riskSignals" JSONB NOT NULL,
    "activityCount" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "activityHash" TEXT NOT NULL,

    CONSTRAINT "DealSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealSummary_dealId_key" ON "DealSummary"("dealId");

-- AddForeignKey
ALTER TABLE "DealSummary" ADD CONSTRAINT "DealSummary_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
