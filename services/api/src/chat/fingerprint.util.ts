import { createHash } from 'crypto';

/**
 * Collapses cosmetic whitespace drift (leading/trailing spaces, doubled
 * internal spaces) before a topic is hashed or stored. Deliberately does
 * NOT lowercase or otherwise change case — that would be a bigger
 * behavioral change (case-insensitive matching) than "fix accidental
 * whitespace variance," and isn't needed to close the specific drift
 * observed in testing. Semantic drift (different wording for the same
 * belief) is handled by the changeType contract in
 * knowledge-consolidation.job.ts, not by this function — this is
 * deliberately narrow in scope.
 */
export function normalizeTopic(topic: string): string {
  return topic.trim().replace(/\s+/g, ' ');
}

/**
 * Same normalization applied to belief text, used only for the backend's
 * own "is this claimed CHANGED actually just a reworded REAFFIRMED"
 * safety-net comparison in knowledge-consolidation.job.ts. Not used for
 * fingerprinting or storage — deliberately not a substitute for
 * deterministic identity, just a cheap sanity check on top of it.
 */
export function normalizeBeliefText(belief: string): string {
  return belief.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Deterministic SHA-256 fingerprint for a UserKnowledgeState candidate.
 * Matches the @@unique([userId, topic, fingerprint]) constraint on
 * UserKnowledgeState — a repeat of the same belief for the same topic
 * produces the same fingerprint, so KnowledgeConsolidationJob can detect
 * "this is a repeat observation" vs. "this is genuinely new/changed"
 * without any additional bookkeeping.
 *
 * Callers should pass an already-normalized topic (via normalizeTopic)
 * so cosmetic whitespace drift doesn't fragment identity.
 */
export function fingerprintKnowledgeState(params: {
  userId: string;
  topic: string;
  stateType: string;
  belief: string;
}): string {
  const { userId, topic, stateType, belief } = params;
  return createHash('sha256')
    .update(`${userId}|${topic}|${stateType}|${belief}`)
    .digest('hex');
}

/**
 * Deterministic SHA-256 fingerprint for a GrowthEvent candidate.
 * Matches @@unique([userId, topic, eventType, fingerprint]) on GrowthEvent.
 * occurredAt is included so that the same eventType+description at a
 * different point in time is treated as a distinct event, not a dupe.
 */
export function fingerprintGrowthEvent(params: {
  userId: string;
  topic: string;
  eventType: string;
  description: string;
  occurredAt: Date;
}): string {
  const { userId, topic, eventType, description, occurredAt } = params;
  return createHash('sha256')
    .update(`${userId}|${topic}|${eventType}|${description}|${occurredAt.toISOString()}`)
    .digest('hex');
} 