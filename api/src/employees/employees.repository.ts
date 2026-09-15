import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { readBoolean, readNumber, readRows, readString } from '../common/pg-row';

/**
 * คุยกับตาราง employees อย่างเดียว ไม่มีกฎธุรกิจใด ๆ ตาม CLAUDE.md §5.1
 * รับ EntityManager เพื่อร่วม transaction ที่ service เปิดไว้เสมอ
 */

/** Contract read path — repository รับคำสั่งที่ service canonicalize แล้วเท่านั้น */
export interface EmployeeReadQuery {
  sort: string;
  order: string;
  page: number;
  pageSize: number;
  q?: string;
  departmentId?: number;
  isActive?: boolean;
  joinDateFrom?: string;
  joinDateTo?: string;
  salaryMin?: string;
  salaryMax?: string;
}

export interface EmployeeReadRow {
  id: number;
  name: string;
  departmentId: number;
  departmentName: string;
  salary: string;
  joinDate: string;
  isActive: boolean;
  updatedAt: Date;
}

export interface EmployeeReadPage {
  rows: readonly EmployeeReadRow[];
  total: number;
}

export interface CreateEmployeeInput {
  name: string;
  departmentId: number;
  salary: string;
  joinDate: string;
  isActive: boolean;
  updatedAt: Date;
}

export interface UpdateEmployeeInput {
  id: number;
  name: string;
  departmentId: number;
  salary: string;
  joinDate: string;
  isActive: boolean;
  updatedAt: Date;
}

const SORT_COLUMN_BY_KEY: ReadonlyMap<string, string> = new Map([
  ['id', 'e.id'],
  ['name', 'e.name'],
  ['salary', 'e.salary'],
  ['join_date', 'e.join_date'],
  ['updated_at', 'e.updated_at'],
]);

function readDate(row: unknown, key: string): Date {
  if (typeof row !== 'object' || row === null) {
    throw new Error(`expected an object row, got ${typeof row}`);
  }
  const value = Reflect.get(row, key);
  if (value instanceof Date) return value;
  throw new Error(`field "${key}" is ${typeof value}, expected Date`);
}

/** raw SQL สำหรับ read path: identifier มาจาก whitelist เท่านั้น ตาม CLAUDE.md §5 */
@Injectable()
export class EmployeesRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findPage(query: EmployeeReadQuery): Promise<EmployeeReadPage> {
    const sortColumn = SORT_COLUMN_BY_KEY.get(query.sort);
    if (sortColumn === undefined) {
      throw new Error(`unexpected employee sort key: ${query.sort}`);
    }
    const order = query.order === 'desc' ? 'DESC' : 'ASC';
    const offset = (query.page - 1) * query.pageSize;

    // เงื่อนไข AND ทั้งหมดเป็น SQL คงที่เดียวกันเสมอ ค่าที่ไม่ได้กรองส่งเป็น NULL ให้เงื่อนไขนั้น
    // no-op เอง — ไม่มีการต่อ string จาก query parameter ลง SQL ที่จุดใดเลย (CLAUDE.md §5)
    const filterParams: (string | number | boolean | null)[] = [
      query.q ?? null,
      query.departmentId ?? null,
      query.isActive ?? null,
      query.joinDateFrom ?? null,
      query.joinDateTo ?? null,
      query.salaryMin ?? null,
      query.salaryMax ?? null,
    ];
    const whereClause = `
      WHERE ($1::text IS NULL OR e.name ILIKE '%' || $1 || '%')
        AND ($2::int IS NULL OR e.department_id = $2)
        AND ($3::boolean IS NULL OR e.is_active = $3)
        AND ($4::date IS NULL OR e.join_date >= $4)
        AND ($5::date IS NULL OR e.join_date <= $5)
        AND ($6::numeric IS NULL OR e.salary >= $6)
        AND ($7::numeric IS NULL OR e.salary <= $7)
    `;

