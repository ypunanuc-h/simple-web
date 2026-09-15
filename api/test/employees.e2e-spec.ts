import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';
import { createTestDataSource, truncateAll } from './setup-db';

interface EmployeeFixture {
  id: number;
  name: string;
  departmentId: number;
  salary: string;
  joinDate: string;
  isActive: boolean;
}

const BASELINE_EMPLOYEES: readonly EmployeeFixture[] = [
  { id: 101, name: 'John Doe', departmentId: 1, salary: '65000.00', joinDate: '2023-01-15', isActive: true },
  { id: 102, name: 'Jane Smith', departmentId: 2, salary: '58000.00', joinDate: '2022-06-01', isActive: true },
  { id: 103, name: 'Bob Johnson', departmentId: 3, salary: '45000.00', joinDate: '2024-03-20', isActive: true },
  { id: 104, name: 'Alice Williams', departmentId: 1, salary: '72000.00', joinDate: '2023-01-15', isActive: false },
  { id: 105, name: 'Charlie Brown', departmentId: 4, salary: '50000.00', joinDate: '2025-12-05', isActive: true },
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
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
});
