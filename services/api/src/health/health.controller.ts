import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '@prisma/client';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    let databaseStatus = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (error) {
      // Keep disconnected status on error
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
    };
  }

  @Get('health/protected')
  @UseGuards(ClerkAuthGuard)
  protectedHealth(@CurrentUser() user: User) {
    return {
      status: 'ok',
      message: 'You are authenticated',
      user: { id: user.id, email: user.email, orgId: user.orgId },
    };
  }
}