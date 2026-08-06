import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class AppLogger implements NestLoggerService {
  log(message: any, ...optionalParams: any[]): void {
    const logObject = {
      level: 'log',
      message,
      context: optionalParams.length ? optionalParams : undefined,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logObject));
  }

  error(message: any, ...optionalParams: any[]): void {
    const logObject = {
      level: 'error',
      message,
      context: optionalParams.length ? optionalParams : undefined,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logObject));
  }

  warn(message: any, ...optionalParams: any[]): void {
    const logObject = {
      level: 'warn',
      message,
      context: optionalParams.length ? optionalParams : undefined,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logObject));
  }

  debug?(message: any, ...optionalParams: any[]): void {
    const logObject = {
      level: 'debug',
      message,
      context: optionalParams.length ? optionalParams : undefined,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logObject));
  }

  verbose?(message: any, ...optionalParams: any[]): void {
    const logObject = {
      level: 'verbose',
      message,
      context: optionalParams.length ? optionalParams : undefined,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logObject));
  }
}
