import type { FieldErrorDetail } from '../common/domain-error';

function normalizeIntegerPart(raw: string): string {
  const stripped = raw.replace(/^0+/, '');
  return stripped === '' ? '0' : stripped;
}

function padFraction(raw: string): string {
  return `${raw}00`.slice(0, 2);
}

/**
 * เทียบ decimal string สองค่าล้วน ๆ ห้ามผ่าน Number()/parseFloat() ตาม D7
 * มิเรอร์เทคนิคของ isOverMaxSalary ใน employee-field-validators.ts — ตัด leading zero
 * ของ integer part แล้วเทียบตามความยาวก่อนเทียบ lexicographic, ส่วน fraction pad เป็น 2
 * หลักเสมอกันปัญหา "0.5" vs "0.45" ที่เทียบ string ตรง ๆ แล้วผิด
 * คืน -1 ถ้า a < b, 0 ถ้าเท่ากัน, 1 ถ้า a > b
 */
export function compareDecimalStrings(a: string, b: string): number {
  const [aIntRaw = '', aFracRaw = ''] = a.split('.');
  const [bIntRaw = '', bFracRaw = ''] = b.split('.');

  const aInt = normalizeIntegerPart(aIntRaw);
  const bInt = normalizeIntegerPart(bIntRaw);

  if (aInt.length !== bInt.length) return aInt.length < bInt.length ? -1 : 1;
  if (aInt !== bInt) return aInt < bInt ? -1 : 1;

  const aFrac = padFraction(aFracRaw);
  const bFrac = padFraction(bFracRaw);
  if (aFrac !== bFrac) return aFrac < bFrac ? -1 : 1;

  return 0;
}

/**
 * AC-L22/AC-L23 — ตรวจว่าช่วงที่ส่งมาไม่กลับด้าน (min > max) ตาม SPEC.md §5.3
 * ตรวจเฉพาะคู่ที่ส่งมาครบทั้งสองฝั่งเท่านั้น ฝั่งเดียวไม่มีอะไรให้เทียบ
 */
export function validateListQueryRange(input: {
  salaryMin?: string;
  salaryMax?: string;
  joinDateFrom?: string;
  joinDateTo?: string;
}): FieldErrorDetail[] {
  const details: FieldErrorDetail[] = [];

  if (
    input.salaryMin !== undefined &&
    input.salaryMax !== undefined &&
    compareDecimalStrings(input.salaryMin, input.salaryMax) > 0
  ) {
    details.push({ field: 'salary_min', rule: 'range', message: 'salary_min ต้องไม่มากกว่า salary_max' });
  }

  if (
    input.joinDateFrom !== undefined &&
    input.joinDateTo !== undefined &&
    input.joinDateFrom > input.joinDateTo
  ) {
    details.push({ field: 'join_date_from', rule: 'range', message: 'join_date_from ต้องไม่มากกว่า join_date_to' });
  }

  return details;
}
