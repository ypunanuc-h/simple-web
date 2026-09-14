import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SystemClock } from './common/clock';
import { buildDataSourceOptions } from './data-source';
import { importFromFile } from './import/import.service';
import { formatSkippedRowLogLine, formatSummaryLogLine } from './import/log-format';
import { resolveImportFilePath } from './import/resolve-import-path';

/**
 * คำสั่ง seed แบบ one-off ตาม CLAUDE.md §7 — `docker compose run --rm api npm run seed`
 * ไม่มี route หรือปุ่มใดใน UI เรียกไฟล์นี้ (AC-I20) ไฟล์นี้เป็นแค่ตัวประกอบ (wiring)
 * ตรรกะจริงทั้งหมดอยู่ใน import.service.ts และไฟล์ที่มันเรียกใช้ ซึ่งมีเทสต์ของตัวเองแล้ว
 */
async function main(): Promise<void> {
  const filePath = resolveImportFilePath(process.argv, process.env);
  const dataSource = new DataSource(buildDataSourceOptions());

  await dataSource.initialize();
  try {
    const result = await importFromFile(dataSource, filePath, new SystemClock());

    for (const skip of result.skippedRows) {
      console.log(formatSkippedRowLogLine(skip));
    }
    console.log(formatSummaryLogLine(result));
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  // AC-N10 spirit ขยายมาถึงเครื่องมือฝั่ง server ด้วย — log ให้ตามรอยได้เต็ม ๆ ที่นี่
  // เพราะเป็นคำสั่ง one-off ไม่มี exception filter ของ HTTP มาคอยดักให้
  console.error('[import] ล้มเหลว:', error);
  process.exitCode = 1;
});
