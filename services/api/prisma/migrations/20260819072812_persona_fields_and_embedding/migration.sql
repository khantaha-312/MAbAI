-- Enable pgvector (idempotent — safe whether or not it's already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- New enums
CREATE TYPE "RiskAppetite" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ExpertiseTier" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'PRO');

-- Drop dead placeholder columns
ALTER TABLE "UserProfile" DROP COLUMN "riskTolerance";
ALTER TABLE "UserProfile" DROP COLUMN "experienceLevel";

-- Add new persona fields
ALTER TABLE "UserProfile" ADD COLUMN "riskAppetite" "RiskAppetite";
ALTER TABLE "UserProfile" ADD COLUMN "expertiseTier" "ExpertiseTier";
ALTER TABLE "UserProfile" ADD COLUMN "maxLeverageTolerance" DOUBLE PRECISION;
ALTER TABLE "UserProfile" ADD COLUMN "typicalPositionSizePct" DOUBLE PRECISION;
ALTER TABLE "UserProfile" ADD COLUMN "personaEmbedding" vector(768);