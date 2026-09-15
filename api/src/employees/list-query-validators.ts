import type { FieldErrorDetail } from '../common/domain-error';

/**
 * เทียบ decimal string สองค่าล้วน ๆ ห้ามผ่าน Number()/parseFloat() ตาม D7
 * คืน -1 ถ้า a < b, 0 ถ้าเท่ากัน, 1 ถ้า a > b — stub ยังไม่ implement
 */
export function compareDecimalStrings(_a: string, _b: string): number {
  throw new Error('not implemented');
}

/**
 * AC-L22/AC-L23 — ตรวจว่าช่วงที่ส่งมาไม่กลับด้าน (min > max) — stub ยังไม่ implement
 */
export function validateListQueryRange(_input: {
  salaryMin?: string;
  salaryMax?: string;
  joinDateFrom?: string;
  joinDateTo?: string;
}): FieldErrorDetail[] {
  throw new Error('not implemented');
}
