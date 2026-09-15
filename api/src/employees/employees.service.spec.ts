import { createEmployeeListCommand } from './employees.service';

describe('createEmployeeListCommand', () => {
  it('AC-L16 / D11: salary desc ต้องต่อ id ASC เพื่อให้การแบ่งหน้าคงที่', () => {
    expect(
      createEmployeeListCommand({ sort: 'salary', order: 'desc', page: 2, pageSize: 2 }),
    ).toEqual({
      sort: 'salary',
      order: 'desc',
      page: 2,
      pageSize: 2,
      orderBy: ['salary', 'desc', 'id', 'asc'],
    });
  });

  it('AC-L01: เมื่อไม่ส่ง query ใช้ id asc, page 1 และ page_size 20', () => {
    expect(createEmployeeListCommand({})).toEqual({
      sort: 'id',
      order: 'asc',
      page: 1,
      pageSize: 20,
      orderBy: ['id', 'asc'],
    });
  });

  it('AC-L04: q ถูกตัดช่องว่างหัวท้ายก่อนใช้', () => {
    expect(createEmployeeListCommand({ q: '  jo  ' }).q).toBe('jo');
  });

  it('AC-L05: q ที่เป็นช่องว่างล้วนหลังตัดถือว่าไม่ได้ส่ง', () => {
    expect(createEmployeeListCommand({ q: '   ' }).q).toBeUndefined();
    expect(createEmployeeListCommand({ q: '' }).q).toBeUndefined();
  });

  it('AC-L07–L13: filter field อื่นที่ DTO ตรวจ/แปลงชนิดมาแล้วถูกส่งต่อเข้า command ตรง ๆ', () => {
    const command = createEmployeeListCommand({
      departmentId: 1,
      isActive: true,
      joinDateFrom: '2024-01-01',
      joinDateTo: '2024-12-31',
      salaryMin: '50000.00',
      salaryMax: '65000.00',
    });

    expect(command).toMatchObject({
      departmentId: 1,
      isActive: true,
      joinDateFrom: '2024-01-01',
      joinDateTo: '2024-12-31',
      salaryMin: '50000.00',
      salaryMax: '65000.00',
    });
  });
});
