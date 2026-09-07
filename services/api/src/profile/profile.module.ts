import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PersonaEmbeddingService } from './persona-embedding.service';
import { GoogleEmbeddingProvider } from './google-embedding.provider';

@Module({
  imports: [UserModule, PrismaModule],
  controllers: [ProfileController],
  providers: [ProfileService, PersonaEmbeddingService, GoogleEmbeddingProvider],
  exports: [GoogleEmbeddingProvider],
})
export class ProfileModule {}