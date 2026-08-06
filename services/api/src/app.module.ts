import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [ConfigModule, HealthModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
