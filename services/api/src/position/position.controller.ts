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
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import type { User } from '@prisma/client';

@Controller('portfolios/:portfolioId/positions')
@UseGuards(ClerkAuthGuard)
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreatePositionDto,
  ) {
    const position = await this.positionService.create(portfolioId, user.id, dto);
    return { data: position };
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Param('portfolioId') portfolioId: string,
  ) {
    const positions = await this.positionService.findAllForPortfolio(
      portfolioId,
      user.id,
    );
    return { data: positions };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('portfolioId') portfolioId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    const position = await this.positionService.update(
      id,
      portfolioId,
      user.id,
      dto,
    );
    return { data: position };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: User,
    @Param('portfolioId') portfolioId: string,
    @Param('id') id: string,
  ) {
    const position = await this.positionService.softDelete(
      id,
      portfolioId,
      user.id,
    );
    return { data: position };
  }
}