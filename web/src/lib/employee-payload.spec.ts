import { buildEmployeePayload, type EmployeeFormValues } from './employee-payload';

const BASE_VALUES: EmployeeFormValues = {
  name: 'Dana Lee',
  departmentId: '3',
  salary: '61000.00',
  joinDate: '2026-09-01',
  isActive: true,
};

describe('buildEmployeePayload', () => {
  it('แปลงค่าจากฟอร์มเป็น request body ครบทุกฟิลด์', () => {
    expect(buildEmployeePayload(BASE_VALUES)).toEqual({
      name: 'Dana Lee',
      department_id: 3,
      salary: '61000.00',
      join_date: '2026-09-01',
      is_active: true,
    });
  });

  it('ตัดช่องว่างหัวท้ายของ name ก่อนส่ง', () => {
    const payload = buildEmployeePayload({ ...BASE_VALUES, name: '  Dana Lee  ' });
    expect(payload.name).toBe('Dana Lee');
  });

  it('D7: salary เป็น string เดิมเป๊ะ ไม่ถูกแปลงผ่าน number', () => {
    const payload = buildEmployeePayload({ ...BASE_VALUES, salary: '100000000.10' });
    expect(payload.salary).toBe('100000000.10');
    expect(typeof payload.salary).toBe('string');
  });

  it('แปลง departmentId จาก string ของ dropdown เป็น number', () => {
    const payload = buildEmployeePayload({ ...BASE_VALUES, departmentId: '12' });
    expect(payload.department_id).toBe(12);
    expect(typeof payload.department_id).toBe('number');
  });

  it('is_active ตรงจาก checkbox ทั้งสองค่า', () => {
    expect(buildEmployeePayload({ ...BASE_VALUES, isActive: true }).is_active).toBe(true);
    expect(buildEmployeePayload({ ...BASE_VALUES, isActive: false }).is_active).toBe(false);
  });

  it('D10: ผลลัพธ์ไม่มี field id ปนมาไม่ว่าจะสร้างหรือแก้ไข', () => {
    const payload = buildEmployeePayload(BASE_VALUES);
    expect(Object.keys(payload)).not.toContain('id');
  });
});
