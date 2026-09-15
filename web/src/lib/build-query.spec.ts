import { buildEmployeeQuery, type EmployeeFilterFormValues } from './build-query';

const EMPTY_VALUES: EmployeeFilterFormValues = {
  q: '',
  departmentId: '',
  isActive: '',
  joinDateFrom: '',
  joinDateTo: '',
  salaryMin: '',
  salaryMax: '',
};

describe('buildEmployeeQuery', () => {
  it('ไม่มีฟิลด์ใดถูกกรอกเลย ได้ query string ว่าง', () => {
    expect(buildEmployeeQuery(EMPTY_VALUES)).toBe('');
  });

  it('AC-L04: q ถูกตัดช่องว่างหัวท้ายก่อนใส่ลง query string', () => {
    const query = buildEmployeeQuery({ ...EMPTY_VALUES, q: '  jo  ' });
    expect(new URLSearchParams(query).get('q')).toBe('jo');
  });

  it('AC-L05: q ที่เป็นช่องว่างล้วนไม่ถูกใส่ลง query string เลย', () => {
    const query = buildEmployeeQuery({ ...EMPTY_VALUES, q: '   ' });
    expect(new URLSearchParams(query).has('q')).toBe(false);
  });

  it('AC-L13: รวมทุกฟิลด์ที่กรอกไว้เป็นเงื่อนไขเดียวกันแบบ AND', () => {
    const query = buildEmployeeQuery({
      q: 'jo',
      departmentId: '1',
      isActive: 'true',
      joinDateFrom: '2022-01-01',
      joinDateTo: '2024-12-31',
      salaryMin: '50000.00',
      salaryMax: '70000.00',
    });
    const params = new URLSearchParams(query);

    expect(params.get('q')).toBe('jo');
    expect(params.get('department_id')).toBe('1');
    expect(params.get('is_active')).toBe('true');
    expect(params.get('join_date_from')).toBe('2022-01-01');
    expect(params.get('join_date_to')).toBe('2024-12-31');
    expect(params.get('salary_min')).toBe('50000.00');
    expect(params.get('salary_max')).toBe('70000.00');
  });

  it('AC-L09: isActive เป็นค่าว่าง (ไม่กรองสถานะ) ไม่ถูกใส่ลง query string', () => {
    const query = buildEmployeeQuery({ ...EMPTY_VALUES, isActive: '' });
    expect(new URLSearchParams(query).has('is_active')).toBe(false);
  });

  it('D7: salary ที่มีเศษสตางค์ผ่านเป็น string เดิมเป๊ะ ไม่ถูกปัดผ่าน float', () => {
    const query = buildEmployeeQuery({ ...EMPTY_VALUES, salaryMin: '100000000.10' });
    expect(new URLSearchParams(query).get('salary_min')).toBe('100000000.10');
  });
});
