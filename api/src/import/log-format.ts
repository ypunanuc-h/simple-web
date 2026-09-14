/**
 * ตัวช่วยจัดรูปแบบค่าดิบและบรรทัด log ของ import (AC-I15, AC-I16)
 */

const MAX_DISPLAY_LENGTH = 32;

/**
 * ตัดค่าดิบให้อ่านใน log บรรทัดเดียวได้เสมอ
 * แทนที่ขึ้นบรรทัดใหม่/tab ด้วยช่องว่าง และตัดที่ 32 ตัวอักษรแล้วต่อด้วย "…"
 * เพื่อไม่ให้เซลล์ที่มีข้อความยาวหรือมีอักขระควบคุมทำให้ log อ่านไม่ออก
 */
export function sanitizeForLog(raw: string): string {
  const singleLine = raw.replace(/[\n\r\t]/g, ' ');
  if (singleLine.length <= MAX_DISPLAY_LENGTH) {
    return singleLine;
  }
  return `${singleLine.slice(0, MAX_DISPLAY_LENGTH)}…`;
}

/**
 * แปลงค่าเซลล์ ID (unknown) เป็นข้อความสำหรับแสดงใน log ของแถวที่ถูกข้าม
 * "<empty>" เมื่อไม่มีค่า, "<invalid:\"...\">" เมื่อมีค่าแต่ไม่ใช่จำนวนเต็มบวก,
 * หรือตัวเลขล้วนเมื่อค่าถูกต้อง — ใช้ได้ทั้งตอน ID valid และตอน ID เองก็เป็นสาเหตุที่ถูกข้าม
 */
export function formatIdForLog(idCell: unknown): string {
  if (idCell === null || idCell === undefined) {
    return '<empty>';
  }
  if (typeof idCell === 'number' && Number.isInteger(idCell) && idCell > 0) {
    return String(idCell);
  }
  const rawText = typeof idCell === 'string' ? idCell : String(idCell);
  return `<invalid:"${sanitizeForLog(rawText)}">`;
}

export interface SkippedRowLogEntry {
  rowNumber: number;
  idDisplay: string;
  reason: string;
}

/**
 * บรรทัด log ของแถวที่ถูกข้ามหนึ่งแถว ตามรูปแบบที่ตกลงกัน (AC-I15)
 * "[import] skipped row 7 (ID=106) - department \"Enginering\" ไม่ตรงกับแผนกที่มีอยู่"
 */
export function formatSkippedRowLogLine(entry: SkippedRowLogEntry): string {
  return `[import] skipped row ${entry.rowNumber} (ID=${entry.idDisplay}) - ${entry.reason}`;
}

export interface ImportSummaryCounts {
  created: number;
  changed: number;
  unchanged: number;
  skipped: number;
}

/**
 * บรรทัดสรุปท้ายการ import ตามรูปแบบที่ตกลงกัน (AC-I16)
 * "[import] created 5, changed 0, unchanged 0, skipped 2"
 */
export function formatSummaryLogLine(counts: ImportSummaryCounts): string {
  return `[import] created ${counts.created}, changed ${counts.changed}, unchanged ${counts.unchanged}, skipped ${counts.skipped}`;
}
