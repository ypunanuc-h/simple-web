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
  await resetDepartmentIdentitySequence(dataSource);
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

  it('AC-D03: POST สร้างแผนกใหม่สำเร็จ และปรากฏใน GET /api/departments ทันที', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/departments')
      .send({ name: 'Finance' })
      .expect(201);
    expect(created.body).toMatchObject({ name: 'Finance', employee_count: 0 });
    expect(typeof created.body.id).toBe('number');

    const list = await request(app.getHttpServer()).get('/api/departments').expect(200);
    expect((list.body as { name: string }[]).map((d) => d.name)).toContain('Finance');
  });

  it('AC-D04: POST ชื่อซ้ำแบบต่างตัวพิมพ์ ("engineering") ตอบ 409 DUPLICATE_NAME', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/departments')
      .send({ name: 'engineering' })
      .expect(409);
    expect(response.body.error.code).toBe('DUPLICATE_NAME');
  });

  it('AC-D05: POST ชื่อที่ normalize แล้วชนกัน ("Engi neering") ตอบ 409 DUPLICATE_NAME', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/departments')
      .send({ name: 'Engi neering' })
      .expect(409);
    expect(response.body.error.code).toBe('DUPLICATE_NAME');
  });

  it('AC-D06: POST ชื่อมีช่องว่างหัวท้าย เก็บแบบตัดช่องว่างแล้ว ไม่แปลงเป็นตัวพิมพ์เล็ก', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/departments')
      .send({ name: '  Finance  ' })
      .expect(201);
    expect(response.body.name).toBe('Finance');
  });

  it('AC-D07: POST ชื่อมีช่องว่างตรงกลาง เก็บช่องว่างภายในไว้ครบ', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/departments')
      .send({ name: 'Data Science' })
      .expect(201);
    expect(response.body.name).toBe('Data Science');
  });

  it('AC-D08: DELETE แผนกที่ยังมีพนักงานอ้างอยู่ ตอบ 409 DEPARTMENT_IN_USE พร้อมจำนวนพนักงาน', async () => {
    const response = await request(app.getHttpServer()).delete('/api/departments/1').expect(409);
    expect(response.body.error.code).toBe('DEPARTMENT_IN_USE');
    expect(response.body.error.details).toEqual([
      { field: 'id', rule: 'in_use', message: 'employee_count = 2' },
    ]);
  });

  it('AC-D09: หลัง DELETE ที่ถูกปฏิเสธ พนักงานและแผนกยังอยู่ครบ', async () => {
    await request(app.getHttpServer()).delete('/api/departments/1').expect(409);

    await request(app.getHttpServer()).get('/api/employees/101').expect(200);
    await request(app.getHttpServer()).get('/api/employees/104').expect(200);
    const list = await request(app.getHttpServer()).get('/api/departments').expect(200);
    expect((list.body as { name: string }[]).map((d) => d.name)).toContain('Engineering');
  });

  it('AC-D10: ย้ายพนักงานออกจากแผนกจนหมดแล้ว DELETE สำเร็จ', async () => {
    for (const employee of BASELINE_EMPLOYEES.filter((e) => e.departmentId === 1)) {
      await request(app.getHttpServer())
        .put(`/api/employees/${employee.id}`)
        .send({
          name: employee.name,
          department_id: 2,
          salary: employee.salary,
          join_date: employee.joinDate,
          is_active: employee.isActive,
        })
        .expect(200);
    }

    await request(app.getHttpServer()).delete('/api/departments/1').expect(204);
  });

  it('AC-D11: DELETE แผนกที่ไม่มีอยู่ ตอบ 404 NOT_FOUND', async () => {
    const response = await request(app.getHttpServer()).delete('/api/departments/999').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('AC-D12: PUT เปลี่ยนชื่อเป็นชื่อที่ normalize แล้วชนแผนกอื่น ตอบ 409 DUPLICATE_NAME', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/departments/2')
      .send({ name: 'engineering' })
      .expect(409);
    expect(response.body.error.code).toBe('DUPLICATE_NAME');
  });

  it('AC-D13: PUT เปลี่ยนชื่อเป็นชื่อเดิมของตัวเอง ตอบ 200 ไม่ใช่ 409', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/departments/1')
      .send({ name: 'Engineering' })
      .expect(200);
    expect(response.body.name).toBe('Engineering');
  });

  it('AC-D14: เปลี่ยนชื่อแผนกแล้ว GET /api/employees แสดงชื่อใหม่ทันทีโดยไม่ต้องแก้พนักงาน', async () => {
    await request(app.getHttpServer())
      .put('/api/departments/1')
      .send({ name: 'Engineering Team' })
      .expect(200);

    const response = await request(app.getHttpServer()).get('/api/employees/101').expect(200);
    expect(response.body.department).toEqual({ id: 1, name: 'Engineering Team' });
  });
});
