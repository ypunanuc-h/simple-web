import type { EntityManager } from 'typeorm';
import { readBoolean, readNumber, readRows } from '../common/pg-row';

/**
 * คุยกับตาราง employees อย่างเดียว ไม่มีกฎธุรกิจใด ๆ ตาม CLAUDE.md §5.1
 * รับ EntityManager เพื่อร่วม transaction ที่ service เปิดไว้เสมอ
 */

export interface UpsertEmployeeInput {
  id: number;
  name: string;
  departmentId: number;
  salary: string;
  joinDate: string;
  isActive: boolean;
  /**
   * ใช้เฉพาะตอนแถวนี้เป็นแถวใหม่ (INSERT) ตาม D1 — ค่ามาจาก Last Updated Date ในไฟล์
   * ต้องเป็น ISO string ที่มี Z ต่อท้ายเสมอ (D9) ตอน UPDATE ค่านี้ถูกละเว้น ใช้ `now` แทน
   */
  insertUpdatedAtIso: string;
}

export type UpsertOutcome = 'created' | 'changed';

export interface UpsertEmployeeResult {
  id: number;
  outcome: UpsertOutcome;
}

/**
 * upsert ตาม D1 — ON CONFLICT (id) DO UPDATE ... WHERE (คอลัมน์ข้อมูล) IS DISTINCT FROM (...)
 * ห้ามรวม updated_at ในเงื่อนไขเปรียบเทียบ (SPEC.md D1)
 *
 * แถวใหม่ (INSERT) ได้ updated_at จาก row.insertUpdatedAtIso ของแต่ละแถวเอง
 * แถวเดิมที่เปลี่ยนแปลงจริง (DO UPDATE ที่ผ่านเงื่อนไข WHERE) ได้ updated_at = now (พารามิเตอร์)
 * ซึ่งเป็นค่าเดียวที่ repository ตัดสินใจเอง — เป็นค่าปัจจุบันของการรันนี้ ไม่ใช่กฎธุรกิจ
 *
 * คืนเฉพาะแถวที่ถูก insert หรือ update จริง (created/changed) แถวที่ conflict แต่ข้อมูล
 * ไม่ต่างจากเดิมจะไม่ถูกคืนมาเลย เพราะเงื่อนไข WHERE ทำให้ DO UPDATE ไม่ทำงานและ RETURNING
 * ไม่คืนแถวนั้น ผู้เรียกคำนวณจำนวน "unchanged" เองจาก (จำนวนแถวที่ส่งมา - จำนวนแถวที่คืนมา)
 *
 * ใช้ทริค xmax = 0 ของ Postgres แยกว่าแถวที่ RETURNING มาเป็น insert หรือ update จริง —
 * xmax เป็น 0 เฉพาะแถวที่เพิ่ง insert ในทรานแซกชันนี้ ส่วนแถวที่ผ่าน DO UPDATE จะมี xmax
 * ที่ไม่ใช่ 0 เสมอ แม้เป็นทรานแซกชันเดียวกัน
 */
export async function upsertEmployees(
  manager: EntityManager,
  rows: readonly UpsertEmployeeInput[],
  now: Date,
): Promise<UpsertEmployeeResult[]> {
  const results: UpsertEmployeeResult[] = [];

  for (const row of rows) {
    const queryResult: unknown = await manager.query(
      `INSERT INTO employees (id, name, department_id, salary, join_date, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name          = EXCLUDED.name,
         department_id = EXCLUDED.department_id,
         salary        = EXCLUDED.salary,
         join_date     = EXCLUDED.join_date,
         is_active     = EXCLUDED.is_active,
         updated_at    = $8
       WHERE (employees.name, employees.department_id, employees.salary,
              employees.join_date, employees.is_active)
             IS DISTINCT FROM
             (EXCLUDED.name, EXCLUDED.department_id, EXCLUDED.salary,
              EXCLUDED.join_date, EXCLUDED.is_active)
       RETURNING id, (xmax = 0) AS inserted`,
      [
        row.id,
        row.name,
        row.departmentId,
        row.salary,
        row.joinDate,
        row.isActive,
        row.insertUpdatedAtIso,
        now.toISOString(),
      ],
    );

    const returnedRows = readRows(queryResult);
    if (returnedRows.length === 0) {
      continue;
    }
    const [returnedRow] = returnedRows;
    results.push({
      id: readNumber(returnedRow, 'id'),
      outcome: readBoolean(returnedRow, 'inserted') ? 'created' : 'changed',
    });
  }

  return results;
}

/**
 * รีเซ็ต identity sequence ให้เลย max(id) ปัจจุบัน ตาม D10 / ANALYSIS.md §3.5
 * ต้องเรียกทุกครั้งหลัง import ไม่ใช่เฉพาะครั้งแรก
 *
 * ถ้าตารางว่าง (MAX(id) เป็น null) ตั้ง sequence กลับไปที่ 1 แบบ is_called = false
 * เพื่อไม่ให้ setval พังตอนไม่มีแถวเลย และ nextval() ครั้งถัดไปยังได้ 1 ตามพฤติกรรมเริ่มต้น
 */
export async function resetEmployeeIdentitySequence(
  manager: EntityManager,
): Promise<void> {
  await manager.query(`
    SELECT setval(
      pg_get_serial_sequence('employees', 'id'),
      COALESCE((SELECT MAX(id) FROM employees), 1),
      (SELECT MAX(id) FROM employees) IS NOT NULL
    )
  `);
}
