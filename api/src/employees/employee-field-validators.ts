import type { FieldErrorDetail } from '../common/domain-error';

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 255;

/**
 * ตรวจ name ตาม SPEC.md §5.1 (AC-V01/V02) — ย้ายมาจาก DTO decorator (`@Length`) เพราะ
 * ValidationPipe หยุดที่ error แรกที่เจอ ถ้าปล่อยให้ DTO ตรวจ "ค่า" ของ name เอง
 * แล้วมีฟิลด์อื่นที่ผิดแบบที่ DTO ตรวจไม่ได้ (salary/join_date/department_id) ปนมาด้วย
 * AC-V18 (รายงานทุกช่องที่ผิดพร้อมกัน) จะไม่ผ่าน เพราะ request ไม่มีทางไปถึง service เลย
 * ค่าที่รับมาต้องผ่านการตัดช่องว่างหัวท้ายจาก DTO's @Transform มาแล้ว (AC-V03)
 */
export function validateName(value: string): FieldErrorDetail | null {
  if (value.length < NAME_MIN_LENGTH || value.length > NAME_MAX_LENGTH) {
    return { field: 'name', rule: 'length', message: 'name ต้องยาว 1 ถึง 255 ตัวอักษร' };
  }
  return null;
}

const SALARY_SHAPE_PATTERN = /^\d+(\.\d+)?$/;
const MAX_SALARY_INTEGER_DIGITS = 10; // DECIMAL(12,2) → 10 หลักก่อนจุด, 9999999999.99 สูงสุด
const MAX_SALARY_INTEGER_PART = '9999999999';

/**
 * ตรวจ salary ตาม SPEC.md §5.1 (AC-V05/V06/V07/V08/V09/V10) — ทำเป็น pure function
 * แยกจาก DTO เพราะฟิลด์เดียวมีหลาย rule code (format/max_scale/range) ซึ่ง decorator
 * ของ class-validator ตัวเดียวให้ได้แค่ rule เดียว ห้ามผ่าน Number()/parseFloat() เลย
 * ตาม D7 — ทุกการเปรียบเทียบทำด้วย string/integer arithmetic ล้วน
 */
export function validateSalary(value: string): FieldErrorDetail | null {
  // \d ไม่รวมเครื่องหมายลบ จึงกัน AC-V07 (ค่าติดลบ) ได้ในตัว เช่นเดียวกับคอมมาและ $ (AC-V05, V10)
  if (!SALARY_SHAPE_PATTERN.test(value)) {
    return { field: 'salary', rule: 'format', message: 'salary ต้องเป็นตัวเลขทศนิยม ห้ามมีคอมมาหรือสัญลักษณ์สกุลเงิน' };
  }

  const [integerPart, fractionPart = ''] = value.split('.');

  if (fractionPart.length > 2) {
    return { field: 'salary', rule: 'max_scale', message: 'ทศนิยมได้ไม่เกิน 2 ตำแหน่ง' };
  }

  if (isOverMaxSalary(integerPart ?? '')) {
    return { field: 'salary', rule: 'range', message: 'salary เกินขอบเขตที่รองรับ (สูงสุด 9999999999.99)' };
  }

  return null;
}

function isOverMaxSalary(integerPart: string): boolean {
  if (integerPart.length > MAX_SALARY_INTEGER_DIGITS) return true;
  if (integerPart.length < MAX_SALARY_INTEGER_DIGITS) return false;
  // ความยาวเท่ากันและเป็นตัวเลขล้วน (ผ่าน SALARY_SHAPE_PATTERN มาแล้ว) เทียบแบบ lexicographic ได้ถูกต้อง
  return integerPart > MAX_SALARY_INTEGER_PART;
}

const DATE_SHAPE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_JOIN_DATE = '1900-01-01';
const MAX_JOIN_DATE = '2100-12-31';
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  const maxDay = month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 31);
  return day >= 1 && day <= maxDay;
}

/**
 * ตรวจ join_date ตาม SPEC.md §5.1 (AC-V11/V12/V13/V14) — รูปแบบและวันจริงตามปฏิทิน
 * ใช้ rule เดียวกัน ('format') ตามที่ spec ระบุทั้งคู่ ส่วนช่วงปี 1900–2100 ใช้ rule 'range'
 * เทียบด้วยสตริงล้วนเพราะ YYYY-MM-DD zero-padded เรียงตามเวลาได้ถูกต้องอยู่แล้ว
 * ห้ามผ่าน Date object เลยแม้แต่ก้าวเดียวตาม D9
 */
export function validateJoinDate(value: string): FieldErrorDetail | null {
  const match = DATE_SHAPE_PATTERN.exec(value);
  if (match === null) {
    return { field: 'join_date', rule: 'format', message: 'join_date ต้องเป็นรูปแบบ YYYY-MM-DD' };
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!isRealCalendarDate(year, month, day)) {
    return { field: 'join_date', rule: 'format', message: 'join_date ต้องเป็นวันที่จริงตามปฏิทิน' };
  }

  if (value < MIN_JOIN_DATE || value > MAX_JOIN_DATE) {
    return { field: 'join_date', rule: 'range', message: 'join_date ต้องอยู่ระหว่าง 1900-01-01 ถึง 2100-12-31' };
  }

  return null;
}
