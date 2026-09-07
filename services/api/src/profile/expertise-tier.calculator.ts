export interface ExpertiseTierInput {
  tradingType: Array<'SPOT' | 'FUTURES'>;
  tradingStyle: Array<'SCALPING' | 'INTRADAY' | 'SWING' | 'SHORT_TERM_INVESTMENT' | 'LONG_TERM_INVESTMENT'>;
  assetClasses: Array<'STOCKS' | 'FOREX' | 'COMMODITIES' | 'CRYPTO'>;
  investmentPlan: Array<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>;
  maxLeverageTolerance: number | null;
  typicalPositionSizePct: number | null;
}

export interface ExpertiseTierResult {
  tier: 'BEGINNER' | 'INTERMEDIATE' | 'PRO' | 'insufficient_evidence';
  confidence: number | null;
  signals: string[];
  evidenceCount: number;
  reason?: string;
}

const FULL_SIGNAL_SET = 5;

export function deriveExpertiseTier(
  input: ExpertiseTierInput,
  minEvidenceRequired = 2,
): ExpertiseTierResult {
  const { tradingType, tradingStyle, assetClasses, investmentPlan, maxLeverageTolerance, typicalPositionSizePct } = input;

  const signals: string[] = [];
  let advancedPoints = 0;
  let beginnerPoints = 0;
  let totalPoints = 0;

  // Signal 1: tradingType — advanced if FUTURES appears anywhere in the selection
  if (tradingType.length > 0) {
    totalPoints++;
    if (tradingType.includes('FUTURES')) {
      advancedPoints++;
      signals.push('trading_type_includes_futures');
    } else {
      beginnerPoints++;
      signals.push('trading_type_spot_only');
    }
  }

  // Signal 2: tradingStyle — advanced if SCALPING/INTRADAY appears anywhere
  if (tradingStyle.length > 0) {
    totalPoints++;
    const hasActiveStyle = tradingStyle.some((s) => s === 'SCALPING' || s === 'INTRADAY');
    const onlyLongTerm = tradingStyle.every((s) => s === 'SHORT_TERM_INVESTMENT' || s === 'LONG_TERM_INVESTMENT');
    if (hasActiveStyle) {
      advancedPoints++;
      signals.push('trading_style_includes_active');
    } else if (onlyLongTerm) {
      beginnerPoints++;
      signals.push('trading_style_long_term_only');
    } else {
      signals.push('trading_style_swing_or_mixed_neutral');
    }
  }

  // Signal 3: assetClasses breadth (unchanged — was already an array)
  if (assetClasses.length > 0) {
    totalPoints++;
    const hasAdvancedClass = assetClasses.includes('CRYPTO') || assetClasses.includes('COMMODITIES');
    if (assetClasses.length >= 3 || (assetClasses.length >= 2 && hasAdvancedClass)) {
      advancedPoints++;
      signals.push('asset_classes_broad');
    } else if (assetClasses.length === 1 && assetClasses[0] === 'STOCKS') {
      beginnerPoints++;
      signals.push('asset_classes_narrow_stocks_only');
    } else {
      signals.push('asset_classes_moderate_neutral');
    }
  }

  // Signal 4: investmentPlan — advanced if WEEKLY appears anywhere
  if (investmentPlan.length > 0) {
    totalPoints++;
    const onlyYearly = investmentPlan.every((p) => p === 'YEARLY');
    if (investmentPlan.includes('WEEKLY')) {
      advancedPoints++;
      signals.push('investment_plan_includes_weekly');
    } else if (onlyYearly) {
      beginnerPoints++;
      signals.push('investment_plan_yearly_only');
    } else {
      signals.push('investment_plan_moderate_neutral');
    }
  }

  // Signal 5: leverage/position-sizing tolerance
  if (maxLeverageTolerance !== null || typicalPositionSizePct !== null) {
    totalPoints++;
    const highLeverage = maxLeverageTolerance !== null && maxLeverageTolerance >= 3;
    const highPositionSize = typicalPositionSizePct !== null && typicalPositionSizePct >= 20;
    if (highLeverage || highPositionSize) {
      advancedPoints++;
      signals.push('high_leverage_or_position_size');
    } else {
      beginnerPoints++;
      signals.push('conservative_leverage_and_position_size');
    }
  }

  if (totalPoints < minEvidenceRequired) {
    return {
      tier: 'insufficient_evidence',
      confidence: null,
      signals,
      evidenceCount: totalPoints,
      reason: `Only ${totalPoints} signal(s) available, need at least ${minEvidenceRequired} for a tier read`,
    };
  }

  const advancedRatio = advancedPoints / totalPoints;
  let tier: ExpertiseTierResult['tier'];
  if (advancedRatio >= 0.65) tier = 'PRO';
  else if (advancedRatio <= 0.3) tier = 'BEGINNER';
  else tier = 'INTERMEDIATE';

  const agreementConfidence = Math.abs(advancedRatio - 0.5) * 2;
  const evidenceConfidence = Math.min(totalPoints / FULL_SIGNAL_SET, 1);
  const confidence = tier === 'INTERMEDIATE'
    ? evidenceConfidence * 0.75
    : agreementConfidence * evidenceConfidence;

  return { tier, confidence, signals, evidenceCount: totalPoints };
}