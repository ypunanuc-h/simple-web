import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ValidationFailedError, type FieldErrorDetail } from './domain-error';

/**
 * แปลง ValidationError[] ของ class-validator เป็น details[] ตาม SPEC.md §4.1
 *
 * แต่ละ decorator ใน DTO ต้องส่ง `{ context: { rule: '<rule code ของ SPEC>' } }` มาด้วยเสมอ
 * เพื่อให้ rule code ตรงกับคำศัพท์ของ spec (เช่น required, length, format, type, range)
 * แทนที่จะพึ่งชื่อ constraint ภายในของ class-validator เอง (เช่น isNotEmpty, matches)
 * ซึ่งเป็นรายละเอียดการ implement ที่ไม่ควรหลุดออกไปเป็นสัญญา API
 */
function toDetails(errors: readonly ValidationError[]): FieldErrorDetail[] {
  const details: FieldErrorDetail[] = [];

  for (const error of errors) {
    const constraints = error.constraints ?? {};
    for (const constraintKey of Object.keys(constraints)) {
      const context: unknown = error.contexts?.[constraintKey];
      const rule =
        typeof context === 'object' && context !== null && 'rule' in context
          ? String((context as { rule: unknown }).rule)
          : constraintKey;

      details.push({
        field: error.property,
        rule,
        message: constraints[constraintKey] ?? `${error.property} ไม่ถูกต้อง`,
      });
    }
  }

  return details;
}

/** ใช้ตัวเดียวกันทั้งใน main.ts และทุกไฟล์ e2e เพื่อให้ error shape ตรงกันเสมอ */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => new ValidationFailedError(toDetails(errors)),
  });
}
