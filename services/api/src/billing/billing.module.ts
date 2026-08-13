import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}