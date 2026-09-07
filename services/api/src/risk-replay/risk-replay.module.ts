import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { RiskReplayController } from './risk-replay.controller';
import { RiskReplayService } from './risk-replay.service';

@Module({
  imports: [UserModule],
  controllers: [RiskReplayController],
  providers: [RiskReplayService],
})
export class RiskReplayModule {}