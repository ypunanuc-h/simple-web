import { validateName, validateSalary, validateJoinDate } from './employee-field-validators';

describe('validateName', () => {
  it('AC-V01: ว่างหลังตัดช่องว่างแล้วตอบ length', () => {
    expect(validateName('')).toEqual(expect.objectContaining({ field: 'name', rule: 'length' }));
  });

  it('AC-V02: ยาวเกิน 255 ตัวอักษรตอบ length', () => {
    expect(validateName('A'.repeat(256))).toEqual(
      expect.objectContaining({ field: 'name', rule: 'length' }),
    );
  });

  it('ยาว 255 ตัวอักษรพอดีผ่าน', () => {
    expect(validateName('A'.repeat(255))).toBeNull();
  });

  it('ชื่อปกติผ่าน', () => {
    expect(validateName('John')).toBeNull();
  });
});

describe('validateSalary', () => {
  it('AC-V05: มีคอมมาคั่นหลักตอบ format ไม่ใช่ถูกตีความเป็นค่าที่ตัดทอน', () => {
    expect(validateSalary('65,000.00')).toEqual(
      expect.objectContaining({ field: 'salary', rule: 'format' }),
    );
  });

  it('AC-V06: ทศนิยมเกิน 2 ตำแหน่งตอบ max_scale', () => {
    expect(validateSalary('65000.999')).toEqual(
      expect.objectContaining({ field: 'salary', rule: 'max_scale' }),
    );
  });

  it('AC-V07: ค่าติดลบตอบ format (เครื่องหมายลบไม่ผ่านรูปแบบตัวเลขที่รับได้)', () => {
    expect(validateSalary('-1')).toEqual(
      expect.objectContaining({ field: 'salary', rule: 'format' }),
    );
  });

  it('AC-V08: ค่าที่เกิน DECIMAL(12,2) ตอบ range ไม่ใช่ error จากฐานข้อมูล', () => {
    expect(validateSalary('10000000000.00')).toEqual(
      expect.objectContaining({ field: 'salary', rule: 'range' }),
    );
  });

  it('AC-V09: ศูนย์ผ่านเพราะ spec ไม่มีขั้นต่ำเชิงธุรกิจ', () => {
    expect(validateSalary('0')).toBeNull();
    expect(validateSalary('0.00')).toBeNull();
  });

  it('AC-V10: มีสัญลักษณ์สกุลเงินตอบ format', () => {
    expect(validateSalary('$65000')).toEqual(
      expect.objectContaining({ field: 'salary', rule: 'format' }),
    );
  });

  it('ขอบบนสุดของ DECIMAL(12,2) ผ่านพอดี', () => {
    expect(validateSalary('9999999999.99')).toBeNull();
  });

  it('ค่าปกติผ่าน', () => {
    expect(validateSalary('65000.00')).toBeNull();
  });
});

describe('validateJoinDate', () => {
  it('AC-V11: รูปแบบถูกแต่ไม่ใช่วันจริงตามปฏิทินตอบ format', () => {
    expect(validateJoinDate('2023-02-30')).toEqual(
      expect.objectContaining({ field: 'join_date', rule: 'format' }),
    );
  });

  it('AC-V12: รูปแบบผิด (15-Jan-23 หรือ 01/15/2023) ตอบ format', () => {
    expect(validateJoinDate('15-Jan-23')).toEqual(
      expect.objectContaining({ field: 'join_date', rule: 'format' }),
    );
    expect(validateJoinDate('01/15/2023')).toEqual(
      expect.objectContaining({ field: 'join_date', rule: 'format' }),
    );
  });

  it('AC-V13: ก่อน 1900-01-01 ตอบ range', () => {
    expect(validateJoinDate('1899-12-31')).toEqual(
      expect.objectContaining({ field: 'join_date', rule: 'range' }),
    );
  });

  it('AC-V14: วันในอนาคตผ่านได้ ไม่ใช่ error', () => {
    expect(validateJoinDate('2099-01-01')).toBeNull();
  });

  it('ปีอธิกสุรทิน 29 ก.พ. ผ่าน ส่วนปีปกติไม่ผ่าน', () => {
    expect(validateJoinDate('2024-02-29')).toBeNull();
    expect(validateJoinDate('2023-02-29')).toEqual(
      expect.objectContaining({ field: 'join_date', rule: 'format' }),
    );
  });

  it('ขอบบนสุดของช่วงที่ยอมรับผ่านพอดี', () => {
    expect(validateJoinDate('2100-12-31')).toBeNull();
  });

  it('เกินขอบบนของช่วงที่ยอมรับตอบ range', () => {
    expect(validateJoinDate('2101-01-01')).toEqual(
      expect.objectContaining({ field: 'join_date', rule: 'range' }),
    );
  });
});
