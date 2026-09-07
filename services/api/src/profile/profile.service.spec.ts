import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service'; // CONFIRM: exact path
import { PersonaEmbeddingService } from './persona-embedding.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: {
    user: { findUnique: jest.Mock };
    userProfile: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let personaEmbeddingService: { refreshPersonaEmbedding: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      userProfile: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };

    personaEmbeddingService = {
      refreshPersonaEmbedding: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: PersonaEmbeddingService, useValue: personaEmbeddingService },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  const baseDto = {
    tradingType: 'SPOT',
    tradingStyle: 'SWING',
    assetClasses: ['CRYPTO'],
    investmentPlan: 'MONTHLY',
    selectedSymbols: ['BTC'],
  } as any;

  it('create() succeeds when no profile exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.userProfile.create.mockResolvedValue({ id: 'profile-1', ...baseDto });

    const result = await service.create('clerk-1', baseDto);
    expect(result.id).toBe('profile-1');
    expect(prisma.userProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', onboardingCompleted: true }),
      }),
    );
  });

  it('create() throws 409 if profile already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.userProfile.findUnique.mockResolvedValue({ id: 'profile-1' });

    await expect(service.create('clerk-1', baseDto)).rejects.toThrow(ConflictException);
  });

  it('create() throws 404 if clerkId does not resolve to a User', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.create('unknown-clerk', baseDto)).rejects.toThrow(NotFoundException);
  });

  it('getByClerkId() throws 404 if no profile exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.userProfile.findUnique.mockResolvedValue(null);

    await expect(service.getByClerkId('clerk-1')).rejects.toThrow(NotFoundException);
  });

  it('update() throws 404 if no profile exists yet', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.userProfile.findUnique.mockResolvedValue(null);

    await expect(
      service.update('clerk-1', { investmentPlan: 'YEARLY' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it("update() only touches the calling user's own profile", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
    prisma.userProfile.findUnique.mockResolvedValue({ id: 'profile-2', userId: 'user-2' });
    prisma.userProfile.update.mockResolvedValue({
      id: 'profile-2',
      userId: 'user-2',
      investmentPlan: 'YEARLY',
    });

    await service.update('clerk-2', { investmentPlan: 'YEARLY' } as any);

    expect(prisma.userProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-2' } }),
    );
  });
});