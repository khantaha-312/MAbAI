import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import type { User } from '@prisma/client';

@Controller('alert-rules')
@UseGuards(ClerkAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateAlertRuleDto) {
    const rule = await this.alertsService.create(user.id, dto);
    return { data: rule };
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    const rules = await this.alertsService.findAllForUser(user.id);
    return { data: rules };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    const rule = await this.alertsService.softDelete(id, user.id);
    return { data: rule };
  }

  @Post('evaluate')
  async evaluate(@CurrentUser() user: User) {
    const triggered = await this.alertsService.evaluateForUser(user.id);
    return { data: triggered };
  }
}