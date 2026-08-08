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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}