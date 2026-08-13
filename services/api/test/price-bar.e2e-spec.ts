import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ClerkAuthGuard } from './../src/auth/clerk-auth.guard';
import { AppExceptionFilter } from './../src/shared/filters/app-exception.filter';

const TEST_ORG_ID = 'e2e-pricebar-org';
const TEST_USER_ID = 'e2e-pricebar-user';

class MockClerkAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      email: 'pricebar@test.com',
      clerkId: 'pricebar-clerk-id',
    };
    return true;
  }
}

describe('PriceBar backfill (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ClerkAuthGuard)
      .useClass(MockClerkAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AppExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
  }, 30000);

  afterAll(async () => {
    const instruments = await prisma.instrument.findMany({
      where: { symbol: { in: ['AAPL', 'bitcoin'] } },
      select: { id: true },
    });
    await prisma.priceBar.deleteMany({
      where: { instrumentId: { in: instruments.map((i) => i.id) } },
    });
    await app.close();
  }, 30000);
  
  it('backfills real equity history (Alpha Vantage) and writes PriceBar rows', async () => {
    const res = await request(app.getHttpServer())
      .post('/price-bars/backfill/equity/AAPL?days=10')
      .expect(201);

    console.log('EQUITY BACKFILL RESULT:', res.body.data);

    expect(res.body.data.barsWritten).toBeGreaterThan(0);

    const barCount = await prisma.priceBar.count({
      where: { instrumentId: res.body.data.instrumentId },
    });
    expect(barCount).toBe(res.body.data.barsWritten);
  }, 30000);

  it('backfills real crypto history (CoinGecko) and writes PriceBar rows', async () => {
    const res = await request(app.getHttpServer())
      .post('/price-bars/backfill/crypto/bitcoin?days=7')
      .expect(201);

    console.log('CRYPTO BACKFILL RESULT:', res.body.data);

    expect(res.body.data.barsWritten).toBeGreaterThan(0);

    const barCount = await prisma.priceBar.count({
      where: { instrumentId: res.body.data.instrumentId },
    });
    expect(barCount).toBe(res.body.data.barsWritten);
  }, 30000);
});