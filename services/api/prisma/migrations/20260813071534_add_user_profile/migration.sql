-- CreateEnum
CREATE TYPE "TradingType" AS ENUM ('SPOT', 'FUTURES');

-- CreateEnum
CREATE TYPE "TradingStyle" AS ENUM ('SCALPING', 'INTRADAY', 'SWING', 'SHORT_TERM_INVESTMENT', 'LONG_TERM_INVESTMENT');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('STOCKS', 'FOREX', 'COMMODITIES', 'CRYPTO');

-- CreateEnum
CREATE TYPE "InvestmentPlan" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradingType" "TradingType" NOT NULL,
    "tradingStyle" "TradingStyle" NOT NULL,
    "assetClasses" "AssetClass"[],
    "investmentPlan" "InvestmentPlan" NOT NULL,
    "selectedSymbols" TEXT[],
    "riskTolerance" TEXT,
    "experienceLevel" TEXT,
    "decisionFrequency" TEXT,
    "portfolioSizeRange" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
