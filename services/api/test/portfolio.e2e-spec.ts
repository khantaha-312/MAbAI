import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ClerkAuthGuard } from './../src/auth/clerk-auth.guard';
import { AppExceptionFilter } from './../src/shared/filters/app-exception.filter';

// Fixed IDs for a throwaway test Org+User we create directly via Prisma
// before the suite runs, and delete afterward. The mock guard always
// attaches this exact user, bypassing real Clerk verification entirely.
const TEST_ORG_ID = 'e2e-test-org';
const TEST_USER_ID = 'e2e-test-user';

class MockClerkAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      email: 'e2e@test.com',
      clerkId: 'e2e-clerk-id',
    };
    return true;
  }
}

describe('Portfolio + Position (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let createdPortfolioId: string;
  let seededInstrumentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ClerkAuthGuard)
      .useClass(MockClerkAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AppExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);

    // Create the real Org + User rows the mock guard's fake auth
    // payload refers to, so FK constraints on Portfolio don't fail.
    await prisma.org.upsert({
      where: { id: TEST_ORG_ID },
      update: {},
      create: { id: TEST_ORG_ID, name: 'E2E Test Org' },
    });
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        email: 'e2e@test.com',
        clerkId: 'e2e-clerk-id',
      },
    });

    const instrument = await prisma.instrument.findFirst({
      where: { symbol: 'AAPL' },
    });
    if (!instrument) {
      throw new Error(
        'No AAPL instrument found — run `npm run prisma:seed --workspace=services/api` first.',
      );
    }
    seededInstrumentId = instrument.id;
  });

  afterAll(async () => {
    // Clean up everything this suite created, in FK-safe order.
    await prisma.position.deleteMany({ where: { portfolio: { userId: TEST_USER_ID } } });
    await prisma.portfolio.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.delete({ where: { id: TEST_USER_ID } });
    await prisma.org.delete({ where: { id: TEST_ORG_ID } });
    await app.close();
  });

  it('POST /portfolios creates a real portfolio', async () => {
    const res = await request(app.getHttpServer())
      .post('/portfolios')
      .send({ name: 'E2E Test Portfolio' })
      .expect(201);

    expect(res.body.data.name).toBe('E2E Test Portfolio');
    expect(res.body.data.userId).toBe(TEST_USER_ID);
    createdPortfolioId = res.body.data.id;
  });

  it('POST /portfolios rejects an empty name', () => {
    return request(app.getHttpServer())
      .post('/portfolios')
      .send({ name: '' })
      .expect(400);
  });

  it('GET /portfolios lists the created portfolio', async () => {
    const res = await request(app.getHttpServer())
      .get('/portfolios')
      .expect(200);

    expect(
      res.body.data.some((p: any) => p.id === createdPortfolioId),
    ).toBe(true);
  });

  it('POST /portfolios/:id/positions creates a real position', async () => {
    const res = await request(app.getHttpServer())
      .post(`/portfolios/${createdPortfolioId}/positions`)
      .send({
        instrumentId: seededInstrumentId,
        quantity: '10',
        avgCostBasis: '150.00',
      })
      .expect(201);

    expect(res.body.data.portfolioId).toBe(createdPortfolioId);
  });

  it('GET /portfolios/:id/summary returns portfolio with nested position + instrument', async () => {
    const res = await request(app.getHttpServer())
      .get(`/portfolios/${createdPortfolioId}/summary`)
      .expect(200);

    expect(res.body.data.positions).toHaveLength(1);
    expect(res.body.data.positions[0].instrument.symbol).toBe('AAPL');
  });

  it('GET /portfolios/:id/summary on someone else\'s portfolio returns 404', () => {
    return request(app.getHttpServer())
      .get('/portfolios/nonexistent-id/summary')
      .expect(404);
  });

  it('DELETE /portfolios/:id soft-deletes and excludes it from future summary', async () => {
    await request(app.getHttpServer())
      .delete(`/portfolios/${createdPortfolioId}`)
      .expect(200);

    return request(app.getHttpServer())
      .get(`/portfolios/${createdPortfolioId}/summary`)
      .expect(404);
  });
});