/**
 * แปลง unknown จาก response.json() ให้เป็นชนิดที่ต้องการโดยไม่ใช้ `as`
 * ตาม CLAUDE.md ที่ห้าม as ทับข้อมูลที่มาจากภายนอก — mirror ของ api/src/common/pg-row.ts
 * ใช้กับผลลัพธ์จาก driver ฝั่ง backend แต่ที่นี่ใช้กับผลลัพธ์จาก fetch แทน
 */

export function readField(row: unknown, key: string): unknown {
  if (typeof row !== 'object' || row === null) {
    throw new Error(`expected an object, got ${typeof row}`);
  }
  return Reflect.get(row, key);
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
  if (typeof value !== 'number') {
    throw new Error(`field "${key}" is ${typeof value}, expected number`);
  }
  return value;
}

export function readBoolean(row: unknown, key: string): boolean {
  const value = readField(row, key);
  if (typeof value !== 'boolean') {
    throw new Error(`field "${key}" is ${typeof value}, expected boolean`);
  }
  return value;
}

export function readArray(row: unknown, key: string): readonly unknown[] {
  const value = readField(row, key);
  if (!Array.isArray(value)) {
    throw new Error(`field "${key}" is ${typeof value}, expected array`);
  }
  return value;
}
