/**
 * ตัวช่วยอ่านค่าจากแถวที่ driver คืนกลับมา
 *
 * CLAUDE.md ห้ามใช้ as ทับผลลัพธ์จาก driver ตัวช่วยชุดนี้จึงตรวจค่าจริง
 * ทุกครั้งแล้วโยน error ที่อ่านรู้เรื่องเมื่อรูปร่างไม่ตรงที่คาด
 */
function readField(row: unknown, key: string): unknown {
  if (typeof row !== 'object' || row === null) {
    throw new Error(`expected an object row, got ${typeof row}`);
  }
  if (!(key in row)) {
    throw new Error(`row has no field "${key}"`);
  }
  const value: unknown = Reflect.get(row, key);
  return value;
}

export function readString(row: unknown, key: string): string {
  const value = readField(row, key);
  if (typeof value !== 'string') {
    throw new Error(`field "${key}" is ${typeof value}, expected string`);
  }
  return value;
}

export function readNumber(row: unknown, key: string): number {
  const value = readField(row, key);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  throw new Error(`field "${key}" is ${typeof value}, expected number`);
}
