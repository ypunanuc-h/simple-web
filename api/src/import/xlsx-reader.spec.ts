import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { EMPLOYEE_SHEET_NAME, MissingSheetError, readEmployeeRows } from './xlsx-reader';

const REAL_FILE_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'example_data',
  'exam_data.xlsx',
);

/** สร้างไฟล์ .xlsx ชั่วคราวสำหรับกรณีขอบที่ไฟล์จริงไม่มี แล้วคืน path ให้ทดสอบ */
async function writeFixtureWorkbook(
  dir: string,
  build: (workbook: ExcelJS.Workbook) => void,
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  build(workbook);
  const filePath = join(dir, 'fixture.xlsx');
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

describe('readEmployeeRows — ไฟล์ example_data/exam_data.xlsx จริง', () => {
  it('AC-I01: อ่านได้ 5 แถว เลขแถวเริ่มที่ 2 ต่อเนื่องกัน (ไม่รวมหัวตาราง)', async () => {
    const rows = await readEmployeeRows(REAL_FILE_PATH);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.rowNumber)).toEqual([2, 3, 4, 5, 6]);
  });

  it('ชี้ชีตด้วยชื่อ "Example Data" ไม่ใช่ชีต "Requirement" ที่อยู่ถัดไปในไฟล์เดียวกัน', async () => {
    const rows = await readEmployeeRows(REAL_FILE_PATH);
    // ชีต Requirement มีคอลัมน์ A เป็นชื่อฟิลด์ (ID, Name, Department, ...) ไม่ใช่ตัวเลข ID
    expect(typeof rows[0]?.idCell).toBe('number');
  });

  it('AC-I05: อ่าน status ดิบของแถว ID=104 ได้ "In Active" ไม่ถูกแปลงระหว่างทาง', async () => {
    const rows = await readEmployeeRows(REAL_FILE_PATH);
    const row104 = rows.find((r) => r.idCell === 104);
    expect(row104?.statusCell).toBe('In Active');
  });

  it('เซลล์ join date ของทุกแถวอ่านมาเป็น Date object (รูปแบบที่ไฟล์ถูกจัดไว้)', async () => {
    const rows = await readEmployeeRows(REAL_FILE_PATH);
    for (const row of rows) {
      expect(row.joinDateCell).toBeInstanceOf(Date);
    }
  });

  it('AC-I06: อ่านคอลัมน์ Last Updated Date ของ ID=101 ได้ 2026-01-10 (ใช้เป็น updated_at ของแถวใหม่ตาม D1)', async () => {
    const rows = await readEmployeeRows(REAL_FILE_PATH);
    const row101 = rows.find((r) => r.idCell === 101);
    expect(row101?.lastUpdatedCell).toBeInstanceOf(Date);
    const cell = row101?.lastUpdatedCell as Date;
    expect(cell.toISOString()).toBe('2026-01-10T00:00:00.000Z');
  });
});

describe('readEmployeeRows — กรณีขอบด้วยไฟล์ fixture ชั่วคราว', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ems-xlsx-reader-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it(`โยน MissingSheetError เมื่อไฟล์ไม่มีชีตชื่อ "${EMPLOYEE_SHEET_NAME}"`, async () => {
    const filePath = await writeFixtureWorkbook(dir, (wb) => {
      wb.addWorksheet('Some Other Sheet');
    });
    await expect(readEmployeeRows(filePath)).rejects.toBeInstanceOf(MissingSheetError);
  });

  it('AC-I14: เซลล์ Salary ว่างไม่ทำให้ค่าคอลัมน์อื่นเลื่อนตำแหน่ง (อ่านด้วย cell reference)', async () => {
    const filePath = await writeFixtureWorkbook(dir, (wb) => {
      const ws = wb.addWorksheet(EMPLOYEE_SHEET_NAME);
      ws.addRow(['ID', 'Name', 'Department', 'Salary', 'Join Date', 'Status']);
      const row = ws.addRow([
        201,
        'Empty Salary Person',
        'Engineering',
        null,
        new Date('2023-01-15'),
        'Active',
        new Date('2026-01-10'),
      ]);
      row.getCell('D').value = null;
    });

    const rows = await readEmployeeRows(filePath);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row?.nameCell).toBe('Empty Salary Person');
    expect(row?.departmentCell).toBe('Engineering');
    expect(row?.salaryCell === null || row?.salaryCell === undefined).toBe(true);
    expect(row?.statusCell).toBe('Active');
    expect(row?.lastUpdatedCell).toBeInstanceOf(Date);
  });

  it('อ่านไฟล์ที่มีแค่หัวตารางไม่มีแถวข้อมูล ได้ลิสต์ว่าง', async () => {
    const filePath = await writeFixtureWorkbook(dir, (wb) => {
      const ws = wb.addWorksheet(EMPLOYEE_SHEET_NAME);
      ws.addRow(['ID', 'Name', 'Department', 'Salary', 'Join Date', 'Status', 'Last Updated Date']);
    });

    const rows = await readEmployeeRows(filePath);
    expect(rows).toEqual([]);
  });
});
