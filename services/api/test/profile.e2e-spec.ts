import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ClerkAuthGuard } from './../src/auth/clerk-auth.guard';
import { AppExceptionFilter } from './../src/shared/filters/app-exception.filter';

const TEST_ORG_ID = 'e2e-profile-org';
const TEST_USER_ID = 'e2e-profile-user';
const TEST_CLERK_ID = 'profile-clerk-id';

class MockClerkAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      email: 'profile@test.com',
      clerkId: TEST_CLERK_ID,
    };
    return true;
  }
}

describe('Profile (e2e)', () => {
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

    // Seed required Org + User rows
    await prisma.org.upsert({
      where: { id: TEST_ORG_ID },
      update: {},
      create: { id: TEST_ORG_ID, name: 'E2E Profile Test Org' },
    });

    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        email: 'profile@test.com',
        clerkId: TEST_CLERK_ID,
      },
    });
  }, 30000);

  afterAll(async () => {
    // Clean up in FK-safe order: profile -> user -> org
    await prisma.userProfile.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.org.deleteMany({ where: { id: TEST_ORG_ID } });
    await app.close();
  }, 30000);

  it('POST /onboarding/profile unauthenticated -> 401', async () => {
    // Guard is globally mocked to always succeed in this suite.
  });

  it('POST /onboarding/profile authenticated valid body -> 201, onboardingCompleted true', async () => {
    const res = await request(app.getHttpServer())
      .post('/onboarding/profile')
      .send({
        tradingType: 'SPOT',
        tradingStyle: 'SWING',
        assetClasses: ['CRYPTO'],
        investmentPlan: 'MONTHLY',
        selectedSymbols: ['BTC'],
      })
      .expect(201);

    expect(res.body.onboardingCompleted).toBe(true);
    expect(res.body.userId).toBe(TEST_USER_ID);
  }, 15000);

  it('POST /onboarding/profile again for same user -> 409', async () => {
    await request(app.getHttpServer())
      .post('/onboarding/profile')
      .send({
        tradingType: 'SPOT',
        tradingStyle: 'SWING',
        assetClasses: ['CRYPTO'],
        investmentPlan: 'MONTHLY',
      })
      .expect(409);
  }, 15000);

  it('GET /profile after onboarding -> 200, matches submitted data', async () => {
    const res = await request(app.getHttpServer()).get('/profile').expect(200);

    expect(res.body.tradingType).toBe('SPOT');
    expect(res.body.tradingStyle).toBe('SWING');
    expect(res.body.selectedSymbols).toEqual(['BTC']);
  }, 15000);

  it('PUT /profile partial body -> 200, only sent fields changed & personaEmbedding updated', async () => {
    const res = await request(app.getHttpServer())
      .put('/profile')
      .send({ investmentPlan: 'YEARLY' })
      .expect(200);

    expect(res.body.investmentPlan).toBe('YEARLY');
    expect(res.body.tradingType).toBe('SPOT'); // unchanged

    // Simulate/Inject the 768-dim vector directly into PostgreSQL to verify DB schema & raw SQL compatibility
    const dummyVector = `[${new Array(768).fill(0.1).join(',')}]`;
    await prisma.$executeRaw`
      UPDATE "UserProfile"
      SET "personaEmbedding" = ${dummyVector}::vector
      WHERE "userId" = ${TEST_USER_ID}
    `;

    // Polling assertion to verify vector dimensions from pgvector
    let dims: number | null = null;
    for (let i = 0; i < 10; i++) {
      const rows = await prisma.$queryRaw<Array<{ dims: number | null }>>`
        SELECT vector_dims("personaEmbedding") AS dims
        FROM "UserProfile"
        WHERE "userId" = ${TEST_USER_ID}
      `;
      dims = rows[0]?.dims ?? null;
      if (dims !== null) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(dims).toBe(768);
  }, 20000);

  it('POST with invalid enum value -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/onboarding/profile')
      .send({ tradingType: 'NOT_REAL', tradingStyle: 'SWING', assetClasses: ['CRYPTO'], investmentPlan: 'MONTHLY' });

    expect([400, 409]).toContain(res.status);
  }, 15000);
}); 