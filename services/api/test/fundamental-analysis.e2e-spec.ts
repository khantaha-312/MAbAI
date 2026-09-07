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
      id: 'e2e-fa-user',
      orgId: 'e2e-fa-org',
      email: 'fa@test.com',
      clerkId: 'fa-clerk-id',
    };
    return true;
  }
}

describe('Fundamental Analysis (e2e)', () => {
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

  it('returns real fundamentals for AAPL from Finnhub — logs raw response for field-name verification', async () => {
    const res = await request(app.getHttpServer())
      .get('/fundamental-analysis/AAPL')
      .expect(200);

    console.log('AAPL FUNDAMENTALS RESULT:', JSON.stringify(res.body.data, null, 2));

    // Deliberately loose assertions for this first real run — the point of
    // this test right now is to SEE the real data and raw Finnhub field
    // names, not lock in strict expectations before we've confirmed the
    // field mapping is correct. Tighten these once verified.
    expect(res.body.data).toHaveProperty('available');
    expect(res.body.data).toHaveProperty('assessment');
  }, 15000);
  
});