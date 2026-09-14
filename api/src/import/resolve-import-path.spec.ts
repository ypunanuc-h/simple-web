import {
  DEFAULT_IMPORT_FILE_PATH,
  IMPORT_FILE_PATH_ENV_VAR,
  resolveImportFilePath,
} from './resolve-import-path';

describe('resolveImportFilePath', () => {
  it('argv[2] ชนะเสมอเมื่อมีการส่งมา', () => {
    const result = resolveImportFilePath(
      ['node', 'seed.js', '/data/custom.xlsx'],
      { [IMPORT_FILE_PATH_ENV_VAR]: '/data/from-env.xlsx' },
    );
    expect(result).toBe('/data/custom.xlsx');
  });

  it('ไม่มี argv ใช้ค่าจาก environment variable', () => {
    const result = resolveImportFilePath(['node', 'seed.js'], {
      [IMPORT_FILE_PATH_ENV_VAR]: '/data/from-env.xlsx',
    });
    expect(result).toBe('/data/from-env.xlsx');
  });

  it('ไม่มีทั้ง argv และ env ใช้ค่าเริ่มต้น example_data/exam_data.xlsx', () => {
    const result = resolveImportFilePath(['node', 'seed.js'], {});
    expect(result).toBe(DEFAULT_IMPORT_FILE_PATH);
  });

  it('argv[2] เป็นสตริงว่าง ถือว่าไม่ได้ส่งมา แล้วตกไปที่ env', () => {
    const result = resolveImportFilePath(['node', 'seed.js', ''], {
      [IMPORT_FILE_PATH_ENV_VAR]: '/data/from-env.xlsx',
    });
    expect(result).toBe('/data/from-env.xlsx');
  });

  it(`ค่าเริ่มต้นคือ "${DEFAULT_IMPORT_FILE_PATH}" ตรงกับคำสั่ง seed แบบไม่ใส่อาร์กิวเมนต์`, () => {
    expect(DEFAULT_IMPORT_FILE_PATH).toBe('example_data/exam_data.xlsx');
  });
});
