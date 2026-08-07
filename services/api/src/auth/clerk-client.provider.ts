import { Provider } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { ConfigSchema } from '../config/config.schema';

export const CLERK_CLIENT = 'CLERK_CLIENT';

export const ClerkClientProvider: Provider = {
  provide: CLERK_CLIENT,
  useFactory: (configService: ConfigService<ConfigSchema, true>) => {
    return createClerkClient({
      secretKey: configService.get('CLERK_SECRET_KEY', { infer: true }),
      publishableKey: configService.get('CLERK_PUBLISHABLE_KEY', { infer: true }),
    });
  },
  inject: [ConfigService],
};