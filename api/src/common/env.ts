/**
 * อ่านค่าจาก environment แบบบังคับให้มีจริง
 * ตั้งใจโยน error ตั้งแต่ตอนบูต แทนการปล่อยให้ค่า undefined ไหลลงไปถึง driver
 * แล้วไปพังด้วยข้อความที่อ่านไม่รู้เรื่องตอน query แรก
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`missing required environment variable: ${name}`);
  }
  return value;
}

export function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}
