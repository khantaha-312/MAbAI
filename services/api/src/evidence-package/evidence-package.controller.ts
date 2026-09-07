import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { EvidencePackageService } from './evidence-package.service';

@Controller('evidence-package')
@UseGuards(ClerkAuthGuard)
export class EvidencePackageController {
  constructor(private readonly evidencePackageService: EvidencePackageService) {}

  @Get(':assetType/:symbol')
  async getEvidencePackage(
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
  ) {
    const result = await this.evidencePackageService.buildEvidencePackage(symbol, assetType);
    return { data: result };
  }
}