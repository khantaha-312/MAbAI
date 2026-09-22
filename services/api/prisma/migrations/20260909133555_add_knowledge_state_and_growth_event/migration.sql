-- CreateEnum
CREATE TYPE "KnowledgeStateType" AS ENUM ('KNOWLEDGE', 'PREFERENCE', 'GOAL', 'BEHAVIOR', 'OBSERVATION');

-- CreateEnum
CREATE TYPE "ProvenanceType" AS ENUM ('USER_STATED', 'LLM_INFERENCE', 'OBSERVED_BEHAVIOR', 'SYSTEM_DERIVED', 'OUTCOME_DERIVED');

-- CreateEnum
CREATE TYPE "GrowthEventType" AS ENUM ('KNOWLEDGE_GAIN', 'MISCONCEPTION_CORRECTED', 'REPEATED_MISTAKE', 'MISTAKE_REDUCED', 'BEHAVIORAL_IMPROVEMENT', 'BEHAVIORAL_REGRESSION', 'PREFERENCE_CHANGE', 'GOAL_CHANGE', 'STRATEGY_CHANGE', 'RISK_BEHAVIOR_CHANGE', 'ANALYTICAL_MATURITY_CHANGE');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "consolidatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserKnowledgeState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "belief" TEXT NOT NULL,
    "stateType" "KnowledgeStateType" NOT NULL,
    "sourceType" "ProvenanceType" NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 1,
    "lastObservedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "supersedesId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "evidenceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKnowledgeState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "eventType" "GrowthEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromStateId" TEXT,
    "toStateId" TEXT,
    "evidenceRefs" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserKnowledgeState_userId_topic_idx" ON "UserKnowledgeState"("userId", "topic");

-- CreateIndex
CREATE INDEX "UserKnowledgeState_userId_validFrom_idx" ON "UserKnowledgeState"("userId", "validFrom");

-- CreateIndex
CREATE INDEX "UserKnowledgeState_userId_validTo_idx" ON "UserKnowledgeState"("userId", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "UserKnowledgeState_userId_topic_fingerprint_key" ON "UserKnowledgeState"("userId", "topic", "fingerprint");

-- CreateIndex
CREATE INDEX "GrowthEvent_userId_occurredAt_idx" ON "GrowthEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_userId_topic_idx" ON "GrowthEvent"("userId", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthEvent_userId_topic_eventType_fingerprint_key" ON "GrowthEvent"("userId", "topic", "eventType", "fingerprint");

-- AddForeignKey
ALTER TABLE "UserKnowledgeState" ADD CONSTRAINT "UserKnowledgeState_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "UserKnowledgeState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKnowledgeState" ADD CONSTRAINT "UserKnowledgeState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_fromStateId_fkey" FOREIGN KEY ("fromStateId") REFERENCES "UserKnowledgeState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_toStateId_fkey" FOREIGN KEY ("toStateId") REFERENCES "UserKnowledgeState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
