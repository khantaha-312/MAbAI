import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

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
  protectedHealth() {
    return { status: 'ok', message: 'You are authenticated' };
  }
}