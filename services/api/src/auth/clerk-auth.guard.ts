import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import type { ClerkClient } from '@clerk/backend';
import { CLERK_CLIENT } from './clerk-client.provider';
import { UserService } from '../user/user.service';
import type { User } from '@prisma/client';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    @Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExpressRequest>();

    const absoluteUrl = `${request.protocol}://${request.get('host')}${request.originalUrl}`;

    const webRequest = new Request(absoluteUrl, {
      method: request.method,
      headers: request.headers as Record<string, string>,
    });

    const { isAuthenticated, toAuth } = await this.clerkClient.authenticateRequest(
      webRequest,
      {
        authorizedParties: [
          'https://valid-mastodon-30.accounts.dev',
          'http://localhost:3000',
          'http://localhost:3001',
        ],
      },
    );

    if (!isAuthenticated) {
      throw new UnauthorizedException('Invalid or missing authentication token');
    }

    const auth = toAuth();
    const clerkId = auth.userId;

    // Fetch the user's primary email from Clerk to populate our own User record
    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    const email = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress;

    if (!email) {
      throw new UnauthorizedException('Authenticated user has no primary email');
    }

    const user: User = await this.userService.findOrCreateFromClerk(clerkId, email);

    // Attach both the raw Clerk auth payload and our own User record downstream
    (request as ExpressRequest & { auth: typeof auth; user: User }).auth = auth;
    (request as ExpressRequest & { auth: typeof auth; user: User }).user = user;

    return true;
  }
}