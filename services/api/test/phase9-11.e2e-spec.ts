import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ClerkAuthGuard } from './../src/auth/clerk-auth.guard';
import { AppExceptionFilter } from './../src/shared/filters/app-exception.filter';
import { ModelProviderService } from './../src/ai-orchestration/model-provider.service';

const TEST_ORG_ID = 'e2e-p911-org';
const TEST_USER_ID = 'e2e-p911-user';

class MockClerkAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      email: 'p911@test.com',
      clerkId: 'p911-clerk-id',
    };
    return true;
  }
}

// Stub — bypasses the real Anthropic API call entirely. This proves the
// PIPELINE (controller -> service -> Prediction Ledger write) works, but
// does NOT verify real AI-generated content or the "no directive language"
// rule. That stays unverified until real Anthropic credit exists — swap
// this override out and rerun once credit is added, to close the loop for real.
class MockModelProviderService {
  async generateRiskNarrative(userPrompt: string) {
    return {
      text: 'MOCKED OUTPUT (no real API call): this position shows elevated concentration risk relative to the rest of the portfolio.',
      modelProvider: 'anthropic',
      modelName: 'claude-sonnet-4-6-MOCKED',
    };
  }
}

describe('Phases 9-11 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let portfolioId: string;
  let alertRuleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ClerkAuthGuard)
      .useClass(MockClerkAuthGuard)
      .overrideProvider(ModelProviderService)
      .useClass(MockModelProviderService)
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
      create: { id: TEST_ORG_ID, name: 'P9-11 Test Org' },
    });
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        email: 'p911@test.com',
        clerkId: 'p911-clerk-id',
      },
    });

    const instrument = await prisma.instrument.findFirst({ where: { symbol: 'AAPL' } });
    if (!instrument) {
      throw new Error('No AAPL instrument found — run prisma:seed first.');
    }

    const portfolio = await prisma.portfolio.create({
      data: { userId: TEST_USER_ID, orgId: TEST_ORG_ID, name: 'P9-11 Test Portfolio' },
    });
    portfolioId = portfolio.id;

    await prisma.position.create({
      data: {
        portfolioId,
        instrumentId: instrument.id,
        quantity: '10',
        avgCostBasis: '150.00',
      },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.alertDelivery.deleteMany({
      where: { alertRule: { userId: TEST_USER_ID } },
    });
    await prisma.alertRule.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.ledgerEntry.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.subscription.deleteMany({ where: { orgId: TEST_ORG_ID } });
    await prisma.position.deleteMany({ where: { portfolio: { userId: TEST_USER_ID } } });
    await prisma.portfolio.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.delete({ where: { id: TEST_USER_ID } });
    await prisma.org.delete({ where: { id: TEST_ORG_ID } });
    await app.close();
  }, 30000);

  describe('Phase 9 — AI Orchestration (MOCKED — pipeline only, not real AI content)', () => {
    it('generates a narrative via the mock and logs it to the Prediction Ledger', async () => {
      const res = await request(app.getHttpServer())
        .post(`/portfolios/${portfolioId}/ai-narrative`)
        .expect(201);

      console.log('AI NARRATIVE OUTPUT (MOCKED):', res.body.data.narrative);

      expect(typeof res.body.data.narrative).toBe('string');
      expect(res.body.data.narrative.length).toBeGreaterThan(0);
      expect(res.body.data.ledgerEntryId).toBeDefined();

      const ledgerEntry = await prisma.ledgerEntry.findUnique({
        where: { id: res.body.data.ledgerEntryId },
      });
      expect(ledgerEntry).not.toBeNull();
      expect(ledgerEntry?.userId).toBe(TEST_USER_ID);
      expect(ledgerEntry?.modelProvider).toBe('anthropic');
    }, 30000);
  });

  describe('Phase 10 — Alerts', () => {
    it('creates an alert rule', async () => {
      const res = await request(app.getHttpServer())
        .post('/alert-rules')
        .send({
          type: 'PRICE_ABOVE',
          instrumentSymbol: 'AAPL',
          config: { threshold: 1 }, // guaranteed to trigger — AAPL is never $1
        })
        .expect(201);

      expect(res.body.data.userId).toBe(TEST_USER_ID);
      alertRuleId = res.body.data.id;
    });

    it('evaluates and triggers a stub delivery for the low-threshold rule', async () => {
      const res = await request(app.getHttpServer())
        .post('/alert-rules/evaluate')
        .expect(201);

      console.log('TRIGGERED ALERTS:', JSON.stringify(res.body.data, null, 2));

      const triggeredForOurRule = res.body.data.find(
        (d: any) => d.alertRuleId === alertRuleId,
      );
      expect(triggeredForOurRule).toBeDefined();
      expect(triggeredForOurRule.status).toBe('pending');
      expect(triggeredForOurRule.channel).toBe('in-app');
    }, 15000);
  });

  describe('Phase 11 — Billing', () => {
    it('creates a subscription', async () => {
      const res = await request(app.getHttpServer())
        .post('/billing/subscription')
        .send({ plan: 'pro' })
        .expect(201);

      expect(res.body.data.orgId).toBe(TEST_ORG_ID);
      expect(res.body.data.plan).toBe('pro');
      expect(res.body.data.status).toBe('active');
    });

    it('retrieves the created subscription', async () => {
      const res = await request(app.getHttpServer())
        .get('/billing/subscription')
        .expect(200);

      expect(res.body.data.plan).toBe('pro');
    });
  });
});