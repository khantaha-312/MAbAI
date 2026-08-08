import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    // If it's already our {error:{...}} shape (from AppException), pass through.
    // Otherwise (e.g. NestJS's built-in exceptions like UnauthorizedException),
    // wrap it into the same shape for consistency.
    if (typeof body === 'object' && body !== null && 'error' in body) {
      response.status(status).json(body);
    } else {
      response.status(status).json({
        error: {
          code: 'UNKNOWN_ERROR',
          message: typeof body === 'string' ? body : HttpStatus[status],
        },
      });
    }
  }
}