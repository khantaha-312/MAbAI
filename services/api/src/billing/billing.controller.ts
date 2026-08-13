import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { User } from '@prisma/client';

@Controller('billing/subscription')
@UseGuards(ClerkAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateSubscriptionDto) {
    const sub = await this.billingService.create(user.orgId, dto);
    return { data: sub };
  }

  @Get()
  async find(@CurrentUser() user: User) {
    const sub = await this.billingService.findForOrg(user.orgId);
    return { data: sub };
  }
}