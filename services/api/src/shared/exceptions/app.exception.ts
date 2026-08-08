import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../errors/error-code';

export class AppException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ error: { code: errorCode, message } }, status);
  }
}