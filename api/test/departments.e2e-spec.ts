import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';
import { buildValidationPipe } from '../src/common/validation-pipe';
import { createTestDataSource, truncateAll } from './setup-db';

interface EmployeeFixture {
  id: number;
  name: string;
  departmentId: number;
  salary: string;
  joinDate: string;
  isActive: boolean;
}

/**
 * เหมือนกับ baseline ของ employees.e2e-spec.ts — Engineering มี 2 คน ที่เหลืออย่างละ 1 ตรงกับ AC-D02
 * ตรงกับข้อมูลจริงที่ import จาก example_data/exam_data.xlsx เป๊ะ (ตรวจกับ dev database แล้ว)
 */
const BASELINE_EMPLOYEES: readonly EmployeeFixture[] = [
  { id: 101, name: 'John Doe', departmentId: 1, salary: '65000.00', joinDate: '2023-01-15', isActive: true },
  { id: 102, name: 'Jane Smith', departmentId: 2, salary: '58000.00', joinDate: '2023-03-22', isActive: true },
  { id: 103, name: 'Alice Wong', departmentId: 3, salary: '45000.00', joinDate: '2024-06-01', isActive: true },
  { id: 104, name: 'Bob Brown', departmentId: 1, salary: '72000.00', joinDate: '2022-11-10', isActive: false },
  { id: 105, name: 'Charlie Day', departmentId: 4, salary: '50000.00', joinDate: '2024-02-19', isActive: true },
];

async function seedBaseline(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `INSERT INTO departments (id, name) VALUES
      (1, 'Engineering'), (2, 'Marketing'), (3, 'Sales'), (4, 'HR')`,
  );
  for (const employee of BASELINE_EMPLOYEES) {
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
}

describe('Departments HTTP API', () => {
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

  it('AC-D01: GET /api/departments คืน 4 แผนกเรียงตามชื่อ ไม่มีการแบ่งหน้า', async () => {
    const response = await request(app.getHttpServer()).get('/api/departments').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(4);
    expect(
      (response.body as { name: string }[]).map((department) => department.name),
    ).toEqual(['Engineering', 'HR', 'Marketing', 'Sales']);
    for (const department of response.body as { id: number; name: string }[]) {
      expect(typeof department.id).toBe('number');
    }
  });

  it('AC-D02: ทุกแถวมี employee_count ตรงกับจำนวนพนักงานจริง', async () => {
    const response = await request(app.getHttpServer()).get('/api/departments').expect(200);

    const countByName = new Map(
      (response.body as { name: string; employee_count: number }[]).map((department) => [
        department.name,
        department.employee_count,
      ]),
    );
    expect(countByName.get('Engineering')).toBe(2);
    expect(countByName.get('Marketing')).toBe(1);
    expect(countByName.get('Sales')).toBe(1);
    expect(countByName.get('HR')).toBe(1);
  });
});
