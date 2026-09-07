import { Module } from '@nestjs/common';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { TechnicalAnalysisController } from './technical-analysis.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [TechnicalAnalysisController],
  providers: [TechnicalAnalysisService],
  exports: [TechnicalAnalysisService],
})
export class TechnicalAnalysisModule {}