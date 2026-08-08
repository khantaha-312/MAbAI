import { Module } from '@nestjs/common';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [PositionController],
  providers: [PositionService],
})
export class PositionModule {}