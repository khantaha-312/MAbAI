import { Injectable, Logger } from '@nestjs/common';
import { configSchema, ConfigSchema } from './config.schema';

@Injectable()
export class ConfigService {
  private readonly config: ConfigSchema;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    try {
      this.config = configSchema.parse(process.env);
      this.logger.log('Configuration validated successfully');
    } catch (error) {
      this.logger.error('Configuration validation failed:');
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
      throw error;
    }
  }

  get nodeEnv(): string {
    return this.config.NODE_ENV;
  }

  get port(): number {
    return this.config.PORT;
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get redisUrl(): string {
    return this.config.REDIS_URL;
  }
}
