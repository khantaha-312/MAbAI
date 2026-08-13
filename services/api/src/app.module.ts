import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { PositionModule } from './position/position.module';
import { ClerkAuthModule } from './auth/clerk-auth.module';
import { UserModule } from './user/user.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { MarketDataModule } from './market-data/market-data.module';
import {PredictionLedgerModule} from "./prediction-ledger/prediction-ledger.module";
import { AiOrchestrationModule } from './ai-orchestration/ai-orchestration.module';
import { AlertsModule } from './alerts/alerts.module'; 
import { BillingModule } from './billing/billing.module';
import { PriceBarModule } from './price-bar/price-bar.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    HealthModule,
    ClerkAuthModule,
    UserModule,
    PortfolioModule,
    PositionModule,
    MarketDataModule,
    PredictionLedgerModule,
    AiOrchestrationModule,
    AlertsModule,
    BillingModule,
    PriceBarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}