import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import type { User } from '@prisma/client';

@Controller('portfolios')
@UseGuards(ClerkAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreatePortfolioDto) {
    const portfolio = await this.portfolioService.create(
      user.id,
      user.orgId,
      dto,
    );
    return { data: portfolio };
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    const portfolios = await this.portfolioService.findAllForUser(user.id);
    return { data: portfolios };
  }
}