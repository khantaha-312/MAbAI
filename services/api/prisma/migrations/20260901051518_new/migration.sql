/*
  Warnings:

  - You are about to drop the column `decisionFrequency` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `portfolioSizeRange` on the `UserProfile` table. All the data in the column will be lost.
  - Changed the type of `tradingType` on the `UserProfile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, unless the type change is compatible.
  - Changed the type of `tradingStyle` on the `UserProfile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, unless the type change is compatible.
  - Changed the type of `investmentPlan` on the `UserProfile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, unless the type change is compatible.

*/
-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "decisionFrequency",
DROP COLUMN "portfolioSizeRange",
ADD COLUMN     "onboardingDetails" JSONB,
ALTER COLUMN "tradingType" SET DATA TYPE "TradingType"[] USING ARRAY["tradingType"]::"TradingType"[],
ALTER COLUMN "tradingStyle" SET DATA TYPE "TradingStyle"[] USING ARRAY["tradingStyle"]::"TradingStyle"[],
ALTER COLUMN "investmentPlan" SET DATA TYPE "InvestmentPlan"[] USING ARRAY["investmentPlan"]::"InvestmentPlan"[];
