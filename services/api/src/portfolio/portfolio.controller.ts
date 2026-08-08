import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
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

  @Get(':id/summary')
  async getSummary(@CurrentUser() user: User, @Param('id') id: string) {
    const portfolio = await this.portfolioService.getSummary(id, user.id);
    return { data: portfolio };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    const portfolio = await this.portfolioService.update(id, user.id, dto);
    return { data: portfolio };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    const portfolio = await this.portfolioService.softDelete(id, user.id);
    return { data: portfolio };
  }
}