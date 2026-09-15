import { DataSource } from 'typeorm';
import { createTestDataSource, truncateAll } from './setup-db';
import { readNumber, readString } from './db-row';

/**
 * ตรวจ schema จริงในฐานข้อมูล ไม่ใช่ตรวจ entity ในโค้ด
 *
 * สามข้อนี้เป็น P1 ที่ SPEC.md ติดป้าย [DB] ไว้ว่าต้องเปิดดูฐานข้อมูลเอง
 * เขียนเป็นเทสต์เพราะทำได้ง่ายและจับ schema drift ได้ต่อเนื่อง
 * ดีกว่าการอ่าน \d ด้วยตาครั้งเดียวแล้วไม่มีใครดูอีกเลย
 *
 * ไฟล์นี้ยังทำหน้าที่พิสูจน์ว่าโครงเทสต์ทำงาน คือ migration รันใส่
 * ฐานข้อมูล ems_test ได้ และตัวล้างข้อมูลระหว่างเทสต์ใช้งานได้จริง
 */
describe('schema ของฐานข้อมูล', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
  });

  it('AC-N05: ชนิดคอลัมน์ของ employees ตรงกับ SPEC.md หัวข้อ 2', async () => {
    const rows: unknown[] = await dataSource.query(
      `SELECT column_name, data_type, character_maximum_length,
              numeric_precision, numeric_scale
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'employees'`,
    );
    const byName = new Map<string, unknown>(
      rows.map((row) => [readString(row, 'column_name'), row]),
    );

    expect(readString(byName.get('id'), 'data_type')).toBe('integer');
    expect(readString(byName.get('name'), 'data_type')).toBe('character varying');
    expect(readNumber(byName.get('name'), 'character_maximum_length')).toBe(255);
    expect(readString(byName.get('department_id'), 'data_type')).toBe('integer');
    expect(readString(byName.get('salary'), 'data_type')).toBe('numeric');
    expect(readNumber(byName.get('salary'), 'numeric_precision')).toBe(12);
    expect(readNumber(byName.get('salary'), 'numeric_scale')).toBe(2);
    expect(readString(byName.get('join_date'), 'data_type')).toBe('date');
    expect(readString(byName.get('is_active'), 'data_type')).toBe('boolean');
    expect(readString(byName.get('updated_at'), 'data_type')).toBe(
      'timestamp with time zone',
    );
  });

  it('AC-N09: ทุกคอลัมน์เป็น NOT NULL และไม่มีคอลัมน์นอก spec', async () => {
    const rows: unknown[] = await dataSource.query(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'employees'`,
    );

    const names = rows.map((row) => readString(row, 'column_name')).sort();
    expect(names).toEqual([
      'department_id',
      'id',
      'is_active',
      'join_date',
      'name',
      'salary',
      'updated_at',
    ]);
    for (const row of rows) {
      expect(readString(row, 'is_nullable')).toBe('NO');
    }
  });

  it('AC-N03: index ของ employees ครบตาม SPEC.md หัวข้อ 6.1', async () => {
    const rows: unknown[] = await dataSource.query(
      `SELECT indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'employees'`,
    );
    const definitions = rows.map((row) => readString(row, 'indexdef'));
    // เทียบกับส่วนท้ายเต็ม ๆ ของ indexdef เพื่อให้ยังจับได้ถ้า index ถูกสร้างคนละนิพจน์
    // รูปแบบ lower((name)::text) คือสิ่งที่ Postgres คืนกลับมาจริง ไม่ใช่ lower(name)
    const hasIndexOn = (expression: string): boolean =>
      definitions.some((definition) =>
        definition.endsWith(`USING btree (${expression})`),
      );

    expect(hasIndexOn('department_id')).toBe(true);
    expect(hasIndexOn('is_active')).toBe(true);
    expect(hasIndexOn('join_date')).toBe(true);
    expect(hasIndexOn('salary')).toBe(true);
    expect(hasIndexOn('lower((name)::text)')).toBe(true);
  });

  it('D10: id เป็น identity แบบ BY DEFAULT ไม่ใช่ ALWAYS เพื่อให้ import ระบุ id เองได้', async () => {
    const rows: unknown[] = await dataSource.query(
      `SELECT is_identity, identity_generation
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'employees'
         AND column_name = 'id'`,
    );
    expect(rows).toHaveLength(1);
    expect(readString(rows[0], 'is_identity')).toBe('YES');
    expect(readString(rows[0], 'identity_generation')).toBe('BY DEFAULT');
  });

  it('โครงเทสต์: ล้างข้อมูลระหว่างเทสต์ได้และ sequence ถูกรีเซ็ต', async () => {
    await dataSource.query(
      `INSERT INTO departments (name) VALUES ('Harness Check')`,
    );
    await truncateAll(dataSource);

    const remaining: unknown[] = await dataSource.query(
      'SELECT id FROM departments',
    );
    expect(remaining).toHaveLength(0);

    const inserted: unknown[] = await dataSource.query(
      `INSERT INTO departments (name) VALUES ('After Truncate') RETURNING id`,
    );
    expect(readNumber(inserted[0], 'id')).toBe(1);
    await truncateAll(dataSource);
  });
});
