import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DepartmentInUseError, DuplicateNameError, ResourceNotFoundError } from '../common/domain-error';
import {
  countEmployeesInDepartment,
  createDepartment,
  deleteDepartmentById,
  departmentExists,
  findAllDepartmentsWithEmployeeCount,
  updateDepartmentName,
  type DepartmentReadRow,
} from './departments.repository';
import { findDuplicateDepartment } from './duplicate-name';

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

  async create(name: string): Promise<DepartmentReadRow> {
    const existing = await findAllDepartmentsWithEmployeeCount(this.dataSource);
    const duplicate = findDuplicateDepartment(existing, name);
    if (duplicate !== undefined) {
      throw new DuplicateNameError(name);
    }

    const created = await this.dataSource.transaction((manager) => createDepartment(manager, name));
    return { id: created.id, name: created.name, employeeCount: 0 };
  }

  async update(id: number, name: string): Promise<DepartmentReadRow> {
    const existing = await findAllDepartmentsWithEmployeeCount(this.dataSource);
    const current = existing.find((department) => department.id === id);
    if (current === undefined) {
      throw new ResourceNotFoundError('department', id);
    }

    const duplicate = findDuplicateDepartment(existing, name, id);
    if (duplicate !== undefined) {
      throw new DuplicateNameError(name);
    }

    await this.dataSource.transaction((manager) => updateDepartmentName(manager, id, name));
    return { id, name, employeeCount: current.employeeCount };
  }

  async delete(id: number): Promise<void> {
    const employeeCount = await countEmployeesInDepartment(this.dataSource, id);
    if (employeeCount > 0) {
      throw new DepartmentInUseError(id, employeeCount);
    }

    const deleted = await this.dataSource.transaction((manager) => deleteDepartmentById(manager, id));
    if (!deleted) {
      throw new ResourceNotFoundError('department', id);
    }
  }
}
