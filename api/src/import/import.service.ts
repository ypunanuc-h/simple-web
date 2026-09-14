import type { DataSource } from 'typeorm';
import type { Clock } from '../common/clock';
import {
  createDepartment,
  findAllDepartments,
} from '../departments/departments.repository';
import {
  resetEmployeeIdentitySequence,
  upsertEmployees,
  type UpsertEmployeeInput,
} from '../employees/employees.repository';
import {
  matchDepartment,
  validateEmployeeRow,
  type KnownDepartment,
} from './employee-row.mapper';
import { formatIdForLog } from './log-format';
import { readEmployeeRows } from './xlsx-reader';

/**
 * ประกอบ upsert ตาม D1, กฎ seed แผนกตาม D12, setval ตาม D10 และรายงานสรุป
 * เขียนข้อมูลผ่าน repository ของ employees และ departments เท่านั้น ไม่เปิด TypeORM ใช้เอง
 * (CLAUDE.md §4) และเป็นชั้นเดียวที่ import DataSource/EntityManager จาก typeorm ได้
 * เพื่อเปิดขอบเขต transaction ตามข้อยกเว้นใน CLAUDE.md §5.1
 */

export interface SkippedRowLog {
  rowNumber: number;
  idDisplay: string;
  reason: string;
}

export interface ImportRunResult {
  created: number;
  changed: number;
  unchanged: number;
  skipped: number;
  skippedRows: readonly SkippedRowLog[];
}

/**
 * จุดต่อขยายสำหรับเทสต์ระดับ service เท่านั้น (CLAUDE.md §6 — "repository ปลอม ... ใช้ได้
 * เฉพาะการทดสอบกฎธุรกิจ") ค่าเริ่มต้นคือ repository จริงเสมอ มีไว้เพื่อจำลอง error ที่ไม่
 * คาดคิดกลางการ import แล้วพิสูจน์ว่า transaction ทั้งก้อนถูก revert จริง ไม่ใช่เพื่อแทนที่
 * พฤติกรรมจริงของ repository ในการทดสอบทั่วไป
 */
export interface ImportDependencies {
  readEmployeeRows: typeof readEmployeeRows;
  findAllDepartments: typeof findAllDepartments;
  createDepartment: typeof createDepartment;
  upsertEmployees: typeof upsertEmployees;
  resetEmployeeIdentitySequence: typeof resetEmployeeIdentitySequence;
}

export const defaultImportDependencies: ImportDependencies = {
  readEmployeeRows,
  findAllDepartments,
  createDepartment,
  upsertEmployees,
  resetEmployeeIdentitySequence,
};

/**
 * import พนักงานจากไฟล์ที่ระบุ (path ใด ๆ ไม่ใช่ชื่อไฟล์ตายตัว) เข้า dataSource ที่ให้มา
 * ทั้งหมดอยู่ในทรานแซกชันเดียว — แถวที่ถูก reject ไม่ใช่ error (ข้ามแล้ว commit ส่วนที่เหลือ
 * ตาม AC-I17) ส่วน error ที่ไม่คาดคิดระหว่างเขียนข้อมูล (เช่นฐานข้อมูลหลุด) ทำให้ทั้งทรานแซกชัน
 * ถูก revert ไม่มีอะไรค้างครึ่ง ๆ
 */
export async function importFromFile(
  dataSource: DataSource,
  filePath: string,
  clock: Clock,
  deps: ImportDependencies = defaultImportDependencies,
): Promise<ImportRunResult> {
  return dataSource.transaction(async (manager) => {
    const rawRows = await deps.readEmployeeRows(filePath);

    // อ่านสถานะของตาราง departments "ครั้งเดียวก่อนเริ่มวนแถว" ตาม D12 — ถ้าเช็กระหว่าง
    // วนแถวแทน แถวแรกที่สร้างแผนกใหม่จะทำให้แถวถัดไปเข้าเงื่อนไขคนละทาง ผลลัพธ์จะขึ้นกับ
    // ลำดับแถวในไฟล์ ซึ่งไม่ใช่พฤติกรรมที่ต้องการ
    const initialDepartments = await deps.findAllDepartments(manager);
    const isEmptyDepartmentsBranch = initialDepartments.length === 0;

    const knownDepartments: KnownDepartment[] = initialDepartments.map((dept) => ({
      id: dept.id,
      name: dept.name,
    }));

    const skippedRows: SkippedRowLog[] = [];
    const upsertInputs: UpsertEmployeeInput[] = [];

    for (const rawRow of rawRows) {
      const validation = validateEmployeeRow(rawRow);
      if (validation.kind === 'invalid') {
        skippedRows.push(validation.skip);
        continue;
      }

      const candidate = validation.row;
      const matchResult = matchDepartment(candidate.departmentRaw, knownDepartments);

      let departmentId: number;
      if (matchResult.matched) {
        departmentId = matchResult.departmentId;
      } else if (isEmptyDepartmentsBranch) {
        // D12 สาขาตารางว่าง — สร้างแผนกใหม่จากการสะกดแรกที่พบ แล้วให้แถวถัดไปในรันเดียวกัน
        // จับคู่กับแผนกนี้ผ่าน knownDepartments ที่อัปเดตแล้ว ไม่ใช่สร้างซ้ำ
        const created = await deps.createDepartment(manager, candidate.departmentRaw);
        knownDepartments.push({ id: created.id, name: created.name });
        departmentId = created.id;
      } else {
        // D12 สาขาตารางมีข้อมูลแล้ว — ไม่สร้างแผนกใหม่ ปฏิเสธแถวนี้ (AC-I11)
        skippedRows.push({
          rowNumber: candidate.rowNumber,
          idDisplay: formatIdForLog(candidate.id),
          reason: `department "${candidate.departmentRaw}" ไม่ตรงกับแผนกที่มีอยู่`,
        });
        continue;
      }

      upsertInputs.push({
        id: candidate.id,
        name: candidate.name,
        departmentId,
        salary: candidate.salary,
        joinDate: candidate.joinDate,
        isActive: candidate.isActive,
        insertUpdatedAtIso: candidate.insertUpdatedAtIso,
      });
    }

    const upsertResults = await deps.upsertEmployees(manager, upsertInputs, clock.now());

    // ต้องรันทุกครั้งหลัง import ไม่ใช่เฉพาะครั้งแรก ตาม ANALYSIS.md §3.5 แม้ไม่มีแถวใด
    // ถูก insert เลยในรันนี้ก็ตาม
    await deps.resetEmployeeIdentitySequence(manager);

    const created = upsertResults.filter((result) => result.outcome === 'created').length;
    const changed = upsertResults.filter((result) => result.outcome === 'changed').length;
    // แถวที่ conflict แต่ข้อมูลไม่ต่างจากเดิมไม่ถูกคืนมาจาก upsertEmployees เลย
    // (ดูหมายเหตุใน employees.repository.ts) จึงคำนวณจากผลต่างของจำนวนแถวที่ส่งไป
    const unchanged = upsertInputs.length - upsertResults.length;

    return {
      created,
      changed,
      unchanged,
      skipped: skippedRows.length,
      skippedRows,
    };
  });
}
