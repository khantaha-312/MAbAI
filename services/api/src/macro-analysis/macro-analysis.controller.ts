import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { MacroAnalysisService } from './macro-analysis.service';

@Controller('macro-analysis')
@UseGuards(ClerkAuthGuard)
export class MacroAnalysisController {
  constructor(private readonly macroAnalysisService: MacroAnalysisService) {}

  @Get('snapshot')
  async getSnapshot() {
    const result = await this.macroAnalysisService.getMacroSnapshot();
    return { data: result };
  }
}