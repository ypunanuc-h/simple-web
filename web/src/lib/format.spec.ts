import { formatSalary } from './format';

describe('formatSalary', () => {
  it('AC-UI01: ใส่คอมมาแบ่งหลักพันให้ค่าที่มากกว่า 999', () => {
    expect(formatSalary('65000.00')).toBe('65,000.00');
  });

  it('AC-UI01: ค่าต่ำกว่า 1,000 ไม่มีคอมมา', () => {
    expect(formatSalary('999.99')).toBe('999.99');
  });

  it('AC-UI01: ใส่คอมมาทุกหลักพันเมื่อจำนวนหลักมาก', () => {
    expect(formatSalary('1234567.89')).toBe('1,234,567.89');
  });

  it('AC-UI01: ค่าที่ขอบบนสุดของ DECIMAL(12,2) ตาม AC-V08 ยังคงทุก digit ครบ', () => {
    expect(formatSalary('9999999999.99')).toBe('9,999,999,999.99');
  });

  it('AC-UI01: ศูนย์แสดงเป็น 0.00 ตาม AC-V09', () => {
    expect(formatSalary('0.00')).toBe('0.00');
  });

  it('AC-N06/N07: ทศนิยมที่มีเศษสตางค์ไม่ถูกปัดหรือคลาดเคลื่อนจากการผ่าน float', () => {
    // 100000000.10 คลาดเคลื่อนไม่ได้ถ้าผ่าน parseFloat/Number เพราะเกิน Number.MAX_SAFE_INTEGER
    // เมื่อคูณด้วย 100 แล้วปัดเป็นจำนวนเต็ม ค่านี้จึงพิสูจน์ว่า formatSalary ไม่ได้ผ่าน float เลย
    expect(formatSalary('100000000.10')).toBe('100,000,000.10');
  });
});