    const rowsResult: unknown = await this.dataSource.query(
      `SELECT e.id, e.name, e.department_id, d.name AS department_name,
              e.salary, e.join_date::text AS join_date, e.is_active, e.updated_at
       FROM employees e
       INNER JOIN departments d ON d.id = e.department_id
       ${whereClause}
       ORDER BY ${sortColumn} ${order}, e.id ASC
       LIMIT $8 OFFSET $9`,
      [...filterParams, query.pageSize, offset],
    );
    const totalResult: unknown = await this.dataSource.query(
      `SELECT count(*)::int AS total
       FROM employees e
       ${whereClause}`,
      filterParams,
    );

    const totalRows = readRows(totalResult);
    return {
      rows: readRows(rowsResult).map((row) => this.toReadRow(row)),
      total: readNumber(totalRows[0], 'total'),
    };
  }

  async findById(id: number): Promise<EmployeeReadRow | null> {
    const result: unknown = await this.dataSource.query(
      `SELECT e.id, e.name, e.department_id, d.name AS department_name,
              e.salary, e.join_date::text AS join_date, e.is_active, e.updated_at
       FROM employees e
       INNER JOIN departments d ON d.id = e.department_id
       WHERE e.id = $1`,
      [id],
    );
    const rows = readRows(result);
    const [row] = rows;
    return row === undefined ? null : this.toReadRow(row);
  }

  /** id มาจาก identity sequence เสมอตาม D10 — ไม่รับ id จากผู้เรียก */
  async insert(input: CreateEmployeeInput): Promise<number> {
    const result: unknown = await this.dataSource.query(
      `INSERT INTO employees (name, department_id, salary, join_date, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        input.name,
        input.departmentId,
        input.salary,
        input.joinDate,
        input.isActive,
        input.updatedAt.toISOString(),
      ],
    );
    const rows = readRows(result);
    return readNumber(rows[0], 'id');
  }

  /**
   * service เรียกเมธอดนี้เฉพาะตอนตัดสินใจแล้วว่าข้อมูลเปลี่ยนจริงตาม D2 — updatedAt
   * ที่ส่งมาจึงเป็นค่าที่ service ตัดสินใจแล้วเสมอ (Clock.now() หรือค่าเดิม) ไม่ใช่ default ของ repository
   */
  async update(input: UpdateEmployeeInput): Promise<void> {
    await this.dataSource.query(
      `UPDATE employees
       SET name = $2, department_id = $3, salary = $4, join_date = $5, is_active = $6, updated_at = $7
       WHERE id = $1`,
      [
        input.id,
        input.name,
        input.departmentId,
        input.salary,
        input.joinDate,
        input.isActive,
        input.updatedAt.toISOString(),
      ],
    );
  }

  async deleteById(id: number): Promise<boolean> {
    // TypeORM's postgres driver คืนผลของ DELETE/UPDATE เป็น tuple [rows, rowCount] เสมอ
    // (ต่างจาก SELECT/INSERT ที่คืน rows ตรง ๆ) — ต้อง destructure ก่อน มิฉะนั้น
    // readRows(result) จะเห็นแค่ length ของ tuple 2 ช่อง ซึ่งเป็น 2 เสมอไม่ว่าจะลบได้จริงหรือไม่
    const result: unknown = await this.dataSource.query(
      'DELETE FROM employees WHERE id = $1 RETURNING id',
      [id],
    );
    if (!Array.isArray(result)) {
      throw new Error(`expected a [rows, rowCount] tuple, got ${typeof result}`);
    }
    const [rows] = result;
    return readRows(rows).length > 0;
  }

  private toReadRow(row: unknown): EmployeeReadRow {
    return {
      id: readNumber(row, 'id'),
      name: readString(row, 'name'),
      departmentId: readNumber(row, 'department_id'),
      departmentName: readString(row, 'department_name'),
      salary: readString(row, 'salary'),
      joinDate: readString(row, 'join_date'),
      isActive: readBoolean(row, 'is_active'),
      updatedAt: readDate(row, 'updated_at'),
    };
  }
}

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
