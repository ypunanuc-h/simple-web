import type { Department } from '../../lib/api-client';

/**
 * ค้นหาแผนกด้วยชื่อฝั่ง client — แทนที่ AC-L15 (sort=department) ตามที่ตกลงไว้
 * เพราะ GET /api/departments โหลดมาทั้งก้อนอยู่แล้ว (ไม่แบ่งหน้า) ไม่ต้องผ่าน API — stub ยังไม่ implement
 */
export function filterDepartmentsByName(
  departments: readonly Department[],
  query: string,
): readonly Department[] {
  const trimmed = query.trim();
  if (trimmed === '') return departments;

  const needle = trimmed.toLowerCase();
  return departments.filter((department) => department.name.toLowerCase().includes(needle));
}
