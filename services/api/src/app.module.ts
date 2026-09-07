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
import { TechnicalAnalysisModule } from './technical-analysis/technical-analysis.module'; 
import { ProfileModule } from './profile/profile.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { EvidencePackageModule } from './evidence-package/evidence-package.module';
import { FundamentalAnalysisModule } from './fundamental-analysis/fundamental-analysis.module';
import { MacroAnalysisModule } from './macro-analysis/macro-analysis.module';
import { NewsSentimentModule } from './news-sentiment/news-sentiment.module';
import { RiskReplayModule } from './risk-replay/risk-replay.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ChatModule } from './chat/chat.module';
import { ReportHistoryModule } from './report-history/report-history.module';


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
    TechnicalAnalysisModule,
    ProfileModule,
    WatchlistModule,
    EvidencePackageModule,
    FundamentalAnalysisModule,
    MacroAnalysisModule,
    NewsSentimentModule,
    RiskReplayModule,
    InstrumentsModule,
    ChatModule,
    ReportHistoryModule,
    ScheduleModule.forRoot(),
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}