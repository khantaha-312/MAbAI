import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule], // required for ClerkAuthGuard's DI, same pattern as HealthModule
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}