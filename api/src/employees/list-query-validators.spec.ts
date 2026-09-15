import { compareDecimalStrings, validateListQueryRange } from './list-query-validators';

describe('compareDecimalStrings', () => {
  it('จำนวนเต็มหลักต่างกัน เทียบตามค่าจริงไม่ใช่ lexicographic ของ string ทั้งก้อน', () => {
    expect(compareDecimalStrings('9.50', '10.00')).toBe(-1);
    expect(compareDecimalStrings('10.00', '9.50')).toBe(1);
  });

  it('จำนวนเต็มเท่ากัน เทียบเศษทศนิยมที่ความยาวต่างกันให้ถูกต้อง (0.5 > 0.45)', () => {
    expect(compareDecimalStrings('50000.5', '50000.45')).toBe(1);
    expect(compareDecimalStrings('50000.45', '50000.5')).toBe(-1);
  });

  it('ค่าที่เท่ากันทุกกรณี รวมถึงจำนวนหลักทศนิยมต่างกันแต่ค่าเท่ากัน (0.5 == 0.50)', () => {
    expect(compareDecimalStrings('65000.00', '65000.00')).toBe(0);
    expect(compareDecimalStrings('65000', '65000.00')).toBe(0);
    expect(compareDecimalStrings('50000.5', '50000.50')).toBe(0);
  });

  it('integer part มี leading zero ยังเทียบตามค่าจริง', () => {
    expect(compareDecimalStrings('0700', '65000')).toBe(-1);
  });
});

describe('validateListQueryRange', () => {
  it('AC-L22: salary_min มากกว่า salary_max ตอบ error field salary_min rule range', () => {
    expect(validateListQueryRange({ salaryMin: '70000', salaryMax: '50000' })).toEqual([
      expect.objectContaining({ field: 'salary_min', rule: 'range' }),
    ]);
  });

  it('AC-L22: salary_min เท่ากับ salary_max ผ่าน ไม่ error', () => {
    expect(validateListQueryRange({ salaryMin: '50000.00', salaryMax: '50000.00' })).toEqual([]);
  });

  it('AC-L22: salary_min น้อยกว่า salary_max ผ่าน ไม่ error', () => {
    expect(validateListQueryRange({ salaryMin: '50000', salaryMax: '70000' })).toEqual([]);
  });

  it('AC-L22: ส่งมาข้างเดียวไม่ตรวจ เพราะไม่มีอะไรให้เทียบ', () => {
    expect(validateListQueryRange({ salaryMin: '70000' })).toEqual([]);
    expect(validateListQueryRange({ salaryMax: '50000' })).toEqual([]);
  });

  it('AC-L23: join_date_from มากกว่า join_date_to ตอบ error field join_date_from rule range', () => {
    expect(
      validateListQueryRange({ joinDateFrom: '2024-12-31', joinDateTo: '2024-01-01' }),
    ).toEqual([expect.objectContaining({ field: 'join_date_from', rule: 'range' })]);
  });

  it('AC-L23: join_date_from เท่ากับ join_date_to ผ่าน ไม่ error', () => {
    expect(
      validateListQueryRange({ joinDateFrom: '2024-01-01', joinDateTo: '2024-01-01' }),
    ).toEqual([]);
  });

  it('AC-L23: join_date_from น้อยกว่า join_date_to ผ่าน ไม่ error', () => {
    expect(
      validateListQueryRange({ joinDateFrom: '2024-01-01', joinDateTo: '2024-12-31' }),
    ).toEqual([]);
  });

  it('AC-L23: ส่งมาข้างเดียวไม่ตรวจ เพราะไม่มีอะไรให้เทียบ', () => {
    expect(validateListQueryRange({ joinDateFrom: '2024-12-31' })).toEqual([]);
    expect(validateListQueryRange({ joinDateTo: '2024-01-01' })).toEqual([]);
  });

  it('ทั้งสองคู่ผิดพร้อมกัน รายงานทั้งสอง error พร้อมกัน', () => {
    expect(
      validateListQueryRange({
        salaryMin: '70000',
        salaryMax: '50000',
        joinDateFrom: '2024-12-31',
        joinDateTo: '2024-01-01',
      }),
    ).toEqual([
      expect.objectContaining({ field: 'salary_min', rule: 'range' }),
      expect.objectContaining({ field: 'join_date_from', rule: 'range' }),
    ]);
  });

  it('ไม่ส่งอะไรมาเลยผ่าน', () => {
    expect(validateListQueryRange({})).toEqual([]);
  });
});
