import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * ชื่อคอลัมน์ระบุ name: ทุกตัวตาม CLAUDE.md หัวข้อ 5
 * ห้ามพึ่ง naming strategy เพราะ SPEC.md หัวข้อ 2 ตรึงชื่อไว้แล้ว
 *
 * เครื่องหมาย ! ที่นี่คือ definite assignment ของ property ที่ TypeORM เป็นผู้เซ็ตให้
 * ไม่ใช่ non-null assertion ทับค่าที่มาจากภายนอก ซึ่งเป็นสิ่งที่ CLAUDE.md ห้าม
 */
@Entity({ name: 'departments' })
export class DepartmentEntity {
  @PrimaryGeneratedColumn('identity', {
    name: 'id',
    generatedIdentity: 'BY DEFAULT',
  })
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 100, unique: true })
  name!: string;
}
