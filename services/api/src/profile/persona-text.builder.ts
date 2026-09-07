import { UserProfile } from '@prisma/client';

export function buildPersonaText(profile: Pick<UserProfile,
  'tradingType' | 'tradingStyle' | 'assetClasses' | 'investmentPlan' |
  'riskAppetite' | 'expertiseTier' | 'maxLeverageTolerance' | 'typicalPositionSizePct'
>): string {
  const parts: string[] = [];

  if (profile.tradingType?.length) {
    parts.push(`Trading type(s): ${profile.tradingType.join(', ')}.`);
  }

  if (profile.tradingStyle?.length) {
    parts.push(`Trading style(s): ${profile.tradingStyle.join(', ')}.`);
  }

  if (profile.assetClasses?.length) {
    parts.push(`Asset classes: ${profile.assetClasses.join(', ')}.`);
  }

  if (profile.investmentPlan?.length) {
    parts.push(`Investment plan cadence(s): ${profile.investmentPlan.join(', ')}.`);
  }

  if (profile.riskAppetite) {
    parts.push(`Risk appetite: ${profile.riskAppetite}.`);
  }

  if (profile.expertiseTier) {
    parts.push(`Expertise tier: ${profile.expertiseTier}.`);
  }

  if (profile.maxLeverageTolerance !== null && profile.maxLeverageTolerance !== undefined) {
    parts.push(`Max leverage tolerance: ${profile.maxLeverageTolerance}x.`);
  }

  if (profile.typicalPositionSizePct !== null && profile.typicalPositionSizePct !== undefined) {
    parts.push(`Typical position size: ${profile.typicalPositionSizePct}% of portfolio.`);
  }

  return parts.join(' ');
}