import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/data-source';

/** ใช้ options ชุดเดียวกับแอป ต่างกันแค่ฐานข้อมูลปลายทางที่ test/env.ts ตั้งไว้ */
export function createTestDataSource(): DataSource {
  return new DataSource(buildDataSourceOptions());
}

/**
 * ล้างข้อมูลระหว่างเทสต์ตาม CLAUDE.md หัวข้อ 6 ที่บังคับว่าแต่ละเทสต์
 * ต้องรันซ้ำได้และไม่ขึ้นกับลำดับ
 * RESTART IDENTITY สำคัญ เพราะเทสต์ของ AC-I07 ดูค่า sequence ตรง ๆ
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    'TRUNCATE TABLE "employees", "departments" RESTART IDENTITY CASCADE',
  );
}
