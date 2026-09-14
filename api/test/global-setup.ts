import './env';
import { createTestDataSource } from './setup-db';

/**
 * รัน migration ใส่ฐานข้อมูลเทสต์หนึ่งครั้งก่อนเริ่ม suite
 * พิสูจน์ไปในตัวว่า migration รันจากฐานข้อมูลเปล่าจนถึงสถานะปัจจุบันได้
 * โดยไม่ต้องแก้มือ ตามที่ CLAUDE.md กำหนด
 */
export default async function globalSetup(): Promise<void> {
  const dataSource = createTestDataSource();
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}
