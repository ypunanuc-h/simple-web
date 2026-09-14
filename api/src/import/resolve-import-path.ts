/**
 * ตัดสินว่าจะ import ไฟล์ไหน ตามลำดับความสำคัญ argv > env > ค่าเริ่มต้น
 * ทำให้ seed.ts รับ path เป็นอาร์กิวเมนต์ได้ ไม่ผูกกับชื่อไฟล์ตายตัว
 * ในขณะที่ `docker compose run --rm api npm run seed` แบบไม่ใส่อะไรยังใช้ได้เหมือนเดิม
 */

export const DEFAULT_IMPORT_FILE_PATH = 'example_data/exam_data.xlsx';
export const IMPORT_FILE_PATH_ENV_VAR = 'IMPORT_FILE_PATH';

/**
 * argv คือ process.argv ทั้งชุด (รวม node กับชื่อสคริปต์สองตัวแรก) ตามธรรมเนียมของ Node
 * ลำดับ — argv[2] (อาร์กิวเมนต์แรกที่ผู้ใช้ส่งจริง) > env.IMPORT_FILE_PATH > ค่าเริ่มต้น
 */
export function resolveImportFilePath(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): string {
  const fromArgv = argv[2];
  if (fromArgv !== undefined && fromArgv !== '') {
    return fromArgv;
  }

  const fromEnv = env[IMPORT_FILE_PATH_ENV_VAR];
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv;
  }

  return DEFAULT_IMPORT_FILE_PATH;
}
