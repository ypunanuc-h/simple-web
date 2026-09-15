import { normalizeForComparison } from '../common/normalize';

export interface DepartmentNameCandidate {
  readonly id: number;
  readonly name: string;
}

/**
 * หาแผนกที่ชื่อชนกับ candidateName ตามกฎ normalize ของ D6 (ตัดช่องว่างหัวท้าย →
 * ลบช่องว่างภายใน → ตัวพิมพ์เล็ก) — excludeId ใช้ตอน PUT เพื่อไม่ให้แผนกชนกับตัวเอง
 * (AC-D13: เปลี่ยนชื่อเป็นชื่อเดิมของตัวเองต้องได้ 200 ไม่ใช่ 409)
 */
export function findDuplicateDepartment(
  existing: readonly DepartmentNameCandidate[],
  candidateName: string,
  excludeId?: number,
): DepartmentNameCandidate | undefined {
  const normalizedCandidate = normalizeForComparison(candidateName);
  return existing.find(
    (department) => department.id !== excludeId && normalizeForComparison(department.name) === normalizedCandidate,
  );
}
