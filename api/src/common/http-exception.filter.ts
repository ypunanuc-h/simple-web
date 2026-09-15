import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ResourceNotFoundError } from './domain-error';

/**
 * ทางออกเดียวของ error ทุกก้อน แปลงเป็นรูปแบบ SPEC.md หัวข้อ 4.1
 *
 * S2 เพิ่ม ResourceNotFoundError เพื่อให้ GET resource ที่ไม่พบตอบ 404 ตาม contract
 * ส่วน domain error อื่นและ details[] ของ class-validator จะเพิ่มใน S5a
 */
export interface ErrorDetail {
  field: string;
  rule: string;
  message: string;
}

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

const CODE_BY_STATUS: ReadonlyMap<number, string> = new Map([
  [HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR'],
  [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ResourceNotFoundError) {
      response.status(HttpStatus.NOT_FOUND).json({
        error: { code: 'NOT_FOUND', message: exception.message },
      } satisfies ErrorBody);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = CODE_BY_STATUS.get(status) ?? 'INTERNAL_ERROR';
      response.status(status).json({
        error: { code, message: exception.message },
      } satisfies ErrorBody);
      return;
    }

    // AC-N10 — ข้อความจาก driver ชื่อ constraint และ stack trace ห้ามหลุดออกไป
    // แต่ต้อง log ไว้ให้ตามรอยได้ที่ฝั่ง server (AC-N11)
    this.logger.error('unhandled exception', exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'เกิดข้อผิดพลาดภายในระบบ',
      },
    } satisfies ErrorBody);
  }
}
