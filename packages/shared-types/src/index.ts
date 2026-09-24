/**
 * Canonical shared types for MAbAI workspace
 * These types are shared between frontend (Next.js) and backend (NestJS)
 */

export interface NewsArticle {
  headline: string;
  source: string;
  timestamp: string;
  url: string;
  summary: string;
}
