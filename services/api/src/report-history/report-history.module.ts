import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EvidencePackageModule } from '../evidence-package/evidence-package.module';
import { ReportHistoryController } from './report-history.controller';
import { ReportHistoryService } from './report-history.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, EvidencePackageModule, UserModule],
  controllers: [ReportHistoryController],
  providers: [ReportHistoryService],
})
export class ReportHistoryModule {}