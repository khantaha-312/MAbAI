import { Global, Module } from '@nestjs/common';
import { ClerkClientProvider, CLERK_CLIENT } from './clerk-client.provider';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [UserModule],
  providers: [ClerkClientProvider, ClerkAuthGuard],
  exports: [CLERK_CLIENT, ClerkAuthGuard],
})
export class ClerkAuthModule {}