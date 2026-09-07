import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ClerkAuthGuard } from './../src/auth/clerk-auth.guard';
import { AppExceptionFilter } from './../src/shared/filters/app-exception.filter';

const TEST_ORG_ID = 'e2e-watchlist-org';
const TEST_USER_ID = 'e2e-watchlist-user';
const TEST_CLERK_ID = 'watchlist-clerk-id';

class MockClerkAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      email: 'watchlist@test.com',
      clerkId: TEST_CLERK_ID,
    };
    return true;
  }
}

describe('Watchlist / My Markets (e2e)', () => {
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

    await prisma.org.upsert({
      where: { id: TEST_ORG_ID },
      update: {},
      create: { id: TEST_ORG_ID, name: 'E2E Watchlist Test Org' },
    });
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, orgId: TEST_ORG_ID, email: 'watchlist@test.com', clerkId: TEST_CLERK_ID },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.watchlistItem.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.org.deleteMany({ where: { id: TEST_ORG_ID } });
    await app.close();
  }, 30000);

  it('POST /markets with a real known-good symbol -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/markets')
      .send({ symbol: 'AAPL', assetType: 'equity' })
      .expect(201);

    expect(res.body.instrument.symbol).toBe('AAPL');
  }, 20000);

  it('POST /markets with a garbage symbol -> 400', async () => {
    await request(app.getHttpServer())
      .post('/markets')
      .send({ symbol: 'ZZZZNOTREAL', assetType: 'equity' })
      .expect(400);
  }, 20000);

  it('POST /markets for a symbol already on the watchlist -> 409', async () => {
    await request(app.getHttpServer())
      .post('/markets')
      .send({ symbol: 'AAPL', assetType: 'equity' })
      .expect(409);
  }, 20000);

  it('GET /markets -> 200, includes the added item with price data', async () => {
    const res = await request(app.getHttpServer()).get('/markets').expect(200);

    const aapl = res.body.find((item: any) => item.instrument.symbol === 'AAPL');
    expect(aapl).toBeDefined();
    expect(typeof aapl.price === 'number' || aapl.priceUnavailable === true).toBe(true);
  }, 20000);

  it('DELETE /markets/AAPL?assetType=equity removes it', async () => {
    await request(app.getHttpServer()).delete('/markets/AAPL?assetType=equity').expect(200);

    const res = await request(app.getHttpServer()).get('/markets').expect(200);
    const aapl = res.body.find((item: any) => item.instrument.symbol === 'AAPL');
    expect(aapl).toBeUndefined();
  }, 20000);

  it('DELETE /markets/AAPL?assetType=equity again -> 404', async () => {
    await request(app.getHttpServer()).delete('/markets/AAPL?assetType=equity').expect(404);
  }, 20000);

  it('PUT /markets/reorder with valid full id set -> 200, order persisted', async () => {
    await request(app.getHttpServer())
      .post('/markets')
      .send({ symbol: 'AAPL', assetType: 'equity' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/markets')
      .send({ symbol: 'bitcoin', assetType: 'crypto' })
      .expect(201);

    const listRes = await request(app.getHttpServer()).get('/markets').expect(200);
    const ids = listRes.body.map((item: any) => item.id);
    const reversed = [...ids].reverse();

    const reorderRes = await request(app.getHttpServer())
      .put('/markets/reorder')
      .send({ orderedItemIds: reversed })
      .expect(200);

    expect(reorderRes.body.map((item: any) => item.id)).toEqual(reversed);
  }, 20000);

  it('PUT /markets/reorder with a mismatched id set -> 400', async () => {
    await request(app.getHttpServer())
      .put('/markets/reorder')
      .send({ orderedItemIds: ['not-a-real-id'] })
      .expect(400);
  }, 20000);
})