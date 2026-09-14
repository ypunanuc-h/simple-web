/**
 * ตั้งค่า environment ของเทสต์ก่อนอย่างอื่นทั้งหมด
 *
 * TZ=UTC เป็นค่าเริ่มต้นตาม CLAUDE.md หัวข้อ 6 แต่ต้องมีเทสต์ import อย่างน้อย
 * หนึ่งตัวที่ตั้ง TZ เป็นค่าอื่นแล้วยืนยันว่าได้วันเดียวกัน (AC-I04)
 *
 * เทสต์รันบนเครื่อง ไม่ได้รันในคอนเทนเนอร์ จึงต่อผ่าน localhost กับพอร์ตที่
 * compose publish ออกมา และชี้ไปที่ฐานข้อมูล ems_test คนละตัวกับ dev
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadRootEnvFile(): Map<string, string> {
  const values = new Map<string, string>();
  try {
    const raw = readFileSync(resolve(__dirname, '..', '..', '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      values.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
    }
  } catch {
    // ไม่มีไฟล์ .env ก็ใช้ค่าตั้งต้นด้านล่าง ไม่ถือว่าผิดพลาด
  }
  return values;
}

const rootEnv = loadRootEnvFile();

function pick(key: string, fallback: string): string {
  return process.env[key] ?? rootEnv.get(key) ?? fallback;
}

process.env.TZ = 'UTC';
process.env.DB_HOST = pick('TEST_DB_HOST', 'localhost');
process.env.DB_PORT = pick('TEST_DB_PORT', '55432');
process.env.DB_USER = pick('POSTGRES_USER', 'ems');
process.env.DB_PASSWORD = pick('POSTGRES_PASSWORD', 'ems_local_password');
process.env.DB_NAME = pick('TEST_DB_NAME', 'ems_test');
