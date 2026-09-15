/** Error ของ domain ไม่รู้จัก HTTP ตาม CLAUDE.md §5.2 */
export class ResourceNotFoundError extends Error {
  constructor(resource: string, id: number) {
    super(`${resource} ${id} not found`);
    this.name = 'ResourceNotFoundError';
  }
}

export interface FieldErrorDetail {
  field: string;
  rule: string;
  message: string;
}

/**
 * รวม error ทุกแหล่งที่ต้องตอบ 400 VALIDATION_ERROR ไว้ในชนิดเดียว — ทั้งจาก DTO
 * (แปลงมาจาก class-validator ผ่าน exceptionFactory) และจากกฎที่ service ตรวจเอง
 * เช่น department_id มีอยู่จริงไหม หรือ salary/join_date ที่มีหลาย rule code ในฟิลด์เดียว
 * ทำให้ exception filter มีจุดแปลงเป็นรูปแบบ SPEC.md §4.1 จุดเดียว (AC-V17, AC-V18)
 */
export class ValidationFailedError extends Error {
  constructor(public readonly details: FieldErrorDetail[]) {
    super('validation failed');
    this.name = 'ValidationFailedError';
  }
}
