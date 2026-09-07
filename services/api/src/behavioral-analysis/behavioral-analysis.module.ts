import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { BehavioralAnalysisController } from './behavioral-analysis.controller';
import { BehavioralAnalysisService } from './behavioral-analysis.service';

@Module({
  imports: [UserModule],
  controllers: [BehavioralAnalysisController],
  providers: [BehavioralAnalysisService],
  exports: [BehavioralAnalysisService],
})
export class BehavioralAnalysisModule {}