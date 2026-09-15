import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  departmentExists,
  findAllDepartmentsWithEmployeeCount,
  type DepartmentReadRow,
} from './departments.repository';

@Injectable()
export class DepartmentsService {
  constructor(private readonly dataSource: DataSource) {}

  async list(): Promise<DepartmentReadRow[]> {
    return findAllDepartmentsWithEmployeeCount(this.dataSource);
  }

  /** ใช้โดย EmployeesService ตรวจ department_id ก่อนเขียนตาม AC-V04 — service คุยกับ service ข้ามฟีเจอร์ ไม่ใช่แตะ repository ของฟีเจอร์อื่นตรง ๆ */
  async exists(id: number): Promise<boolean> {
    return departmentExists(this.dataSource, id);
  }
}
