import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DepartmentEntity } from '../departments/department.entity';

/**
 * salary เป็น string ตาม D7 และ join_date เป็น string YYYY-MM-DD ตาม D9
 * ห้ามเปลี่ยนเป็น number หรือ Date ที่จุดใดเลย
 *
 * updated_at ไม่ใช้ @UpdateDateColumn โดยเจตนา เพราะการ auto-stamp
 * จะทับกฎ D1 และ D2 ทั้งคู่ ให้ service เซ็ตค่าเองหลังเทียบว่าข้อมูลเปลี่ยนจริง
 */
@Entity({ name: 'employees' })
export class EmployeeEntity {
  @PrimaryGeneratedColumn('identity', {
    name: 'id',
    generatedIdentity: 'BY DEFAULT',
  })
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'department_id', type: 'int' })
  departmentId!: number;

  @Column({ name: 'salary', type: 'decimal', precision: 12, scale: 2 })
  salary!: string;

  @Column({ name: 'join_date', type: 'date' })
  joinDate!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => DepartmentEntity)
  @JoinColumn({ name: 'department_id' })
  department?: DepartmentEntity;
}
