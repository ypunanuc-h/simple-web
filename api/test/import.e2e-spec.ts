import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import type { DataSource, EntityManager } from 'typeorm';
import type { Clock } from '../src/common/clock';
import type {
  UpsertEmployeeInput,
  UpsertEmployeeResult,
} from '../src/employees/employees.repository';
import { defaultImportDependencies, importFromFile } from '../src/import/import.service';
import { EMPLOYEE_SHEET_NAME } from '../src/import/xlsx-reader';
import { readBoolean, readDate, readNumber, readString } from './db-row';
import { createTestDataSource, truncateAll } from './setup-db';

/**
 * ทดสอบ import.service.ts แบบ integration ยิงใส่ Postgres 16 จริง ตาม CLAUDE.md §6
 * ห้าม mock ฐานข้อมูล — ทุกเทสต์ในไฟล์นี้ใช้ dataSource ที่ต่อฐานข้อมูล ems_test จริง
 * ยกเว้นเทสต์เดียวเรื่อง transaction rollback ที่ใส่ repository ปลอมแทน upsertEmployees
 * ซึ่งเป็นการทดสอบ "กฎธุรกิจ" (ขอบเขต transaction ของ service) ตามที่ CLAUDE.md §6 อนุญาต
 * ไม่ใช่การทดสอบพฤติกรรมของ repository เอง — transaction/commit/rollback ที่เกิดขึ้นจริง
 * ยังคงเป็นของ Postgres จริงทั้งหมด
 */

const REAL_FILE_PATH = join(__dirname, '..', '..', 'example_data', 'exam_data.xlsx');

class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}

  now(): Date {
    return this.fixed;
  }
}

interface FixtureRowInput {
  id: unknown;
  name: unknown;
  department: unknown;
  salary: unknown;
  joinDate: unknown;
  status: unknown;
  lastUpdated: unknown;
}

