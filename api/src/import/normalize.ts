/**
 * normalize ค่าข้อความและแปลง salary ตาม ANALYSIS.md §3.2 และ D6/D7 ของ SPEC.md
 */

import { normalizeForComparison } from '../common/normalize';

/** ย้ายไป common/normalize.ts แล้วเพราะ departments ต้องใช้กฎ D6 เดียวกันตอนสร้าง/แก้ไขแผนกผ่าน API — re-export ไว้ไม่ให้กระทบจุดเรียกเดิมในไฟล์นี้ */
export { normalizeForComparison } from '../common/normalize';

export type StatusNormalizationResult =
  | { ok: true; isActive: boolean }
  | { ok: false };

const ACTIVE_KEY = 'active';
const INACTIVE_KEY = 'inactive';

/**
 * normalize คอลัมน์ Status แล้วเทียบกับ alias ที่รู้จัก
 * "active" -> true, "inactive" (ครอบคลุม "In Active" หลัง normalize) -> false
 * ค่าที่เทียบไม่ตรง -> ok: false (ให้ผู้เรียก reject แถวนั้น ห้ามใส่ default)
 */
export function normalizeStatus(raw: string): StatusNormalizationResult {
  const key = normalizeForComparison(raw);
  if (key === ACTIVE_KEY) return { ok: true, isActive: true };
  if (key === INACTIVE_KEY) return { ok: true, isActive: false };
  return { ok: false };
}

export type SalaryFormatResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

/**
 * number จาก exceljs (คอลัมน์ Salary) → string ทศนิยม 2 ตำแหน่งตาม D7
 * ปฏิเสธค่าติดลบ ค่าที่ไม่ใช่จำนวนจำกัด (NaN/Infinity) และค่าที่มีเศษเกิน 2 ตำแหน่ง
 * (เช่น 65000.005 ที่ปัดแล้วจะเพี้ยนจากไฟล์ต้นฉบับแบบเงียบ ๆ)
 *
 * ตรวจจำนวนตำแหน่งทศนิยมจากสตริงที่สั้นที่สุดซึ่ง round-trip กลับเป็นค่า double เดิมได้
 * (มาตรฐาน Number#toString ของ JS) แทนการเทียบค่าที่คูณ 100 แล้วปัดเศษ ซึ่งมี floating
 * point noise ของตัวเองที่ทำให้ผลลัพธ์ไม่แน่นอน
 */
export function formatSalaryFromNumber(raw: number): SalaryFormatResult {
  if (!Number.isFinite(raw)) {
    return { ok: false, reason: 'salary ไม่ใช่ตัวเลขที่ถูกต้อง' };
  }
  if (raw < 0) {
    return { ok: false, reason: 'salary ต้องไม่ติดลบ' };
  }

  const rawText = raw.toString();
  if (rawText.includes('e') || rawText.includes('E')) {
    return { ok: false, reason: 'salary อยู่ในรูปแบบที่แปลงเป็นทศนิยมปกติไม่ได้' };
  }

  const decimalIndex = rawText.indexOf('.');
  const fractionDigits = decimalIndex === -1 ? 0 : rawText.length - decimalIndex - 1;
  if (fractionDigits > 2) {
    return { ok: false, reason: 'salary มีเศษทศนิยมเกิน 2 ตำแหน่ง' };
  }

  return { ok: true, value: raw.toFixed(2) };
}
