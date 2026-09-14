/**
 * ตรวจสอบและแปลงแถวดิบจาก xlsx-reader.ts เป็นแถวที่พร้อม upsert หรือเหตุผลที่ต้องข้าม
 *
 * แยกการตรวจ "แถว" (ID, name, salary, join date, last updated date, status) ออกจาก
 * การจับคู่แผนก เพราะการจับคู่แผนกต้องรู้สถานะของทั้งไฟล์ (D12 — ตารางว่างหรือมีข้อมูลแล้ว)
 * ส่วนนี้จึงเป็นหน้าที่ของ import.service.ts ไม่ใช่ของ mapper
 */
import { formatIdForLog } from './log-format';
import { normalizeForComparison, normalizeStatus, formatSalaryFromNumber } from './normalize';
import { epochMsToSerial, serialToIsoDate } from './serial-date';
import type { RawEmployeeRow } from './xlsx-reader';

/** แถวที่ผ่านการตรวจทุกช่องแล้ว ยกเว้นแผนกซึ่งยังเป็นค่าดิบรอจับคู่ */
export interface CandidateEmployeeRow {
  rowNumber: number;
  id: number;
  name: string;
  /** ชื่อแผนกดิบหลังตัดช่องว่างหัวท้าย ยังไม่ผ่านการจับคู่หรือ normalize เพื่อเปรียบเทียบ */
  departmentRaw: string;
  salary: string;
  joinDate: string;
  isActive: boolean;
  /**
   * updated_at ที่จะใช้ "เฉพาะตอนแถวนี้เป็นแถวใหม่" ตาม D1 — มาจากคอลัมน์ Last Updated
   * Date ในไฟล์ แปลงเป็นเที่ยงคืน UTC ของวันนั้นแล้วประกอบเป็น ISO string ที่มี Z ต่อท้าย
   * เอง (D9) แถวที่มีอยู่แล้วและถูกแก้ไขจะใช้เวลาปัจจุบันจาก Clock ของ service แทนค่านี้
   */
  insertUpdatedAtIso: string;
}

export interface SkippedRow {
  rowNumber: number;
  /** ค่า ID สำหรับแสดงใน log ผ่าน formatIdForLog เสมอ แม้ ID เองจะเป็นสาเหตุที่ข้าม */
  idDisplay: string;
  reason: string;
}

export type RowValidationResult =
  | { kind: 'valid'; row: CandidateEmployeeRow }
  | { kind: 'invalid'; skip: SkippedRow };

const MAX_NAME_LENGTH = 255;

function invalid(
  rowNumber: number,
  idCell: unknown,
  reason: string,
): RowValidationResult {
  return {
    kind: 'invalid',
    skip: { rowNumber, idDisplay: formatIdForLog(idCell), reason },
  };
}

/**
 * ตรวจว่า cell (จากคอลัมน์ Join Date หรือ Last Updated Date) เป็นวันที่ที่ถูกต้อง
 * แล้วแปลงเป็น YYYY-MM-DD — รองรับทั้งกรณี exceljs อ่านมาเป็น Date (เซลล์ถูกจัดรูปแบบ
 * เป็นวันที่ในไฟล์) และกรณีอ่านมาเป็น number ดิบ (เซลล์ไม่ได้จัดรูปแบบ)
 */
function resolveDateCell(cell: unknown): { ok: true; isoDate: string } | { ok: false; reason: string } {
  if (cell instanceof Date) {
    const serialResult = epochMsToSerial(cell.getTime());
    if (!serialResult.ok) {
      return { ok: false, reason: `วันที่ไม่ถูกต้อง — ${serialResult.reason}` };
    }
    const dateResult = serialToIsoDate(serialResult.serial);
    if (!dateResult.ok) {
      return { ok: false, reason: `วันที่ไม่ถูกต้อง — ${dateResult.reason}` };
    }
    return { ok: true, isoDate: dateResult.isoDate };
  }

  if (typeof cell === 'number') {
    const dateResult = serialToIsoDate(cell);
    if (!dateResult.ok) {
      return { ok: false, reason: `วันที่ไม่ถูกต้อง — ${dateResult.reason}` };
    }
    return { ok: true, isoDate: dateResult.isoDate };
  }

  return { ok: false, reason: 'วันที่ไม่ถูกต้อง — ไม่ใช่วันที่หรือตัวเลข serial' };
}

