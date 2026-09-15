import { findDuplicateDepartment, type DepartmentNameCandidate } from './duplicate-name';

const EXISTING: readonly DepartmentNameCandidate[] = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Marketing' },
  { id: 3, name: 'Sales' },
  { id: 4, name: 'HR' },
];

describe('findDuplicateDepartment', () => {
  it('AC-D04: ชื่อซ้ำแบบต่างตัวพิมพ์ ("engineering" ชน "Engineering") ถือว่าซ้ำ', () => {
    expect(findDuplicateDepartment(EXISTING, 'engineering')).toEqual({ id: 1, name: 'Engineering' });
  });

  it('AC-D05: ชื่อซ้ำหลังตัดช่องว่างภายใน ("Engi neering" ชน "Engineering") ถือว่าซ้ำ', () => {
    expect(findDuplicateDepartment(EXISTING, 'Engi neering')).toEqual({ id: 1, name: 'Engineering' });
  });

  it('AC-D03/D07: ชื่อใหม่ที่ไม่ชนใครเลย ไม่ถือว่าซ้ำ', () => {
    expect(findDuplicateDepartment(EXISTING, 'Data Science')).toBeUndefined();
  });

  it('AC-D13: excludeId กันไม่ให้แผนกชนกับตัวเอง (เปลี่ยนชื่อเป็นชื่อเดิม)', () => {
    expect(findDuplicateDepartment(EXISTING, 'Engineering', 1)).toBeUndefined();
  });

  it('AC-D12: excludeId ยังจับคู่ชนกับแผนกอื่นที่ไม่ใช่ตัวเองได้ปกติ', () => {
    expect(findDuplicateDepartment(EXISTING, 'marketing', 1)).toEqual({ id: 2, name: 'Marketing' });
  });
});