/** สร้างไฟล์ .xlsx ชั่วคราวรูปทรงเดียวกับไฟล์จริง สำหรับกรณีที่ไฟล์จริงไม่มีให้ทดสอบ */
async function writeEmployeeFixture(
  dir: string,
  rows: readonly FixtureRowInput[],
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(EMPLOYEE_SHEET_NAME);
  ws.addRow(['ID', 'Name', 'Department', 'Salary', 'Join Date', 'Status', 'Last Updated Date']);
  for (const row of rows) {
    ws.addRow([
      row.id,
      row.name,
      row.department,
      row.salary,
      row.joinDate,
      row.status,
      row.lastUpdated,
    ]);
  }
  const filePath = join(dir, `fixture-${randomUUID()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

describe('import.service — integration กับ PostgreSQL จริง', () => {
  let dataSource: DataSource;
  let dir: string;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    dir = mkdtempSync(join(tmpdir(), 'ems-import-e2e-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('import ครั้งแรกจากฐานข้อมูลว่าง (ไฟล์ example_data/exam_data.xlsx จริง)', () => {
    it('AC-I01: สร้างพนักงาน 5 แถว และแผนก 4 แถว โดยไม่มีแถวใดถูกข้าม', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      const result = await importFromFile(dataSource, REAL_FILE_PATH, clock);

      expect(result).toEqual({
        created: 5,
        changed: 0,
        unchanged: 0,
        skipped: 0,
        skippedRows: [],
      });

      const departmentRows: unknown[] = await dataSource.query(
        'SELECT name FROM departments ORDER BY name',
      );
      expect(departmentRows.map((row) => readString(row, 'name'))).toEqual([
        'Engineering',
        'HR',
        'Marketing',
        'Sales',
      ]);
    });

    it('AC-I02: salary ของ 101 คือ "65000.00" ไม่ใช่ "65" — string ตรงตาม D7', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const rows: unknown[] = await dataSource.query(
        'SELECT salary FROM employees WHERE id = 101',
      );
      expect(rows).toHaveLength(1);
      expect(readString(rows[0], 'salary')).toBe('65000.00');
    });

    it('AC-I03: join_date ของ 101 คือ 2023-01-15 พอดี ไม่เลื่อนวัน', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const rows: unknown[] = await dataSource.query(
        "SELECT join_date::text AS join_date FROM employees WHERE id = 101",
      );
      expect(readString(rows[0], 'join_date')).toBe('2023-01-15');
    });

    it('AC-I05: is_active ของ 104 คือ false ทั้งที่ไฟล์เขียน "In Active" (กับดักหลักของชุดข้อมูล)', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const rows: unknown[] = await dataSource.query(
        'SELECT is_active FROM employees WHERE id = 104',
      );
      expect(readBoolean(rows[0], 'is_active')).toBe(false);
    });

    it('AC-I06: updated_at ของแถวใหม่มาจาก Last Updated Date ในไฟล์ ไม่ใช่เวลาที่รัน import', async () => {
      // ตั้ง clock.now() ให้ต่างจาก Last Updated Date ในไฟล์อย่างมากโดยเจตนา (D1)
      const clock = new FixedClock(new Date('2030-01-01T00:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const rows: unknown[] = await dataSource.query(
        'SELECT updated_at FROM employees WHERE id = 101',
      );
      expect(readDate(rows[0], 'updated_at').toISOString()).toBe(
        '2026-01-10T00:00:00.000Z',
      );
    });

    it('AC-I07: หลัง setval แล้ว sequence อยู่ที่ 105 — พนักงานถัดไปจะได้ id 106', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const rows: unknown[] = await dataSource.query(
        "SELECT last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'employees_id_seq'",
      );
      expect(rows).toHaveLength(1);
      expect(readNumber(rows[0], 'last_value')).toBe(105);
    });
  });

  describe('AC-I08: import ไฟล์เดิมซ้ำเป็น idempotent', () => {
    it('รันซ้ำด้วยไฟล์เดิมไม่มีแถวเปลี่ยน และ updated_at ไม่ขยับแม้ clock จะเดินหน้าไปมาก', async () => {
      const firstClock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, firstClock);

      const before: unknown[] = await dataSource.query(
        'SELECT id, updated_at FROM employees ORDER BY id',
      );

      // clock เดินหน้าไปมากตั้งใจ เพื่อพิสูจน์ว่าแถวที่ไม่เปลี่ยนจะไม่ได้ค่านี้
      const secondClock = new FixedClock(new Date('2030-06-01T00:00:00.000Z'));
      const result = await importFromFile(dataSource, REAL_FILE_PATH, secondClock);

      expect(result).toEqual({
        created: 0,
        changed: 0,
        unchanged: 5,
        skipped: 0,
        skippedRows: [],
      });

      const after: unknown[] = await dataSource.query(
        'SELECT id, updated_at FROM employees ORDER BY id',
      );
      expect(after).toEqual(before);
    });
  });

  describe('D1: แถวเดิมที่ข้อมูลเปลี่ยนจริงได้ now() ส่วนแถวอื่นไม่ขยับ (AC-I09 style)', () => {
    it('แก้ salary ของ 101 แล้ว import ซ้ำ ได้ salary ใหม่และ updated_at = now ส่วน 102 ไม่ขยับ', async () => {
      const firstClock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, firstClock);

      const before102: unknown[] = await dataSource.query(
        'SELECT updated_at FROM employees WHERE id = 102',
      );

      const changedFixture = await writeEmployeeFixture(dir, [
        {
          id: 101,
          name: 'John Doe',
          department: 'Engineering',
          salary: 70000,
          joinDate: new Date('2023-01-15'),
          status: 'Active',
          lastUpdated: new Date('2026-01-10'),
        },
      ]);

      const secondClock = new FixedClock(new Date('2026-09-20T12:00:00.000Z'));
      const result = await importFromFile(dataSource, changedFixture, secondClock);

      expect(result).toEqual({
        created: 0,
        changed: 1,
        unchanged: 0,
        skipped: 0,
        skippedRows: [],
      });

      const row101: unknown[] = await dataSource.query(
        'SELECT salary, updated_at FROM employees WHERE id = 101',
      );
      expect(readString(row101[0], 'salary')).toBe('70000.00');
      expect(readDate(row101[0], 'updated_at').toISOString()).toBe(
        '2026-09-20T12:00:00.000Z',
      );

      const after102: unknown[] = await dataSource.query(
        'SELECT updated_at FROM employees WHERE id = 102',
      );
      expect(after102).toEqual(before102);
    });
  });

  describe('D12: ตารางแผนกยังว่างตอนเริ่ม import', () => {
    it('สองแถวที่สะกดแผนกต่างกันแต่ normalize แล้วเหมือนกัน ได้แผนกเดียว เก็บการสะกดแรกที่พบ', async () => {
      const fixture = await writeEmployeeFixture(dir, [
        {
          id: 201,
          name: 'Alpha',
          department: 'Design',
          salary: 40000,
          joinDate: new Date('2024-01-01'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        },
        {
          id: 202,
          name: 'Beta',
          department: 'design',
          salary: 41000,
          joinDate: new Date('2024-01-02'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        },
      ]);

      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      const result = await importFromFile(dataSource, fixture, clock);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);

      const departmentRows: unknown[] = await dataSource.query(
        'SELECT name FROM departments',
      );
      expect(departmentRows).toHaveLength(1);
      expect(readString(departmentRows[0], 'name')).toBe('Design');

      const distinctDeptRows: unknown[] = await dataSource.query(
        'SELECT DISTINCT department_id FROM employees',
      );
      expect(distinctDeptRows).toHaveLength(1);
    });
  });

  describe('D12: ตารางแผนกมีข้อมูลแล้วตอนเริ่ม import', () => {
    it('AC-I11: แผนกที่พิมพ์ผิดไม่ตรงกับที่มีอยู่ ถูกข้าม และไม่มีแผนกใหม่เกิดขึ้น', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const fixture = await writeEmployeeFixture(dir, [
        {
          id: 301,
          name: 'Typo Person',
          department: 'Enginering',
          salary: 50000,
          joinDate: new Date('2024-01-01'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        },
      ]);

      const result = await importFromFile(dataSource, fixture, clock);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.skippedRows).toEqual([
        expect.objectContaining({ rowNumber: 2, idDisplay: '301' }),
      ]);

      const countRows: unknown[] = await dataSource.query(
        'SELECT count(*)::int AS count FROM departments',
      );
      expect(readNumber(countRows[0], 'count')).toBe(4);

      const employeeRows: unknown[] = await dataSource.query(
        'SELECT id FROM employees WHERE id = 301',
      );
      expect(employeeRows).toHaveLength(0);
    });

    it('D6: "Hr" จับคู่กับแผนก "HR" ที่มีอยู่แล้ว ไม่สร้างแผนกใหม่ (dedupe ด้วย normalize ไม่ใช่ DISTINCT ดิบ)', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const fixture = await writeEmployeeFixture(dir, [
        {
          id: 302,
          name: 'Casing Person',
          department: 'Hr',
          salary: 50000,
          joinDate: new Date('2024-01-01'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        },
      ]);

      const result = await importFromFile(dataSource, fixture, clock);
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);

      const countRows: unknown[] = await dataSource.query(
        'SELECT count(*)::int AS count FROM departments',
      );
      expect(readNumber(countRows[0], 'count')).toBe(4);

      const joinedRows: unknown[] = await dataSource.query(
        `SELECT d.name AS department_name
         FROM employees e JOIN departments d ON d.id = e.department_id
         WHERE e.id = 302`,
      );
      expect(readString(joinedRows[0], 'department_name')).toBe('HR');
    });
  });

  describe('AC-I15/AC-I16: log ของแถวที่ข้าม และสรุปผล', () => {
    it('รายงานทุกแถวที่ข้าม พร้อมเลขแถว, ID (รวมกรณี ID ว่างและ ID ใช้ไม่ได้), และเหตุผล', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const fixture = await writeEmployeeFixture(dir, [
        {
          id: 401,
          name: 'Good Row',
          department: 'Engineering',
          salary: 40000,
          joinDate: new Date('2024-01-01'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        },
        {
          id: null,
          name: 'No Id',
          department: 'Engineering',
          salary: 40000,
          joinDate: new Date('2024-01-01'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        },
        {
          id: 'abc',
          name: 'Bad Id',
          department: 'Engineering',
          salary: 40000,
          joinDate: new Date('2024-01-01'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        },
        {
          id: 404,
          name: 'Bad Status',
          department: 'Engineering',
          salary: 40000,
          joinDate: new Date('2024-01-01'),
          status: 'Retired',
          lastUpdated: new Date('2026-01-01'),
        },
      ]);

      const result = await importFromFile(dataSource, fixture, clock);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(3);
      expect(result.skippedRows).toEqual([
        expect.objectContaining({ rowNumber: 3, idDisplay: '<empty>' }),
        expect.objectContaining({ rowNumber: 4, idDisplay: '<invalid:"abc">' }),
        expect.objectContaining({ rowNumber: 5, idDisplay: '404' }),
      ]);
      for (const skip of result.skippedRows) {
        expect(skip.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe('AC-I17: ไฟล์ที่มีแถวเสียบางส่วนไม่ล้มทั้งไฟล์', () => {
    it('แถวเสีย 1 จาก 6 แถว อีก 5 แถว commit สำเร็จตามปกติ', async () => {
      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));
      await importFromFile(dataSource, REAL_FILE_PATH, clock);

      const rows: FixtureRowInput[] = [];
      for (let i = 0; i < 5; i += 1) {
        rows.push({
          id: 500 + i,
          name: `Person ${i}`,
          department: 'Engineering',
          salary: 40000 + i,
          joinDate: new Date('2024-01-01'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        });
      }
      rows.push({
        id: 599,
        name: 'Bad Salary',
        department: 'Engineering',
        salary: null,
        joinDate: new Date('2024-01-01'),
        status: 'Active',
        lastUpdated: new Date('2026-01-01'),
      });

      const fixture = await writeEmployeeFixture(dir, rows);
      const result = await importFromFile(dataSource, fixture, clock);

      expect(result.created).toBe(5);
      expect(result.skipped).toBe(1);

      const createdRows: unknown[] = await dataSource.query(
        'SELECT count(*)::int AS count FROM employees WHERE id BETWEEN 500 AND 504',
      );
      expect(readNumber(createdRows[0], 'count')).toBe(5);
    });
  });

  describe('transaction: error ที่ไม่คาดคิดกลางทาง revert ทั้งก้อน', () => {
    it('ถ้า upsertEmployees ล้มเหลว แผนกที่เพิ่งสร้างในรันเดียวกัน (D12) ก็ถูก revert ด้วย', async () => {
      const fixture = await writeEmployeeFixture(dir, [
        {
          id: 601,
          name: 'Never Committed',
          department: 'Brand New Dept',
          salary: 40000,
          joinDate: new Date('2024-01-01'),
          status: 'Active',
          lastUpdated: new Date('2026-01-01'),
        },
      ]);

      const throwingUpsert = async (
        _manager: EntityManager,
        _rows: readonly UpsertEmployeeInput[],
        _now: Date,
      ): Promise<UpsertEmployeeResult[]> => {
        throw new Error('จำลอง error ที่ไม่คาดคิดระหว่างเขียนข้อมูล');
      };

      const clock = new FixedClock(new Date('2026-09-15T08:00:00.000Z'));

      await expect(
        importFromFile(dataSource, fixture, clock, {
          ...defaultImportDependencies,
          upsertEmployees: throwingUpsert,
        }),
      ).rejects.toThrow('จำลอง error ที่ไม่คาดคิดระหว่างเขียนข้อมูล');

      // "Brand New Dept" ถูกสร้างจริงระหว่างรัน (D12 สาขาตารางว่าง) แต่ต้องถูก revert
      // ไปพร้อมกับ transaction ทั้งก้อนเมื่อ upsertEmployees ล้มเหลวในภายหลัง
      const departmentCountRows: unknown[] = await dataSource.query(
        'SELECT count(*)::int AS count FROM departments',
      );
      expect(readNumber(departmentCountRows[0], 'count')).toBe(0);

      const employeeCountRows: unknown[] = await dataSource.query(
        'SELECT count(*)::int AS count FROM employees',
      );
      expect(readNumber(employeeCountRows[0], 'count')).toBe(0);
    });
  });
});
