import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ClerkAuthGuard } from './../src/auth/clerk-auth.guard';
import { AppExceptionFilter } from './../src/shared/filters/app-exception.filter';

class MockClerkAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 'e2e-ta-user',
      orgId: 'e2e-ta-org',
      email: 'ta@test.com',
      clerkId: 'ta-clerk-id',
    };
    return true;
  }
}

describe('Technical Analysis (e2e)', () => {
  let app: INestApplication<App>;

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
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  it('returns a real RSI value for AAPL, calculated from stored PriceBar data', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/rsi/equity/AAPL')
      .expect(200);

    console.log('AAPL RSI RESULT:', res.body.data);

    expect(res.body.data.rsi).not.toBeNull();
    expect(res.body.data.rsi).toBeGreaterThanOrEqual(0);
    expect(res.body.data.rsi).toBeLessThanOrEqual(100);
    expect(res.body.data.barsUsed).toBeGreaterThan(14);
  }, 15000);

  it('returns real SMA values for AAPL across multiple periods from stored PriceBar data', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/sma/equity/AAPL')
      .expect(200);

    console.log('AAPL SMA RESULT:', res.body.data);

   // With 60 bars now available: 20 and 50-period both compute, 100/200 still need more history
    expect(res.body.data.sma[20]).not.toBeNull();
    expect(res.body.data.sma[50]).not.toBeNull();
    expect(res.body.data.sma[100]).toBeNull();
    expect(res.body.data.barsUsed).toBeGreaterThanOrEqual(50);
  }, 15000);

  it('returns real EMA values for AAPL, with EMA(12)/EMA(26) available for MACD next', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/ema/equity/AAPL')
      .expect(200);

    console.log('AAPL EMA RESULT:', res.body.data);

    expect(res.body.data.ema[12]).not.toBeNull();
    expect(res.body.data.ema[26]).not.toBeNull();
    expect(res.body.data.barsUsed).toBeGreaterThanOrEqual(26);
  }, 15000);

  it('returns a real non-null MACD for AAPL now that enough history exists', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/macd/equity/AAPL')
      .expect(200);

    console.log('AAPL MACD RESULT:', res.body.data);

    expect(res.body.data.macd).not.toBeNull();
    expect(typeof res.body.data.macd.macd).toBe('number');
    expect(typeof res.body.data.macd.signal).toBe('number');
    expect(res.body.data.macd.histogram).toBeCloseTo(
      res.body.data.macd.macd - res.body.data.macd.signal,
      6,
    );
  }, 15000);

  it('returns real Bollinger Bands for AAPL from stored PriceBar data', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/bollinger/equity/AAPL')
      .expect(200);

    console.log('AAPL BOLLINGER RESULT:', res.body.data);

    expect(res.body.data.bollinger).not.toBeNull();
    expect(res.body.data.bollinger.upper).toBeGreaterThan(res.body.data.bollinger.middle);
    expect(res.body.data.bollinger.lower).toBeLessThan(res.body.data.bollinger.middle);
    expect(res.body.data.barsUsed).toBeGreaterThanOrEqual(20);
  }, 15000);
  it('returns a real ATR for AAPL from stored PriceBar high/low/close data', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/atr/equity/AAPL')
      .expect(200);

    console.log('AAPL ATR RESULT:', res.body.data);

    expect(res.body.data.atr).not.toBeNull();
    expect(res.body.data.atr).toBeGreaterThan(0);
    expect(res.body.data.barsUsed).toBeGreaterThanOrEqual(15);
  }, 15000);
  it('returns real volume analysis for AAPL from stored PriceBar volume data', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/volume/equity/AAPL')
      .expect(200);

    console.log('AAPL VOLUME RESULT:', res.body.data);

    expect(res.body.data.volume).not.toBeNull();
    expect(res.body.data.volume.currentVolume).toBeGreaterThan(0);
    expect(['well_above_average', 'above_average', 'average', 'below_average', 'well_below_average']).toContain(
      res.body.data.volume.interpretation,
    );
  }, 15000);
  it('returns a real synthesized trend read for AAPL from existing indicators', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/trend/equity/AAPL')
      .expect(200);

    console.log('AAPL TREND RESULT:', res.body.data);

    expect(['bullish', 'bearish', 'mixed', 'insufficient_evidence']).toContain(res.body.data.trend.direction);
    expect(res.body.data.trend.evidenceCount).toBeGreaterThanOrEqual(2);
  }, 15000);
  it('returns a real aggregate bundling all 8 indicators for AAPL', async () => {
    const res = await request(app.getHttpServer())
      .get('/technical-analysis/equity/AAPL')
      .expect(200);

    console.log('AAPL AGGREGATE RESULT:', JSON.stringify(res.body.data, null, 2));

    const data = res.body.data;
    expect(data.rsi.rsi).not.toBeNull();
    expect(data.sma.sma[20]).not.toBeNull();
    expect(data.ema.ema[12]).not.toBeNull();
    expect(data.macd.macd).not.toBeNull();
    expect(data.bollinger.bollinger).not.toBeNull();
    expect(data.atr.atr).not.toBeNull();
    expect(data.volume.volume).not.toBeNull();
    expect(['bullish', 'bearish', 'mixed', 'insufficient_evidence']).toContain(data.trend.trend.direction);
  }, 20000);
  it('returns a real evidence package for AAPL with technical section populated and 6 engines honestly marked unavailable', async () => {
    const res = await request(app.getHttpServer())
      .get('/evidence-package/equity/AAPL')
      .expect(200);

    console.log('AAPL EVIDENCE PACKAGE:', JSON.stringify(res.body.data, null, 2));

    const data = res.body.data;
    expect(data.market.available).toBe(true);
    expect(data.technical.available).toBe(true);
    expect(data.fundamental).toEqual({ available: false, reason: expect.any(String), source: null });
    expect(data.macro.available).toBe(false);
    expect(data.news.available).toBe(false);
    expect(data.sentiment.available).toBe(false);
    expect(data.portfolio.available).toBe(false);
    expect(data.behavioral.available).toBe(false);
  }, 20000);
});