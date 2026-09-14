/**
 * แปลง serial ของ Excel ↔ วันที่ ด้วยเลขจำนวนเต็มจาก epoch 1899-12-30 เท่านั้น
 * ตาม SPEC.md §5.4 และ ANALYSIS.md §3.1
 *
 * ห้ามผ่าน Date หรือ helper ของ library ที่ผูก timezone ในการคำนวณปฏิทิน
 * รับเฉพาะ epoch ms (Date#getTime() เป็นค่าสัมบูรณ์ ไม่ผูก timezone ของเครื่อง)
 * เป็นจุดเริ่มต้นแล้วคำนวณต่อด้วยเลขจำนวนเต็มล้วน
 */

/** serial ต่ำกว่านี้ถูกปฏิเสธเสมอ กันบั๊กปีอธิกสุรทินปลอมของ Excel ปี 1900 ตาม SPEC.md §5.4 */
export const MIN_ACCEPTED_SERIAL = 61;

const MS_PER_DAY = 86_400_000;
/** serial ของ Excel สำหรับ 1970-01-01 (Unix epoch) — ค่าคงที่ที่ยอมรับกันทั่วไป */
const UNIX_EPOCH_AS_EXCEL_SERIAL = 25569;

export type EpochToSerialResult =
  | { ok: true; serial: number }
  | { ok: false; reason: string };

export type SerialToIsoDateResult =
  | { ok: true; isoDate: string }
  | { ok: false; reason: string };

/**
 * epoch ms (จาก Date#getTime() ของเซลล์ที่ exceljs อ่านมา) → serial ของ Excel
 * คืน ok: false ถ้า epoch ไม่ใช่จำนวนเต็มวันพอดี (มีเวลาติดมาในเซลล์ ซึ่งไฟล์ไม่ควรมี)
 */
export function epochMsToSerial(epochMs: number): EpochToSerialResult {
  if (!Number.isFinite(epochMs)) {
    return { ok: false, reason: 'epoch ไม่ใช่ตัวเลขที่ถูกต้อง' };
  }
  if (epochMs % MS_PER_DAY !== 0) {
    return { ok: false, reason: 'เซลล์มีเวลาติดมา ต้องเป็นวันที่ล้วนไม่มีเวลา' };
  }
  const daysSinceUnixEpoch = epochMs / MS_PER_DAY;
  return { ok: true, serial: daysSinceUnixEpoch + UNIX_EPOCH_AS_EXCEL_SERIAL };
}

interface CivilDate {
  year: number;
  month: number;
  day: number;
}

/**
 * แปลง "จำนวนวันนับจาก 1970-01-01" เป็นปี/เดือน/วัน ด้วยพีชคณิตจำนวนเต็มล้วน
 * พอร์ตจากอัลกอริทึม civil_from_days ของ Howard Hinnant
 * (http://howardhinnant.github.io/date_algorithms.html#civil_from_days)
 * ไม่ผ่าน Date object ใด ๆ ในการคำนวณ ใช้ได้ตลอดช่วงปฏิทินแบบ proleptic Gregorian
 * ซึ่งครอบคลุมขอบเขตวันที่ที่ SPEC.md §5.1 ยอมรับ (1900-01-01 ถึง 2100-12-31) สบาย ๆ
 */
function civilFromDaysSinceUnixEpoch(daysSinceUnixEpoch: number): CivilDate {
  const z = daysSinceUnixEpoch + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097; // [0, 146096]
  const yoe = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365,
  ); // [0, 399]
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
  const mp = Math.floor((5 * doy + 2) / 153); // [0, 11]
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1; // [1, 31]
  const month = mp + (mp < 10 ? 3 : -9); // [1, 12]
  const year = y + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

function padTo(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/**
 * serial ของ Excel → สตริง YYYY-MM-DD ด้วยเลขจำนวนเต็มล้วน ไม่ผ่าน Date ใด ๆ ในการคำนวณ
 * ปฏิเสธ serial < MIN_ACCEPTED_SERIAL
 */
export function serialToIsoDate(serial: number): SerialToIsoDateResult {
  if (!Number.isInteger(serial)) {
    return { ok: false, reason: 'serial ต้องเป็นจำนวนเต็ม' };
  }
  if (serial < MIN_ACCEPTED_SERIAL) {
    return {
      ok: false,
      reason: `serial ต่ำกว่า ${MIN_ACCEPTED_SERIAL} ถูกปฏิเสธ (กันบั๊กปีอธิกสุรทินปลอมของ Excel ปี 1900)`,
    };
  }

  const daysSinceUnixEpoch = serial - UNIX_EPOCH_AS_EXCEL_SERIAL;
  const civil = civilFromDaysSinceUnixEpoch(daysSinceUnixEpoch);
  const isoDate = `${padTo(civil.year, 4)}-${padTo(civil.month, 2)}-${padTo(civil.day, 2)}`;
  return { ok: true, isoDate };
}
