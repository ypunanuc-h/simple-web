/**
 * เวลาปัจจุบันถูกดึงผ่าน provider ตัวนี้เท่านั้น ห้าม service เรียก new Date() เอง
 *
 * เหตุผล — D1 กับ D2 ให้ service เป็นผู้ตัดสินว่า updated_at ควรขยับหรือไม่
 * ถ้าเวลามาจาก new Date() ที่กระจายอยู่ในหลายไฟล์ เทสต์จะหยุดเวลาไม่ได้
 * ซึ่งขัดกับ CLAUDE.md หัวข้อ 6 ที่ห้าม assert กับ new Date() ตรง ๆ
 */
export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
