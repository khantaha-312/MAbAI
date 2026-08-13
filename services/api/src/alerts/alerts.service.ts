import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';
import type { AlertRule, AlertDelivery } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async create(userId: string, dto: CreateAlertRuleDto): Promise<AlertRule> {
    return this.prisma.alertRule.create({
      data: {
        userId,
        config: {
          type: dto.type,
          instrumentSymbol: dto.instrumentSymbol,
          threshold: dto.config.threshold,
        },
        isActive: true,
      },
    });
  }

  async findAllForUser(userId: string): Promise<AlertRule[]> {
    return this.prisma.alertRule.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOwnedOrThrow(id: string, userId: string): Promise<AlertRule> {
    const rule = await this.prisma.alertRule.findUnique({ where: { id } });

    if (!rule || rule.deletedAt !== null || rule.userId !== userId) {
      throw new AppException(
        ErrorCode.ALERT_RULE_NOT_FOUND,
        'Alert rule not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return rule;
  }

  async softDelete(id: string, userId: string): Promise<AlertRule> {
    await this.findOwnedOrThrow(id, userId);

    return this.prisma.alertRule.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Manually-triggered evaluation (no cron/scheduler yet — that's a
   * follow-up task). Checks every active rule for this user against a
   * live price and creates a stub AlertDelivery (channel: 'in-app',
   * status: 'pending') for any that trigger. Real delivery (email/push/
   * SMS) is NOT implemented — that needs a third-party provider, out of
   * scope here.
   */
  async evaluateForUser(userId: string): Promise<AlertDelivery[]> {
    const rules = await this.prisma.alertRule.findMany({
      where: { userId, deletedAt: null, isActive: true },
    });

    const triggered: AlertDelivery[] = [];

    for (const rule of rules) {
      const config = rule.config as {
        type: string;
        instrumentSymbol: string;
        threshold: number;
      };

      let currentPrice: number | null = null;
      // Simplification: assumes equity via Finnhub. Crypto support would
      // need the same CoinGecko-ID mapping flagged elsewhere in this
      // project as a temporary shortcut pending real SymbolMapping use.
      currentPrice = await this.marketDataService.getEquityPriceUsd(
        config.instrumentSymbol,
      );

      if (currentPrice === null) {
        this.logger.warn(
          `Could not fetch price for ${config.instrumentSymbol}, skipping rule ${rule.id}`,
        );
        continue;
      }

      const shouldTrigger =
        (config.type === 'PRICE_ABOVE' && currentPrice > config.threshold) ||
        (config.type === 'PRICE_BELOW' && currentPrice < config.threshold);

      if (shouldTrigger) {
        const delivery = await this.prisma.alertDelivery.create({
          data: {
            alertRuleId: rule.id,
            channel: 'in-app',
            status: 'pending',
          },
        });
        triggered.push(delivery);
      }
    }

    return triggered;
  }
}