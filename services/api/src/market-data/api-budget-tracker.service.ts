import { Injectable, Logger } from '@nestjs/common';

interface ProviderBudget {
  dailyLimit: number;
  currentCount: number;
  lastResetDate: string; // YYYY-MM-DD format
  lastCachedValues: Map<string, any>; // Provider-specific cached fallback values
}

@Injectable()
export class ApiBudgetTrackerService {
  private readonly logger = new Logger(ApiBudgetTrackerService.name);
  private budgets = new Map<string, ProviderBudget>();

  constructor() {
    // Initialize Alpha Vantage budget
    this.budgets.set('ALPHA_VANTAGE', {
      dailyLimit: 25,
      currentCount: 0,
      lastResetDate: this.getCurrentDate(),
      lastCachedValues: new Map(),
    });
  }

  /**
   * Check if a provider has budget remaining for a call.
   * Returns { allowed: boolean, remaining: number, usagePercent: number }
   */
  checkBudget(provider: string): { allowed: boolean; remaining: number; usagePercent: number } {
    this.resetIfNecessary(provider);
    const budget = this.budgets.get(provider);

    if (!budget) {
      this.logger.warn(`No budget configured for provider: ${provider}`);
      return { allowed: true, remaining: Infinity, usagePercent: 0 };
    }

    const remaining = budget.dailyLimit - budget.currentCount;
    const usagePercent = (budget.currentCount / budget.dailyLimit) * 100;

    // Log warnings at thresholds
    if (usagePercent >= 100) {
      this.logger.error(
        `${provider} budget exhausted: ${budget.currentCount}/${budget.dailyLimit} calls used today`,
      );
    } else if (usagePercent >= 90) {
      this.logger.warn(
        `${provider} budget at ${usagePercent.toFixed(0)}%: ${budget.currentCount}/${budget.dailyLimit} calls used today`,
      );
    } else if (usagePercent >= 80) {
      this.logger.log(
        `${provider} budget at ${usagePercent.toFixed(0)}%: ${budget.currentCount}/${budget.dailyLimit} calls used today`,
      );
    }

    return { allowed: remaining > 0, remaining, usagePercent };
  }

  /**
   * Record a successful API call against the budget.
   */
  recordCall(provider: string): void {
    this.resetIfNecessary(provider);
    const budget = this.budgets.get(provider);

    if (budget) {
      budget.currentCount++;
      this.logger.debug(`${provider} call recorded: ${budget.currentCount}/${budget.dailyLimit}`);
    }
  }

  /**
   * Store a cached fallback value for when budget is exhausted.
   */
  setCachedValue(provider: string, key: string, value: any): void {
    const budget = this.budgets.get(provider);
    if (budget) {
      budget.lastCachedValues.set(key, value);
      this.logger.debug(`${provider} cached value stored for key: ${key}`);
    }
  }

  /**
   * Retrieve a cached fallback value.
   */
  getCachedValue(provider: string, key: string): any | null {
    const budget = this.budgets.get(provider);
    if (budget) {
      return budget.lastCachedValues.get(key) ?? null;
    }
    return null;
  }

  /**
   * Reset the budget counter if a new day has started (midnight UTC).
   */
  private resetIfNecessary(provider: string): void {
    const budget = this.budgets.get(provider);
    if (!budget) return;

    const currentDate = this.getCurrentDate();
    if (budget.lastResetDate !== currentDate) {
      this.logger.log(
        `Resetting ${provider} budget: ${budget.currentCount} calls from ${budget.lastResetDate} to 0 for ${currentDate}`,
      );
      budget.currentCount = 0;
      budget.lastResetDate = currentDate;
      budget.lastCachedValues.clear(); // Clear cache on daily reset
    }
  }

  /**
   * Get current date in YYYY-MM-DD format (UTC).
   */
  private getCurrentDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // UTC date
  }

  /**
   * Get budget statistics for debugging.
   */
  getStats(): Record<string, { limit: number; used: number; remaining: number; usagePercent: number }> {
    const stats: Record<string, any> = {};

    for (const [provider, budget] of this.budgets.entries()) {
      this.resetIfNecessary(provider);
      const remaining = budget.dailyLimit - budget.currentCount;
      const usagePercent = (budget.currentCount / budget.dailyLimit) * 100;

      stats[provider] = {
        limit: budget.dailyLimit,
        used: budget.currentCount,
        remaining,
        usagePercent,
      };
    }

    return stats;
  }
}
