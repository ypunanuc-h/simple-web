import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DepartmentEntity } from './departments/department.entity';
import { EmployeeEntity } from './employees/employee.entity';
import { envOrDefault, requireEnv } from './common/env';
import { Init1789344000000 } from './migrations/1789344000000-Init';

/**
 * synchronize: false เสมอทุกสภาพแวดล้อมรวมถึงตอน dev ตาม CLAUDE.md
 * schema ถูกตรึงไว้ใน SPEC.md หัวข้อ 2 แล้ว เปลี่ยนผ่าน migration เท่านั้น
 */
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: envOrDefault('DB_HOST', 'localhost'),
    port: Number(envOrDefault('DB_PORT', '5432')),
    username: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
    entities: [EmployeeEntity, DepartmentEntity],
    // ส่ง migration เป็นคลาสตรง ๆ ไม่ใช้ glob เพราะ glob ทำให้ TypeORM
    // dynamic import ไฟล์ .ts ตอน runtime ซึ่งพังบน Node 24
    // และทำให้แอปกับเทสต์เดินเส้นทางเดียวกัน
    migrations: [Init1789344000000],
    synchronize: false,
    logging: false,
  };
}

export default new DataSource(buildDataSourceOptions());
