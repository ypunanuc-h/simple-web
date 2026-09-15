import { filterDepartmentsByName } from './filter-departments';
import type { Department } from '../../lib/api-client';

const DEPARTMENTS: readonly Department[] = [
  { id: 1, name: 'Engineering', employee_count: 2 },
  { id: 2, name: 'Marketing', employee_count: 1 },
  { id: 3, name: 'Sales', employee_count: 1 },
  { id: 4, name: 'HR', employee_count: 1 },
];

describe('filterDepartmentsByName', () => {
  it('query ว่างได้ทุกแผนกกลับมาครบ', () => {
    expect(filterDepartmentsByName(DEPARTMENTS, '')).toEqual(DEPARTMENTS);
  });

  it('query เป็นช่องว่างล้วนหลังตัดถือว่าไม่ได้กรอง ได้ทุกแผนกกลับมาครบ', () => {
    expect(filterDepartmentsByName(DEPARTMENTS, '   ')).toEqual(DEPARTMENTS);
  });

  it('ตัดช่องว่างหัวท้ายก่อนค้นหา', () => {
    expect(filterDepartmentsByName(DEPARTMENTS, '  eng  ')).toEqual([DEPARTMENTS[0]]);
  });

  it('ไม่สนตัวพิมพ์เล็กใหญ่', () => {
    expect(filterDepartmentsByName(DEPARTMENTS, 'ENGINEERING')).toEqual([DEPARTMENTS[0]]);
    expect(filterDepartmentsByName(DEPARTMENTS, 'engineering')).toEqual([DEPARTMENTS[0]]);
  });

  it('แมตช์แบบ partial ตรงกลางคำก็ได้', () => {
    expect(filterDepartmentsByName(DEPARTMENTS, 'ar')).toEqual([DEPARTMENTS[1]]);
  });

  it('ไม่พบที่ตรงกันได้ array ว่าง', () => {
    expect(filterDepartmentsByName(DEPARTMENTS, 'zzz')).toEqual([]);
  });

  it('list ว่างตั้งแต่ต้น ได้ array ว่างเสมอไม่ว่า query จะเป็นอะไร', () => {
    expect(filterDepartmentsByName([], 'eng')).toEqual([]);
  });
});
