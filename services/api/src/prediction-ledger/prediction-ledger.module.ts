import { Module } from '@nestjs/common';
import { PredictionLedgerController } from './prediction-ledger.controller';
import { PredictionLedgerService } from './prediction-ledger.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [PredictionLedgerController],
  providers: [PredictionLedgerService],
  exports: [PredictionLedgerService],
})
export class PredictionLedgerModule {}