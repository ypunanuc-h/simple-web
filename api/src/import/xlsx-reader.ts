import ExcelJS from 'exceljs';

/**
 * อ่าน employees จากไฟล์ .xlsx ด้วย exceljs โดยอ้างเซลล์ด้วย cell reference เสมอ
 * ตาม SPEC.md §5.4 — ห้ามมีขั้นตอนแปลงเป็น CSV คั่นกลาง และห้ามวนอ่านจาก row.values
 * เพราะ array นั้นเลื่อนตำแหน่งเมื่อมีเซลล์ว่าง (ANALYSIS.md ข้อค้นพบที่ 5, AC-I14)
 *
 * ชี้ชีตด้วยชื่อ "Example Data" เสมอ ไม่ใช้ index ของชีต เพราะไฟล์มีสองชีต
 * ("Example Data" กับ "Requirement") และลำดับชีตไม่ใช่สัญญาที่ยึดได้
 */

export const EMPLOYEE_SHEET_NAME = 'Example Data';

/** เลขแถวแรกที่เป็นข้อมูลจริง (แถว 1 คือหัวตาราง) */
const FIRST_DATA_ROW = 2;

/**
 * ค่าดิบของแถวหนึ่งแถว ยังไม่ตรวจสอบใด ๆ — ตัวตรวจสอบและแปลงค่าอยู่ที่
 * employee-row.mapper.ts เพื่อให้ไฟล์นี้ทำหน้าที่อ่านอย่างเดียว
 */
export interface RawEmployeeRow {
  /** เลขแถวในชีต นับรวมหัวตาราง ให้ตรงกับที่เห็นตอนเปิดไฟล์จริง */
  rowNumber: number;
  idCell: unknown;
  nameCell: unknown;
  departmentCell: unknown;
  salaryCell: unknown;
  joinDateCell: unknown;
  statusCell: unknown;
  /** คอลัมน์ Last Updated Date (G) — ใช้เป็น updated_at ของแถวใหม่เท่านั้นตาม D1 */
  lastUpdatedCell: unknown;
}

export class MissingSheetError extends Error {}

/**
 * อ่านทุกแถวข้อมูล (ไม่รวมหัวตาราง) จากชีต EMPLOYEE_SHEET_NAME ของไฟล์ที่ระบุ
 * โยน MissingSheetError ถ้าไม่พบชีตชื่อนี้ในไฟล์
 */
export async function readEmployeeRows(
  filePath: string,
): Promise<RawEmployeeRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet(EMPLOYEE_SHEET_NAME);
  if (worksheet === undefined) {
    throw new MissingSheetError(
      `ไม่พบชีตชื่อ "${EMPLOYEE_SHEET_NAME}" ในไฟล์ ${filePath}`,
    );
  }

  const rows: RawEmployeeRow[] = [];
  for (let rowNumber = FIRST_DATA_ROW; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    rows.push({
      rowNumber,
      idCell: worksheet.getCell(`A${rowNumber}`).value,
      nameCell: worksheet.getCell(`B${rowNumber}`).value,
      departmentCell: worksheet.getCell(`C${rowNumber}`).value,
      salaryCell: worksheet.getCell(`D${rowNumber}`).value,
      joinDateCell: worksheet.getCell(`E${rowNumber}`).value,
      statusCell: worksheet.getCell(`F${rowNumber}`).value,
      lastUpdatedCell: worksheet.getCell(`G${rowNumber}`).value,
    });
  }

  return rows;
}
