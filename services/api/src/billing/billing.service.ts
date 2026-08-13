import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { Subscription } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a Subscription record only — does NOT charge any payment
   * method. Real payment processor integration (Stripe/Paddle/etc.) is
   * a deliberately deferred decision per the founder's own open-decisions
   * list, not an oversight. status is always 'active' here since there's
   * no real billing cycle yet to track.
   */
  async create(orgId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
    return this.prisma.subscription.create({
      data: {
        orgId,
        plan: dto.plan,
        status: 'active',
      },
    });
  }

  async findForOrg(orgId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }
}