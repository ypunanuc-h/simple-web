import type { DataSource, EntityManager } from 'typeorm';
import { readNumber, readRows, readString } from '../common/pg-row';
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

export interface DepartmentReadRow {
  id: number;
  name: string;
  employeeCount: number;
}

/**
 * อ่านแผนกทั้งหมดพร้อมจำนวนพนักงาน เรียงตามชื่อ ตาม SPEC.md §4.5 (AC-D01, AC-D02)
 * เป็น read-only ล้วนจึงรับ DataSource ตรง ๆ ไม่ต้องร่วม transaction ของใคร
 */
export async function findAllDepartmentsWithEmployeeCount(
  dataSource: DataSource,
): Promise<DepartmentReadRow[]> {
  const result: unknown = await dataSource.query(`
    SELECT d.id, d.name, COUNT(e.id)::int AS employee_count
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id
    GROUP BY d.id, d.name
    ORDER BY d.name ASC
  `);

  return readRows(result).map((row) => ({
    id: readNumber(row, 'id'),
    name: readString(row, 'name'),
    employeeCount: readNumber(row, 'employee_count'),
  }));
}

/**
 * ใช้ตรวจ department_id ก่อนเขียนพนักงานตาม AC-V04 — ให้ได้ 400 rule not_found
 * ที่อ่านรู้เรื่อง แทนที่จะปล่อยให้ FK constraint ของ Postgres โยน error ดิบออกมาเป็น 500
 */
export async function departmentExists(dataSource: DataSource, id: number): Promise<boolean> {
  const result: unknown = await dataSource.query('SELECT 1 FROM departments WHERE id = $1', [id]);
  return readRows(result).length > 0;
}
