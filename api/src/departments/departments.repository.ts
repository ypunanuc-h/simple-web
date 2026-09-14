import type { EntityManager } from 'typeorm';
import { DepartmentEntity } from './department.entity';

/**
 * คุยกับตาราง departments อย่างเดียว ไม่มีกฎธุรกิจใด ๆ ตาม CLAUDE.md §5.1
 * รับ EntityManager เพื่อร่วม transaction ที่ service เปิดไว้เสมอ — ไม่มี default
 * เพราะการเขียนข้อมูลนอก transaction ที่ service ควบคุมไม่ควรเกิดขึ้นเงียบ ๆ
 */

/** ทุกแถวเรียงตาม name ตาม SPEC.md §4.5 — ใช้ทั้งตอน import และตอน GET /api/departments ในอนาคต */
export async function findAllDepartments(
  manager: EntityManager,
): Promise<DepartmentEntity[]> {
  return manager.find(DepartmentEntity, { order: { name: 'ASC' } });
}

/**
 * สร้างแผนกใหม่ด้วยชื่อที่ให้มาตรง ๆ (ตัดช่องว่างหัวท้ายแล้วโดยผู้เรียก)
 * ไม่ normalize ก่อนบันทึก เพราะ D6 ใช้ normalize เพื่อเปรียบเทียบเท่านั้น ไม่ใช่เพื่อแปลงค่า
 */
export async function createDepartment(
  manager: EntityManager,
  name: string,
): Promise<DepartmentEntity> {
  const entity = manager.create(DepartmentEntity, { name });
  return manager.save(DepartmentEntity, entity);
}
