import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';
import { buildValidationPipe } from '../src/common/validation-pipe';
import { createTestDataSource, resetDepartmentIdentitySequence, truncateAll } from './setup-db';

interface EmployeeFixture {
  id: number;
  name: string;
  departmentId: number;
  salary: string;
  joinDate: string;
  isActive: boolean;
}

/** ตรงกับข้อมูลจริงที่ import จาก example_data/exam_data.xlsx เป๊ะ (ตรวจกับ dev database แล้ว) */
const BASELINE_EMPLOYEES: readonly EmployeeFixture[] = [
  { id: 101, name: 'John Doe', departmentId: 1, salary: '65000.00', joinDate: '2023-01-15', isActive: true },
  { id: 102, name: 'Jane Smith', departmentId: 2, salary: '58000.00', joinDate: '2023-03-22', isActive: true },
  { id: 103, name: 'Alice Wong', departmentId: 3, salary: '45000.00', joinDate: '2024-06-01', isActive: true },
  { id: 104, name: 'Bob Brown', departmentId: 1, salary: '72000.00', joinDate: '2022-11-10', isActive: false },
  { id: 105, name: 'Charlie Day', departmentId: 4, salary: '50000.00', joinDate: '2024-02-19', isActive: true },
];

async function insertEmployee(dataSource: DataSource, employee: EmployeeFixture): Promise<void> {
  await dataSource.query(
    `INSERT INTO employees (id, name, department_id, salary, join_date, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      employee.id,
      employee.name,
      employee.departmentId,
      employee.salary,
      employee.joinDate,
      employee.isActive,
      '2026-01-10T00:00:00.000Z',
    ],
  );
}

async function seedBaseline(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `INSERT INTO departments (id, name) VALUES
      (1, 'Engineering'), (2, 'Marketing'), (3, 'Sales'), (4, 'HR')`,
  );
  await resetDepartmentIdentitySequence(dataSource);
  for (const employee of BASELINE_EMPLOYEES) {
    await insertEmployee(dataSource, employee);
  }
}

describe('Employees HTTP API (S2)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    await seedBaseline(dataSource);
  });

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });

  it('AC-L01 / AC-L25: list เริ่มต้นคืน 5 แถว พร้อม department object และ meta', async () => {
    const response = await request(app.getHttpServer()).get('/api/employees').expect(200);

    expect(response.body.meta).toEqual({ page: 1, page_size: 20, total: 5, total_pages: 1 });
    expect(response.body.data).toHaveLength(5);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 101,
        name: 'John Doe',
        department: { id: 1, name: 'Engineering' },
        salary: '65000.00',
        join_date: '2023-01-15',
        is_active: true,
        updated_at: expect.stringMatching(/Z$/),
      }),
    ]));
    for (const employee of response.body.data) {
      expect(employee).toEqual(expect.objectContaining({
        department: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
        }),
      }));
    }
  });

  it('AC-L14: sort=salary&order=desc เรียง 104, 101, 102, 105, 103', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ sort: 'salary', order: 'desc' })
      .expect(200);

    expect(response.body.data.map((employee: { id: number }) => employee.id)).toEqual([
      104, 101, 102, 105, 103,
    ]);
  });

  it('AC-L16 / D11: เงินเดือนเท่ากันข้ามหน้าต้องไม่ซ้ำหรือหาย และเรียกซ้ำได้ลำดับเดิม', async () => {
    await insertEmployee(dataSource, { id: 106, name: 'Equal One', departmentId: 1, salary: '60000.00', joinDate: '2024-01-01', isActive: true });
    await insertEmployee(dataSource, { id: 107, name: 'Equal Two', departmentId: 1, salary: '60000.00', joinDate: '2024-01-02', isActive: true });

    const pages = await Promise.all(
      [1, 2, 3, 4].map((page) =>
        request(app.getHttpServer())
          .get('/api/employees')
          .query({ sort: 'salary', page_size: 2, page })
          .expect(200),
      ),
    );
    const repeat = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ sort: 'salary', page_size: 2, page: 2 })
      .expect(200);
    const ids = pages.flatMap((response) =>
      response.body.data.map((employee: { id: number }) => employee.id),
    );

    expect(ids).toEqual([103, 105, 102, 106, 107, 101, 104]);
    expect(new Set(ids).size).toBe(7);
    expect(pages[1]?.body.data).toEqual(repeat.body.data);
  });

  it('AC-L21: sort ที่อยู่นอก whitelist ถูกปฏิเสธ และ employees ยังอยู่ครบ', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ sort: 'id;DROP TABLE employees' })
      .expect(400);

    expect(response.body).toEqual({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    });

    const rows: unknown[] = await dataSource.query('SELECT id FROM employees ORDER BY id');
    expect(rows).toHaveLength(5);
  });

  it('AC-E01: GET employee 101 คืนข้อมูลครบตาม contract', async () => {
    const response = await request(app.getHttpServer()).get('/api/employees/101').expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      id: 101,
      name: 'John Doe',
      department: { id: 1, name: 'Engineering' },
      salary: '65000.00',
      join_date: '2023-01-15',
      is_active: true,
      updated_at: expect.stringMatching(/Z$/),
    }));
  });

  it('AC-E02: GET employee ที่ไม่มีอยู่ตอบ 404 NOT_FOUND', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees/999')
      .expect(404);

    expect(response.body).toEqual({
      error: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
  });

  it('AC-N04: 25 แถว, page_size 10, page 3 ได้ meta ถูกและเหลือ 5 แถว', async () => {
    for (let id = 106; id <= 125; id += 1) {
      await insertEmployee(dataSource, {
        id,
        name: `Person ${id}`,
        departmentId: 1,
        salary: '40000.00',
        joinDate: '2024-01-01',
        isActive: true,
      });
    }

    const pages = await Promise.all(
      [1, 2, 3].map((page) =>
        request(app.getHttpServer())
          .get('/api/employees')
          .query({ page_size: 10, page })
          .expect(200),
      ),
    );
    const ids = pages.flatMap((response) =>
      response.body.data.map((employee: { id: number }) => employee.id),
    );

    expect(pages[2]?.body.meta).toEqual({ page: 3, page_size: 10, total: 25, total_pages: 3 });
    expect(pages.map((response) => response.body.data.length)).toEqual([10, 10, 5]);
    expect(ids).toHaveLength(25);
    expect(new Set(ids).size).toBe(25);
  });

  it('AC-L17: page เกินหน้าสุดท้ายตอบ 200 พร้อม data ว่าง', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ page: 99 })
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  it('AC-L18 / AC-L19: page และ page_size ที่อยู่นอกช่วงถูกปฏิเสธ', async () => {
    for (const query of [{ page_size: 101 }, { page_size: 0 }, { page: 0 }]) {
      const response = await request(app.getHttpServer())
        .get('/api/employees')
        .query(query)
        .expect(400);

      expect(response.body).toEqual({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      });
    }
  });

  it('AC-L02: q=jo พบ John Doe ในผลลัพธ์', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ q: 'jo' })
      .expect(200);

    const names = response.body.data.map((employee: { name: string }) => employee.name);
    expect(names).toContain('John Doe');
  });

  it('AC-L03: q=JOHN และ q=john ได้ผลลัพธ์ชุดเดียวกัน (ไม่สนตัวพิมพ์เล็กใหญ่)', async () => {
    const upper = await request(app.getHttpServer()).get('/api/employees').query({ q: 'JOHN' }).expect(200);
    const lower = await request(app.getHttpServer()).get('/api/employees').query({ q: 'john' }).expect(200);

    const upperIds = upper.body.data.map((employee: { id: number }) => employee.id).sort();
    const lowerIds = lower.body.data.map((employee: { id: number }) => employee.id).sort();
    expect(upperIds).toEqual(lowerIds);
    expect(upperIds).toContain(101);
  });

  it('AC-L04: q ที่มีช่องว่างหัวท้ายถูกตัดก่อนค้นหา', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ q: '  jo  ' })
      .expect(200);

    const names = response.body.data.map((employee: { name: string }) => employee.name);
    expect(names).toContain('John Doe');
  });

  it('AC-L05: q ว่างเท่ากับไม่ได้ส่ง ได้ครบ 5 แถว', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ q: '' })
      .expect(200);

    expect(response.body.meta.total).toBe(5);
  });

  it('AC-L06: q=engineering ไม่เจอ เพราะค้นจาก name เท่านั้น ไม่ใช่ชื่อแผนก', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ q: 'engineering' })
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  it('AC-L07: department_id=Engineering ได้ 101 และ 104', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ department_id: 1 })
      .expect(200);

    const ids = response.body.data
      .map((employee: { id: number }) => employee.id)
      .sort((a: number, b: number) => a - b);
    expect(ids).toEqual([101, 104]);
  });

  it('AC-L08: is_active=false ได้เฉพาะ 104', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ is_active: 'false' })
      .expect(200);

    expect(response.body.data.map((employee: { id: number }) => employee.id)).toEqual([104]);
  });

  it('AC-L09: ไม่ส่ง is_active ได้ทั้ง active และ inactive ปนกัน', async () => {
    const response = await request(app.getHttpServer()).get('/api/employees').expect(200);

    const statuses = new Set(
      response.body.data.map((employee: { is_active: boolean }) => employee.is_active),
    );
    expect(statuses.has(true)).toBe(true);
    expect(statuses.has(false)).toBe(true);
  });

  it('AC-L10: salary_min/salary_max รวมค่าขอบทั้งสองด้าน ได้ 101, 102, 105', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ salary_min: '50000', salary_max: '65000' })
      .expect(200);

    const ids = response.body.data
      .map((employee: { id: number }) => employee.id)
      .sort((a: number, b: number) => a - b);
    expect(ids).toEqual([101, 102, 105]);
  });

  it('AC-L11: join_date_from ได้ 103 และ 105', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ join_date_from: '2024-01-01' })
      .expect(200);

    const ids = response.body.data
      .map((employee: { id: number }) => employee.id)
      .sort((a: number, b: number) => a - b);
    expect(ids).toEqual([103, 105]);
  });

  it('AC-L12: join_date_to รวมวันที่ระบุด้วย ได้ 101 และ 104', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ join_date_to: '2023-01-15' })
      .expect(200);

    const ids = response.body.data
      .map((employee: { id: number }) => employee.id)
      .sort((a: number, b: number) => a - b);
    expect(ids).toEqual([101, 104]);
  });

  it('AC-L13: รวมหลายเงื่อนไขเข้าด้วยกันแบบ AND ได้เฉพาะ 101', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ department_id: 1, is_active: 'true', salary_min: '60000' })
      .expect(200);

    expect(response.body.data.map((employee: { id: number }) => employee.id)).toEqual([101]);
  });

  it('AC-L20: query parameter สะกดผิดตอบ 400 ไม่ใช่ข้อมูลครบทุกแถว', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ deparment_id: 1 })
      .expect(400);

    expect(response.body).toEqual({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    });
  });

  it('AC-L24: is_active ที่ไม่ใช่ true/false ตรง ๆ ตอบ 400', async () => {
    for (const value of ['1', 'yes']) {
      const response = await request(app.getHttpServer())
        .get('/api/employees')
        .query({ is_active: value })
        .expect(400);

      expect(response.body).toEqual({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      });
    }
  });

  it('AC-L22: salary_min มากกว่า salary_max ตอบ 400 VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ salary_min: '70000', salary_max: '50000' })
      .expect(400);

    expect(response.body).toEqual({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    });
  });

  it('AC-L23: join_date_from มากกว่า join_date_to ตอบ 400 VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ join_date_from: '2024-12-31', join_date_to: '2024-01-01' })
      .expect(400);

    expect(response.body).toEqual({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    });
  });

  it('join_date_from รูปแบบถูกแต่ไม่ใช่วันจริงตามปฏิทิน (30 ก.พ.) ตอบ 400 ไม่ใช่ 500', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ join_date_from: '2023-02-30' })
      .expect(400);

    expect(response.body).toEqual({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    });
  });

  describe('POST /api/employees', () => {
    it('AC-E03: ข้อมูลถูกต้องครบได้ 201 พร้อม Location และ id ที่ระบบกำหนด', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Dana Lee', department_id: 1, salary: '61000.00', join_date: '2026-09-01', is_active: true })
        .expect(201);

      expect(response.headers.location).toBe(`/api/employees/${response.body.id}`);
      expect(response.body.id).toBeGreaterThan(0);
      expect(response.body.name).toBe('Dana Lee');
    });

    it('AC-E04: ไม่ส่ง is_active ได้ is_active = true', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'No Status', department_id: 1, salary: '50000.00', join_date: '2026-01-01' })
        .expect(201);

      expect(response.body.is_active).toBe(true);
    });

    it('AC-V01: name ว่างหรือช่องว่างล้วนตอบ 400', async () => {
      for (const name of ['', '   ']) {
        const response = await request(app.getHttpServer())
          .post('/api/employees')
          .send({ name, department_id: 1, salary: '50000.00', join_date: '2026-01-01' })
          .expect(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('AC-V02: name ยาวเกิน 255 ตัวอักษรตอบ 400 rule length', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'A'.repeat(256), department_id: 1, salary: '50000.00', join_date: '2026-01-01' })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name', rule: 'length' })]),
      );
    });

    it('AC-V03: name มีช่องว่างหัวท้ายถูกตัดก่อนบันทึก', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: '  John  ', department_id: 1, salary: '50000.00', join_date: '2026-01-01' })
        .expect(201);

      expect(response.body.name).toBe('John');
    });

    it('AC-V04: department_id ที่ไม่มีอยู่จริงตอบ 400 rule not_found ไม่ใช่ 500', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Ghost', department_id: 9999, salary: '50000.00', join_date: '2026-01-01' })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'department_id', rule: 'not_found' })]),
      );
    });

    it('AC-V05: salary มีคอมมาคั่นหลักตอบ 400 rule format ไม่ใช่ตีความเป็น 65', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Comma', department_id: 1, salary: '65,000.00', join_date: '2026-01-01' })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'salary', rule: 'format' })]),
      );
    });

    it('AC-V06: salary ทศนิยมเกิน 2 ตำแหน่งตอบ 400 rule max_scale', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Scale', department_id: 1, salary: '65000.999', join_date: '2026-01-01' })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'salary', rule: 'max_scale' })]),
      );
    });

    it('AC-V07: salary ติดลบตอบ 400', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Negative', department_id: 1, salary: '-1', join_date: '2026-01-01' })
        .expect(400);
    });

    it('AC-V08: salary เกิน DECIMAL(12,2) ตอบ 400 rule range ไม่ใช่ error จากฐานข้อมูล', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Huge', department_id: 1, salary: '10000000000.00', join_date: '2026-01-01' })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'salary', rule: 'range' })]),
      );
    });

    it('AC-V09: salary เป็น 0 สำเร็จ เพราะไม่มีขั้นต่ำเชิงธุรกิจ', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Zero', department_id: 1, salary: '0', join_date: '2026-01-01' })
        .expect(201);
    });

    it('AC-V10: salary มีสัญลักษณ์สกุลเงินตอบ 400', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Dollar', department_id: 1, salary: '$65000', join_date: '2026-01-01' })
        .expect(400);
    });

    it('AC-V11: join_date รูปแบบถูกแต่ไม่ใช่วันจริงตามปฏิทินตอบ 400', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'BadDate', department_id: 1, salary: '50000.00', join_date: '2023-02-30' })
        .expect(400);
    });

    it('AC-V12: join_date รูปแบบผิดตอบ 400', async () => {
      for (const join_date of ['15-Jan-23', '01/15/2023']) {
        await request(app.getHttpServer())
          .post('/api/employees')
          .send({ name: 'Format', department_id: 1, salary: '50000.00', join_date })
          .expect(400);
      }
    });

    it('AC-V13: join_date ก่อน 1900-01-01 ตอบ 400', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Old', department_id: 1, salary: '50000.00', join_date: '1899-12-31' })
        .expect(400);
    });

    it('AC-V14: join_date เป็นวันในอนาคตสำเร็จ', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Future', department_id: 1, salary: '50000.00', join_date: '2099-01-01' })
        .expect(201);
    });

    it('AC-V15/V16: is_active เป็น string ("true" หรือ "Active") ตอบ 400', async () => {
      for (const is_active of ['true', 'Active']) {
        await request(app.getHttpServer())
          .post('/api/employees')
          .send({ name: 'BoolType', department_id: 1, salary: '50000.00', join_date: '2026-01-01', is_active })
          .expect(400);
      }
    });

    it('AC-V17: error body ตรงตามรูปแบบ §4.1', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: '', department_id: 1, salary: '50000.00', join_date: '2026-01-01' })
        .expect(400);

      expect(response.body).toEqual({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: expect.any(String),
              rule: expect.any(String),
              message: expect.any(String),
            }),
          ]),
        }),
      });
    });

    it('AC-V18: ส่งหลายช่องผิดพร้อมกัน รายงานครบทุกช่องที่ผิด', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: '', department_id: 9999, salary: '65,000.00', join_date: '15-Jan-23' })
        .expect(400);

      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toEqual(expect.arrayContaining(['name', 'department_id', 'salary', 'join_date']));
    });

    it('AC-V19: ยิงข้อมูลผิดตรงเข้า API (จำลองการปิด validation ฝั่ง FE) ยังถูกปฏิเสธ', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: '', department_id: 1, salary: '50000.00', join_date: '2026-01-01' })
        .expect(400);
    });

    it('AC-E06: มี id อยู่ใน body ตอบ 400', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ id: 999, name: 'X', department_id: 1, salary: '50000.00', join_date: '2026-01-01' })
        .expect(400);
    });

    it('AC-E07: มี updated_at อยู่ใน body ตอบ 400', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({
          name: 'X',
          department_id: 1,
          salary: '50000.00',
          join_date: '2026-01-01',
          updated_at: '2026-01-01T00:00:00Z',
        })
        .expect(400);
    });

    it('AC-E08: field แปลกปลอมที่ไม่รู้จักตอบ 400', async () => {
      await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'X', department_id: 1, salary: '50000.00', join_date: '2026-01-01', email: 'x@x.com' })
        .expect(400);
    });

    it('AC-N06/AC-N07: salary เป็น string ใน JSON และแม่นยำแม้มีเศษสตางค์', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/employees')
        .send({ name: 'Precise', department_id: 1, salary: '65000.10', join_date: '2026-01-01' })
        .expect(201);

      expect(typeof response.body.salary).toBe('string');
      expect(response.body.salary).toBe('65000.10');

      const fetched = await request(app.getHttpServer())
        .get(`/api/employees/${response.body.id}`)
        .expect(200);
      expect(fetched.body.salary).toBe('65000.10');
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('AC-E05: ไม่ส่ง is_active ตอบ 400 เพราะ PUT แทนค่าทั้งชุดตาม D8', async () => {
      await request(app.getHttpServer())
        .put('/api/employees/101')
        .send({ name: 'John Doe', department_id: 1, salary: '65000.00', join_date: '2023-01-15' })
        .expect(400);
    });

    it('AC-U01/AC-U03: แก้ salary แล้ว updated_at เปลี่ยนเป็นเวลาปัจจุบัน ไม่ถอยหลัง', async () => {
      const before = (await request(app.getHttpServer()).get('/api/employees/101').expect(200)).body;

      const response = await request(app.getHttpServer())
        .put('/api/employees/101')
        .send({ name: 'John Doe', department_id: 1, salary: '70000.00', join_date: '2023-01-15', is_active: true })
        .expect(200);

      expect(response.body.salary).toBe('70000.00');
      expect(response.body.updated_at).not.toBe(before.updated_at);
      expect(new Date(response.body.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(before.updated_at).getTime(),
      );
    });

    it('AC-U02: ส่งค่าเดิมกลับมาทุกช่อง updated_at ไม่เปลี่ยน', async () => {
      const before = (await request(app.getHttpServer()).get('/api/employees/102').expect(200)).body;

      const response = await request(app.getHttpServer())
        .put('/api/employees/102')
        .send({
          name: before.name,
          department_id: before.department.id,
          salary: before.salary,
          join_date: before.join_date,
          is_active: before.is_active,
        })
        .expect(200);

      expect(response.body.updated_at).toBe(before.updated_at);
    });

    it('AC-U04: แก้เฉพาะ is_active updated_at เปลี่ยน', async () => {
      const before = (await request(app.getHttpServer()).get('/api/employees/105').expect(200)).body;

      const response = await request(app.getHttpServer())
        .put('/api/employees/105')
        .send({
          name: before.name,
          department_id: before.department.id,
          salary: before.salary,
          join_date: before.join_date,
          is_active: false,
        })
        .expect(200);

      expect(response.body.is_active).toBe(false);
      expect(response.body.updated_at).not.toBe(before.updated_at);
    });

    it('AC-U05: updated_at ที่ส่งออกอยู่ในรูป ISO-8601 ลงท้าย Z', async () => {
      const response = await request(app.getHttpServer()).get('/api/employees/101').expect(200);
      expect(response.body.updated_at).toEqual(expect.stringMatching(/Z$/));
    });

    it('AC-E13: ตั้ง is_active = false ผ่าน PUT แถวยังอยู่และปรากฏใน GET ที่ไม่กรองสถานะ', async () => {
      const before = (await request(app.getHttpServer()).get('/api/employees/103').expect(200)).body;
      await request(app.getHttpServer())
        .put('/api/employees/103')
        .send({
          name: before.name,
          department_id: before.department.id,
          salary: before.salary,
          join_date: before.join_date,
          is_active: false,
        })
        .expect(200);

      const list = await request(app.getHttpServer()).get('/api/employees').expect(200);
      expect(list.body.data.map((employee: { id: number }) => employee.id)).toContain(103);
    });

    it('PUT ที่ id ไม่มีอยู่จริงตอบ 404', async () => {
      await request(app.getHttpServer())
        .put('/api/employees/999')
        .send({ name: 'X', department_id: 1, salary: '50000.00', join_date: '2026-01-01', is_active: true })
        .expect(404);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('AC-E09/AC-E11: ลบแล้ว GET ตอบ 404 และ meta.total เหลือ 4', async () => {
      await request(app.getHttpServer()).delete('/api/employees/103').expect(204);
      await request(app.getHttpServer()).get('/api/employees/103').expect(404);

      const list = await request(app.getHttpServer()).get('/api/employees').expect(200);
      expect(list.body.meta.total).toBe(4);
    });

    it('AC-E10: ลบซ้ำครั้งที่สองตอบ 404', async () => {
      await request(app.getHttpServer()).delete('/api/employees/103').expect(204);
      await request(app.getHttpServer()).delete('/api/employees/103').expect(404);
    });
  });
});