/**
 * ตรวจ ID, name, salary, join date, last updated date, status ของแถวดิบหนึ่งแถว
 * ไม่แตะคอลัมน์ department เลยนอกจากตัด/อ่านค่าดิบ — การจับคู่แผนกอยู่ที่ matchDepartment
 */
export function validateEmployeeRow(raw: RawEmployeeRow): RowValidationResult {
  const { rowNumber, idCell } = raw;

  if (
    typeof idCell !== 'number' ||
    !Number.isInteger(idCell) ||
    idCell <= 0
  ) {
    return invalid(rowNumber, idCell, 'ID ไม่ใช่จำนวนเต็มบวก');
  }
  const id = idCell;

  if (typeof raw.nameCell !== 'string') {
    return invalid(rowNumber, idCell, 'name ต้องเป็นข้อความ');
  }
  const name = raw.nameCell.trim();
  if (name === '' || name.length > MAX_NAME_LENGTH) {
    return invalid(rowNumber, idCell, 'name ว่างหรือยาวเกิน 255 ตัวอักษร');
  }

  if (typeof raw.departmentCell !== 'string') {
    return invalid(rowNumber, idCell, 'department ต้องเป็นข้อความ');
  }
  const departmentRaw = raw.departmentCell.trim();
  if (departmentRaw === '') {
    return invalid(rowNumber, idCell, 'department ว่าง');
  }

  if (typeof raw.salaryCell !== 'number') {
    return invalid(rowNumber, idCell, 'salary ว่างหรือไม่ใช่ตัวเลข');
  }
  const salaryResult = formatSalaryFromNumber(raw.salaryCell);
  if (!salaryResult.ok) {
    return invalid(rowNumber, idCell, `salary ไม่ถูกต้อง — ${salaryResult.reason}`);
  }

  const joinDateResult = resolveDateCell(raw.joinDateCell);
  if (!joinDateResult.ok) {
    return invalid(rowNumber, idCell, `join date ${joinDateResult.reason}`);
  }

  const lastUpdatedResult = resolveDateCell(raw.lastUpdatedCell);
  if (!lastUpdatedResult.ok) {
    return invalid(rowNumber, idCell, `last updated date ${lastUpdatedResult.reason}`);
  }

  if (typeof raw.statusCell !== 'string') {
    return invalid(rowNumber, idCell, 'status ต้องเป็นข้อความ');
  }
  const statusResult = normalizeStatus(raw.statusCell);
  if (!statusResult.ok) {
    return invalid(rowNumber, idCell, `status "${raw.statusCell}" ไม่รู้จัก`);
  }

  return {
    kind: 'valid',
    row: {
      rowNumber,
      id,
      name,
      departmentRaw,
      salary: salaryResult.value,
      joinDate: joinDateResult.isoDate,
      isActive: statusResult.isActive,
      insertUpdatedAtIso: `${lastUpdatedResult.isoDate}T00:00:00.000Z`,
    },
  };
}

export interface KnownDepartment {
  id: number;
  name: string;
}

export type DepartmentMatchResult =
  | { matched: true; departmentId: number }
  /** normalizedKey มีไว้ให้ผู้เรียกตัดสินใจตาม D12 ว่าจะสร้างแผนกใหม่หรือปฏิเสธแถว */
  | { matched: false; normalizedKey: string };

/**
 * เทียบ raw กับรายการแผนกที่รู้จักด้วยกฎ normalize ของ D6
 * (ตัดช่องว่างหัวท้าย → ลบช่องว่างภายใน → ตัวพิมพ์เล็ก) ไม่ใช่การเทียบสตริงดิบ
 * ดังนั้น "HR" และ "Hr" ถือเป็นค่าเดียวกัน
 */
export function matchDepartment(
  raw: string,
  known: readonly KnownDepartment[],
): DepartmentMatchResult {
  const normalizedKey = normalizeForComparison(raw);
  const found = known.find((dept) => normalizeForComparison(dept.name) === normalizedKey);
  if (found === undefined) {
    return { matched: false, normalizedKey };
  }
  return { matched: true, departmentId: found.id };
}
