import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportHistoryService } from './report-history.service';
import { GenerateReportDto } from './dto/generate-report.dto';


@UseGuards(ClerkAuthGuard)
@Controller('report-history')
export class ReportHistoryController {
  constructor(private readonly reportHistoryService: ReportHistoryService) {}

  @Post('generate')
  generate(@CurrentUser() user: User, @Body() dto: GenerateReportDto) {
    return this.reportHistoryService.generate(user.clerkId, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.reportHistoryService.listForUser(user.clerkId);
  }

  @Get(':id')
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.reportHistoryService.getOne(user.clerkId, id);
  }

  @Patch(':id')
  attachNarrative(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('narrative') narrative: string,
  ) {
    return this.reportHistoryService.attachNarrative(user.clerkId, id, narrative);
  }
}