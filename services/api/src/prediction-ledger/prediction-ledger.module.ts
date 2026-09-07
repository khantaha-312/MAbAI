import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PredictionLedgerController } from './prediction-ledger.controller';
import { PredictionLedgerService } from './prediction-ledger.service';
import { PredictionLedgerResolutionJob } from './prediction-ledger-resolution.job';
import { MarketDataModule } from '../market-data/market-data.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PrismaModule,
    MarketDataModule,
    // UserModule provides UserService, which ClerkAuthGuard depends on —
    // confirmed via PortfolioModule, which imports it for the same reason
    // (PortfolioController also uses ClerkAuthGuard). PrismaModule is kept
    // here even though PortfolioModule doesn't import it explicitly — if
    // PrismaModule is actually @Global() in this app, this import is inert
    // but harmless; if it's not global, this module needs it directly for
    // PredictionLedgerService's own PrismaService injection.
    UserModule,
    // ScheduleModule.forRoot() must only be called once for the whole app.
    // If it's already registered in AppModule (likely, given this is a
    // multi-module Nest app), remove this line and just keep @Cron working
    // via the single root registration — duplicate forRoot() calls are
    // harmless but redundant, not broken, so leaving it here is safe either way.
    ScheduleModule.forRoot(),
  ],
  controllers: [PredictionLedgerController],
  providers: [PredictionLedgerService, PredictionLedgerResolutionJob],
  exports: [PredictionLedgerService],
})
export class PredictionLedgerModule {}