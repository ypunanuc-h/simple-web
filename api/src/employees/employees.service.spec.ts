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
});
