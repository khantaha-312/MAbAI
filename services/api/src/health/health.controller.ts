import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
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
  protectedHealth(@Req() request: Request & { user: User }) {
    return {
      status: 'ok',
      message: 'You are authenticated',
      user: {
        id: request.user.id,
        email: request.user.email,
        orgId: request.user.orgId,
      },
    };
  }
}