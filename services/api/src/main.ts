import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { AppLogger } from './logger/logger.service';
import { AppExceptionFilter } from './shared/filters/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(AppLogger));

  // CORS: frontend runs on a different port (3000) than the API (3001),
  // so the browser needs explicit permission. Matches the same origins
  // already trusted by ClerkAuthGuard's authorizedParties list.
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true, // harmless to leave true even though we're using Bearer tokens, not cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AppExceptionFilter());

  const configService = app.get(ConfigService);
  await app.listen(configService.port);
}
bootstrap();