import { hasEmployeeDataChanged, type EmployeeSnapshot } from './employee-diff';

const BASE: EmployeeSnapshot = {
  name: 'John Doe',
  departmentId: 1,
  salary: '65000.00',
  joinDate: '2023-01-15',
  isActive: true,
};

describe('hasEmployeeDataChanged', () => {
  it('AC-U02: ค่าเหมือนเดิมทุกฟิลด์ถือว่าไม่เปลี่ยน', () => {
    expect(hasEmployeeDataChanged(BASE, { ...BASE })).toBe(false);
  });

  it('AC-U03: salary เปลี่ยนถือว่าเปลี่ยน', () => {
    expect(hasEmployeeDataChanged(BASE, { ...BASE, salary: '70000.00' })).toBe(true);
  });

  it('AC-U04: is_active เปลี่ยนถือว่าเปลี่ยน', () => {
    expect(hasEmployeeDataChanged(BASE, { ...BASE, isActive: false })).toBe(true);
  });

  it('name เปลี่ยนถือว่าเปลี่ยน', () => {
    expect(hasEmployeeDataChanged(BASE, { ...BASE, name: 'Jane Doe' })).toBe(true);
  });

  it('departmentId เปลี่ยนถือว่าเปลี่ยน', () => {
    expect(hasEmployeeDataChanged(BASE, { ...BASE, departmentId: 2 })).toBe(true);
  });

  it('joinDate เปลี่ยนถือว่าเปลี่ยน', () => {
    expect(hasEmployeeDataChanged(BASE, { ...BASE, joinDate: '2024-01-01' })).toBe(true);
  });
});
