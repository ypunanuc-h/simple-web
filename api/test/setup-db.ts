import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/data-source';

const TEST_DATABASE_SUFFIX = '_test';

/**
 * กันไม่ให้เทสต์ไปแตะฐานข้อมูลที่ไม่ใช่ของเทสต์
 *
 * เหตุผล — truncateAll ลบข้อมูลทั้งตาราง ถ้า .env ถูกแก้ผิด หรือมีใครตั้ง
 * DB_NAME ค้างไว้ใน shell เทสต์จะล้างฐานข้อมูล dev ทิ้งทั้งชุดโดยไม่มีสัญญาณเตือน
 * และข้อมูลที่ seed มาจาก S1 จะหายไปเงียบ ๆ กลางการสาธิต
 */
function assertTestDatabase(database: unknown): void {
  if (typeof database !== 'string' || !database.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `เทสต์ต้องชี้ไปที่ฐานข้อมูลที่ลงท้ายด้วย "${TEST_DATABASE_SUFFIX}" เท่านั้น ` +
        `แต่ได้ "${String(database)}" — ตรวจค่า TEST_DB_NAME ในไฟล์ .env`,
    );
  }
}

/** ใช้ options ชุดเดียวกับแอป ต่างกันแค่ฐานข้อมูลปลายทางที่ test/env.ts ตั้งไว้ */
export function createTestDataSource(): DataSource {
  const options = buildDataSourceOptions();
  assertTestDatabase(options.database);
  return new DataSource(options);
}

/**
 * ล้างข้อมูลระหว่างเทสต์ตาม CLAUDE.md หัวข้อ 6 ที่บังคับว่าแต่ละเทสต์
 * ต้องรันซ้ำได้และไม่ขึ้นกับลำดับ
 * RESTART IDENTITY สำคัญ เพราะเทสต์ของ AC-I07 ดูค่า sequence ตรง ๆ
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  // ตรวจซ้ำที่นี่ด้วย เพราะนี่คือคำสั่งที่ลบข้อมูลจริง ไม่ใช่แค่การเปิดการเชื่อมต่อ
  assertTestDatabase(dataSource.options.database);
  await dataSource.query(
    'TRUNCATE TABLE "employees", "departments" RESTART IDENTITY CASCADE',
  );
}
