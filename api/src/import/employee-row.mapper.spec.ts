import {
  matchDepartment,
  validateEmployeeRow,
  type KnownDepartment,
} from './employee-row.mapper';
import type { RawEmployeeRow } from './xlsx-reader';

/** แถวฐานที่ผ่านทุกกฎ ใช้เป็นจุดตั้งต้นแล้วแก้ทีละฟิลด์ในแต่ละเทสต์ */
function validRawRow(overrides: Partial<RawEmployeeRow> = {}): RawEmployeeRow {
  return {
    rowNumber: 2,
    idCell: 101,
    nameCell: 'John Doe',
    departmentCell: 'Engineering',
    salaryCell: 65000,
    joinDateCell: new Date('2023-01-15T00:00:00.000Z'),
    statusCell: 'Active',
    lastUpdatedCell: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

describe('validateEmployeeRow — แถวที่ถูกต้อง', () => {
  it('AC-I01: แถวที่ครบทุกช่องแปลงเป็น CandidateEmployeeRow สำเร็จ', () => {
    const result = validateEmployeeRow(validRawRow());
    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.row).toEqual({
        rowNumber: 2,
        id: 101,
        name: 'John Doe',
        departmentRaw: 'Engineering',
        salary: '65000.00',
        joinDate: '2023-01-15',
        isActive: true,
        insertUpdatedAtIso: '2026-01-10T00:00:00.000Z',
      });
    }
  });

  it('AC-I05: สถานะ "In Active" ได้ isActive = false', () => {
    const result = validateEmployeeRow(
      validRawRow({ rowNumber: 5, idCell: 104, statusCell: 'In Active' }),
    );
    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.row.isActive).toBe(false);
    }
  });

  it('ตัดช่องว่างหัวท้ายของ name และ departmentRaw (AC-V03 style)', () => {
    const result = validateEmployeeRow(
      validRawRow({ nameCell: '  John Doe  ', departmentCell: '  Engineering  ' }),
    );
    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.row.name).toBe('John Doe');
      expect(result.row.departmentRaw).toBe('Engineering');
    }
  });
});

describe('validateEmployeeRow — แถวที่ต้องถูกข้าม', () => {
  it('AC-I14: เซลล์ Salary ว่าง ถูกข้าม และ idDisplay ยังอ่าน ID ได้ถูกต้อง (ไม่เลื่อนคอลัมน์)', () => {
    const result = validateEmployeeRow(
      validRawRow({ rowNumber: 6, idCell: 999, salaryCell: null }),
    );
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.skip.rowNumber).toBe(6);
      expect(result.skip.idDisplay).toBe('999');
      expect(result.skip.reason.toLowerCase()).toContain('salary');
    }
  });

  it('AC-I12: Status "Retired" ไม่รู้จัก ถูกข้าม ไม่ใส่ default เป็น true', () => {
    const result = validateEmployeeRow(
      validRawRow({ rowNumber: 7, idCell: 107, statusCell: 'Retired' }),
    );
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.skip.idDisplay).toBe('107');
      expect(result.skip.reason.toLowerCase()).toContain('status');
    }
  });

  it('เซลล์ ID ว่าง ถูกข้าม และ idDisplay เป็น "<empty>"', () => {
    const result = validateEmployeeRow(validRawRow({ rowNumber: 8, idCell: null }));
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.skip.idDisplay).toBe('<empty>');
    }
  });

  it('ID ที่ไม่ใช่จำนวนเต็มบวก ถูกข้าม และ idDisplay เป็น "<invalid:...>"', () => {
    const result = validateEmployeeRow(validRawRow({ rowNumber: 9, idCell: 'abc' }));
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.skip.idDisplay).toBe('<invalid:"abc">');
    }
  });

  it('AC-V13 style: join date serial ต่ำกว่า 61 ถูกข้าม', () => {
    const result = validateEmployeeRow(
      validRawRow({ rowNumber: 10, idCell: 110, joinDateCell: new Date('1899-12-31T00:00:00.000Z') }),
    );
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.skip.reason.toLowerCase()).toMatch(/date|วันที่/);
    }
  });

  it('เซลล์ join date มีเวลาติดมา ถูกข้าม', () => {
    const result = validateEmployeeRow(
      validRawRow({
        rowNumber: 11,
        idCell: 111,
        joinDateCell: new Date('2023-01-15T13:30:00.000Z'),
      }),
    );
    expect(result.kind).toBe('invalid');
  });

  it('name ว่างหลัง trim ถูกข้าม', () => {
    const result = validateEmployeeRow(
      validRawRow({ rowNumber: 12, idCell: 112, nameCell: '   ' }),
    );
    expect(result.kind).toBe('invalid');
  });

  it('AC-I02/AC-V05 style: salary ที่มีเศษเกิน 2 ตำแหน่งถูกข้าม ไม่ปัดแบบเงียบ ๆ', () => {
    const result = validateEmployeeRow(
      validRawRow({ rowNumber: 13, idCell: 113, salaryCell: 65000.005 }),
    );
    expect(result.kind).toBe('invalid');
  });

  it('D1: เซลล์ Last Updated Date ว่าง ถูกข้าม เพราะแถวใหม่ต้องมีค่านี้เสมอ', () => {
    const result = validateEmployeeRow(
      validRawRow({ rowNumber: 14, idCell: 114, lastUpdatedCell: null }),
    );
    expect(result.kind).toBe('invalid');
  });

  it('D1: เซลล์ Last Updated Date ที่มีเวลาติดมา ถูกข้าม เช่นเดียวกับ join date', () => {
    const result = validateEmployeeRow(
      validRawRow({
        rowNumber: 15,
        idCell: 115,
        lastUpdatedCell: new Date('2026-01-10T09:00:00.000Z'),
      }),
    );
    expect(result.kind).toBe('invalid');
  });
});

describe('matchDepartment (D6)', () => {
  const known: readonly KnownDepartment[] = [
    { id: 1, name: 'Engineering' },
    { id: 2, name: 'Marketing' },
    { id: 3, name: 'Sales' },
    { id: 4, name: 'HR' },
  ];

  it('จับคู่ชื่อที่สะกดตรงกันเป๊ะ', () => {
    expect(matchDepartment('Engineering', known)).toEqual({
      matched: true,
      departmentId: 1,
    });
  });

  it('D6: จับคู่ได้แม้ตัวพิมพ์ต่างกัน', () => {
    expect(matchDepartment('engineering', known)).toEqual({
      matched: true,
      departmentId: 1,
    });
  });

  it('D6: จับคู่ได้แม้มีช่องว่างภายในเกิน ("Engi neering")', () => {
    expect(matchDepartment('Engi neering', known)).toEqual({
      matched: true,
      departmentId: 1,
    });
  });

  it('"Hr" จับคู่กับแผนก "HR" ที่มีอยู่ ไม่ใช่กลายเป็นแผนกใหม่', () => {
    expect(matchDepartment('Hr', known)).toEqual({ matched: true, departmentId: 4 });
  });

  it('AC-I11: "Enginering" (พิมพ์ผิด) ไม่ตรงกับแผนกใดเลย', () => {
    const result = matchDepartment('Enginering', known);
    expect(result.matched).toBe(false);
    if (!result.matched) {
      expect(result.normalizedKey).toBe('enginering');
    }
  });
});
