/**
 * ตัวช่วยอ่านค่าจากแถวที่ driver คืนกลับมา สำหรับใช้ในเทสต์
 *
 * ส่งต่อจาก src/common/pg-row.ts ตัวเดียวกับที่โค้ดจริงใช้ (เช่น employees.repository.ts)
 * เพื่อไม่ให้ตรรกะการอ่านแถวซ้ำสองที่ — เทสต์กับโค้ดจริงต้องเชื่อถือ shape เดียวกัน
 */
export {
  readBoolean,
  readNumber,
  readRows,
  readString,
} from '../src/common/pg-row';

function readField(row: unknown, key: string): unknown {
  if (typeof row !== 'object' || row === null) {
    throw new Error(`expected an object row, got ${typeof row}`);
  }
  if (!(key in row)) {
    throw new Error(`row has no field "${key}"`);
  }
  return Reflect.get(row, key);
}

/** เฉพาะเทสต์เท่านั้น — โค้ดจริงยังไม่มีจุดที่ต้องอ่านค่า Date จากแถวดิบ */
export function readDate(row: unknown, key: string): Date {
  const value = readField(row, key);
  if (value instanceof Date) return value;
  throw new Error(`field "${key}" is ${typeof value}, expected Date`);
}
