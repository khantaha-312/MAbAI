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
      id: 'e2e-macro-user',
      orgId: 'e2e-macro-org',
      email: 'macro@test.com',
      clerkId: 'macro-clerk-id',
    };
    return true;
  }
}

describe('Macro Analysis (e2e)', () => {
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

  it('returns a real macro snapshot with oil/gold/forex populated where providers support it', async () => {
    const res = await request(app.getHttpServer())
      .get('/macro-analysis')
      .expect(200);

    console.log('MACRO SNAPSHOT:', JSON.stringify(res.body.data, null, 2));

    expect(res.body.data).toHaveProperty('oil');
    expect(res.body.data).toHaveProperty('gold');
    expect(res.body.data).toHaveProperty('usdStrength');
    expect(res.body.data.interestRates.available).toBe(false);
    expect(res.body.data.inflation.available).toBe(false);
    expect(res.body.data.majorIndices.available).toBe(false);
  }, 30000);
});