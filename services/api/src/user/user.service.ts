import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateFromClerk(clerkId: string, email: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (existing) {
      return existing;
    }

    // New user: create a personal Org, then the User linked to it.
    // Wrapped in a transaction so we never end up with an orphaned Org
    // if User creation fails.
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.org.create({
        data: {
          name: `${email}'s Organization`,
        },
      });

      const user = await tx.user.create({
        data: {
          clerkId,
          email,
          orgId: org.id,
        },
      });

      return user;
    });
  }
}