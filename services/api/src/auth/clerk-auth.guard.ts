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

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(@Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient) {}

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

    (request as ExpressRequest & { auth: ReturnType<typeof toAuth> }).auth = toAuth();
    return true;
  }
}