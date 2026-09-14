import {
  formatIdForLog,
  formatSkippedRowLogLine,
  formatSummaryLogLine,
  sanitizeForLog,
} from './log-format';

describe('sanitizeForLog', () => {
  it('ตัดที่ 32 ตัวอักษรแล้วต่อด้วย "…" ไม่ให้เซลล์ข้อความยาวทำ log อ่านไม่ออก', () => {
    const raw = 'a'.repeat(50);
    const result = sanitizeForLog(raw);
    expect(result).toBe(`${'a'.repeat(32)}…`);
  });

  it('ค่าสั้นกว่า 32 ตัวอักษรไม่ถูกตัดและไม่มี "…" ต่อท้าย', () => {
    expect(sanitizeForLog('Enginering')).toBe('Enginering');
  });

  it('แทนที่ขึ้นบรรทัดใหม่และ tab ด้วยช่องว่าง เพื่อรักษาหนึ่งแถว = หนึ่งบรรทัด log', () => {
    expect(sanitizeForLog('a\nb\tc')).toBe('a b c');
  });
});

describe('formatIdForLog', () => {
  it('ID ที่เป็นตัวเลขบวกแสดงเป็นตัวเลขล้วน', () => {
    expect(formatIdForLog(106)).toBe('106');
  });

  it('เซลล์ ID ว่าง (null/undefined) แสดงเป็น "<empty>"', () => {
    expect(formatIdForLog(null)).toBe('<empty>');
    expect(formatIdForLog(undefined)).toBe('<empty>');
  });

  it('ID ที่ไม่ใช่จำนวนเต็มบวก แสดงเป็น "<invalid:...>" พร้อมค่าดิบ', () => {
    expect(formatIdForLog('abc')).toBe('<invalid:"abc">');
    expect(formatIdForLog(101.5)).toBe('<invalid:"101.5">');
    expect(formatIdForLog(-1)).toBe('<invalid:"-1">');
    expect(formatIdForLog(0)).toBe('<invalid:"0">');
  });

  it('ค่า ID ดิบที่ยาวเกินไปถูก sanitize ก่อนใส่ใน <invalid:...> เช่นกัน', () => {
    const long = 'x'.repeat(50);
    const result = formatIdForLog(long);
    expect(result.length).toBeLessThan(50);
    expect(result.startsWith('<invalid:"')).toBe(true);
  });
});

describe('formatSkippedRowLogLine (AC-I15)', () => {
  it('บรรทัด log ของแถวที่ข้ามตรงตามรูปแบบที่ตกลงกัน', () => {
    const line = formatSkippedRowLogLine({
      rowNumber: 7,
      idDisplay: '106',
      reason: 'department "Enginering" ไม่ตรงกับแผนกที่มีอยู่',
    });
    expect(line).toBe(
      '[import] skipped row 7 (ID=106) - department "Enginering" ไม่ตรงกับแผนกที่มีอยู่',
    );
  });

  it('รองรับ ID ว่างในบรรทัด log', () => {
    const line = formatSkippedRowLogLine({
      rowNumber: 8,
      idDisplay: '<empty>',
      reason: 'เซลล์ ID ว่าง',
    });
    expect(line).toBe('[import] skipped row 8 (ID=<empty>) - เซลล์ ID ว่าง');
  });

  it('รองรับ ID ที่ใช้ไม่ได้ในบรรทัด log', () => {
    const line = formatSkippedRowLogLine({
      rowNumber: 9,
      idDisplay: '<invalid:"abc">',
      reason: 'ID ไม่ใช่จำนวนเต็มบวก',
    });
    expect(line).toBe(
      '[import] skipped row 9 (ID=<invalid:"abc">) - ID ไม่ใช่จำนวนเต็มบวก',
    );
  });
});

describe('formatSummaryLogLine (AC-I16)', () => {
  it('บรรทัดสรุปมีตัวนับครบสี่ตัว created/changed/unchanged/skipped', () => {
    const line = formatSummaryLogLine({
      created: 5,
      changed: 0,
      unchanged: 0,
      skipped: 0,
    });
    expect(line).toBe('[import] created 5, changed 0, unchanged 0, skipped 0');
  });

  it('AC-I08: รันซ้ำแล้วบรรทัดสรุปต้องแยกแยะ unchanged 5 ออกจาก created 0 ได้ชัดเจน', () => {
    const line = formatSummaryLogLine({
      created: 0,
      changed: 0,
      unchanged: 5,
      skipped: 0,
    });
    expect(line).toBe('[import] created 0, changed 0, unchanged 5, skipped 0');
  });

  it('แสดงจำนวน skipped เมื่อมีแถวถูกข้าม', () => {
    const line = formatSummaryLogLine({
      created: 5,
      changed: 0,
      unchanged: 0,
      skipped: 4,
    });
    expect(line).toBe('[import] created 5, changed 0, unchanged 0, skipped 4');
  });
});
