import {
  formatSalaryFromNumber,
  normalizeForComparison,
  normalizeStatus,
} from './normalize';

describe('normalizeForComparison (D6 / ANALYSIS.md §3.2)', () => {
  it('ตัดช่องว่างหัวท้าย ลบช่องว่างภายใน และแปลงเป็นตัวพิมพ์เล็ก', () => {
    expect(normalizeForComparison('  Engi neering  ')).toBe('engineering');
  });

  it('D6: "Engineering", "engineering", "Engi neering" normalize แล้วเท่ากันหมด', () => {
    const a = normalizeForComparison('Engineering');
    const b = normalizeForComparison('engineering');
    const c = normalizeForComparison('Engi neering');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('"HR" และ "Hr" normalize แล้วเท่ากัน (จุดที่ dedupe ต้องจับได้ ไม่ใช่แค่ DISTINCT ดิบ)', () => {
    expect(normalizeForComparison('HR')).toBe(normalizeForComparison('Hr'));
  });

  it('ANALYSIS.md ปัญหาข้อ 1: "In Active" normalize แล้วกลายเป็น "inactive" คำเดียว', () => {
    expect(normalizeForComparison('In Active')).toBe('inactive');
  });
});

describe('normalizeStatus (ANALYSIS.md §3.2)', () => {
  it('AC-I05: "In Active" -> is_active = false (กับดักหลักของชุดข้อมูล)', () => {
    expect(normalizeStatus('In Active')).toEqual({ ok: true, isActive: false });
  });

  it('AC-I13: "  in active  " (ช่องว่างเยอะ) -> is_active = false', () => {
    expect(normalizeStatus('  in active  ')).toEqual({ ok: true, isActive: false });
  });

  it('"Active" -> is_active = true', () => {
    expect(normalizeStatus('Active')).toEqual({ ok: true, isActive: true });
  });

  it('AC-I12: "Retired" ไม่รู้จัก -> ok: false ไม่ใส่ default', () => {
    expect(normalizeStatus('Retired')).toEqual({ ok: false });
  });

  it('ค่าว่างหลัง trim -> ok: false', () => {
    expect(normalizeStatus('   ')).toEqual({ ok: false });
  });
});

describe('formatSalaryFromNumber (D7 / AC-I02)', () => {
  it('AC-I02: 65000 -> "65000.00" ไม่ใช่ "65" (กับดักของชุดข้อมูล)', () => {
    expect(formatSalaryFromNumber(65000)).toEqual({ ok: true, value: '65000.00' });
  });

  it('AC-N07: ค่าที่มีเศษสตางค์เก็บได้พอดีไม่คลาดเคลื่อน', () => {
    expect(formatSalaryFromNumber(65000.1)).toEqual({ ok: true, value: '65000.10' });
  });

  it('D7: ผลลัพธ์เป็น string เสมอ ไม่ใช่ number', () => {
    const result = formatSalaryFromNumber(50000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.value).toBe('string');
    }
  });

  it('ปฏิเสธค่าติดลบ', () => {
    expect(formatSalaryFromNumber(-1).ok).toBe(false);
  });

  it('ปฏิเสธ NaN และ Infinity', () => {
    expect(formatSalaryFromNumber(Number.NaN).ok).toBe(false);
    expect(formatSalaryFromNumber(Number.POSITIVE_INFINITY).ok).toBe(false);
  });

  it('ปฏิเสธค่าที่มีเศษเกิน 2 ตำแหน่ง แทนการปัดแบบเงียบ ๆ', () => {
    expect(formatSalaryFromNumber(65000.005).ok).toBe(false);
  });

  it('ยอมรับ 0 เพราะ spec ไม่มีขั้นต่ำเชิงธุรกิจ (สอดคล้อง AC-V09)', () => {
    expect(formatSalaryFromNumber(0)).toEqual({ ok: true, value: '0.00' });
  });
});
