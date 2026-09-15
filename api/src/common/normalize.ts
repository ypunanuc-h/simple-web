/**
 * ตัดช่องว่างหัวท้าย → ลบช่องว่างภายใน → ตัวพิมพ์เล็ก ตาม D6 ของ SPEC.md / ANALYSIS.md §3.2
 * ใช้เพื่อ "เปรียบเทียบ" เท่านั้น ห้ามใช้เป็นค่าที่เก็บลงฐานข้อมูล
 *
 * อยู่ใน common/ เพราะทั้ง import (dedup แผนกตอน seed) และ departments (dedup ตอนสร้าง/
 * แก้ไขแผนกผ่าน API) ต้องใช้กฎเดียวกันเป๊ะ — ถ้ากฎสองทางต่างกัน ผู้ใช้จะสร้างแผนกที่
 * import มองไม่เห็นได้ตามที่ SPEC.md D6 เตือนไว้
 */
export function normalizeForComparison(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toLowerCase();
}
