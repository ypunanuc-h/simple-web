/**
 * แปลง salary ที่เป็น string ทศนิยมจาก API (D7) ให้เป็นรูปแบบแสดงผล #,##0.00
 * ห้ามผ่าน Number()/parseFloat() ที่จุดใดเลยตาม CLAUDE.md — ต้องคงทุก digit ของ
 * DECIMAL(12,2) ไว้ครบ ไม่ใช่แปลงผ่าน float แล้วค่อยจัดรูปแบบ
 */
export function formatSalary(salary: string): string {
  const [integerPart, fractionPart] = salary.split('.');
  const grouped = (integerPart ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${fractionPart ?? ''}`;
}
