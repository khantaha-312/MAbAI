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
  const {
    tradingType,
    tradingStyle,
    assetClasses,
    investmentPlan,
    maxLeverageTolerance,
    typicalPositionSizePct,
  } = input;

  // Guard: treat any non-array value (undefined, null, or malformed input) as
  // "no signal available" rather than throwing — matches this function's
  // existing philosophy of degrading to insufficient_evidence rather than
  // crashing on missing data (see maxLeverageTolerance/typicalPositionSizePct
  // null-handling below, which already does this for the scalar fields).
  const safeTradingType = Array.isArray(tradingType) ? tradingType : [];
  const safeTradingStyle = Array.isArray(tradingStyle) ? tradingStyle : [];
  const safeAssetClasses = Array.isArray(assetClasses) ? assetClasses : [];
  const safeInvestmentPlan = Array.isArray(investmentPlan) ? investmentPlan : [];

  const signals: string[] = [];
  let advancedPoints = 0;
  let beginnerPoints = 0;
  let totalPoints = 0;

  // Signal 1: tradingType — advanced if FUTURES appears anywhere in the selection
  if (safeTradingType.length > 0) {
    totalPoints++;
    if (safeTradingType.includes('FUTURES')) {
      advancedPoints++;
      signals.push('trading_type_includes_futures');
    } else {
      beginnerPoints++;
      signals.push('trading_type_spot_only');
    }
  }

  // Signal 2: tradingStyle — advanced if SCALPING/INTRADAY appears anywhere
  if (safeTradingStyle.length > 0) {
    totalPoints++;
    const hasActiveStyle = safeTradingStyle.some((s) => s === 'SCALPING' || s === 'INTRADAY');
    const onlyLongTerm = safeTradingStyle.every((s) => s === 'SHORT_TERM_INVESTMENT' || s === 'LONG_TERM_INVESTMENT');
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

  // Signal 3: assetClasses breadth
  if (safeAssetClasses.length > 0) {
    totalPoints++;
    const hasAdvancedClass = safeAssetClasses.includes('CRYPTO') || safeAssetClasses.includes('COMMODITIES');
    if (safeAssetClasses.length >= 3 || (safeAssetClasses.length >= 2 && hasAdvancedClass)) {
      advancedPoints++;
      signals.push('asset_classes_broad');
    } else if (safeAssetClasses.length === 1 && safeAssetClasses[0] === 'STOCKS') {
      beginnerPoints++;
      signals.push('asset_classes_narrow_stocks_only');
    } else {
      signals.push('asset_classes_moderate_neutral');
    }
  }

  // Signal 4: investmentPlan — advanced if WEEKLY appears anywhere
  if (safeInvestmentPlan.length > 0) {
    totalPoints++;
    const onlyYearly = safeInvestmentPlan.every((p) => p === 'YEARLY');
    if (safeInvestmentPlan.includes('WEEKLY')) {
      advancedPoints++;
      signals.push('investment_plan_includes_weekly');
    } else if (onlyYearly) {
      beginnerPoints++;
      signals.push('investment_plan_yearly_only');
    } else {
      signals.push('investment_plan_moderate_neutral');
    }
  }

  // Signal 5 unchanged — already null-safe, not touched
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