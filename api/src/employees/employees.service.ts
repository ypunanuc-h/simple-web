import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock';
import { ResourceNotFoundError, ValidationFailedError, type FieldErrorDetail } from '../common/domain-error';
import { DepartmentsService } from '../departments/departments.service';
import { validateJoinDate, validateName, validateSalary } from './employee-field-validators';
import { hasEmployeeDataChanged } from './employee-diff';
import {
  EmployeesRepository,
  type EmployeeReadRow,
} from './employees.repository';
import type { EmployeeSortField, SortOrder } from './dto/list-employees-query.dto';

export interface EmployeeListCommand {
  sort: EmployeeSortField;
  order: SortOrder;
  page: number;
  pageSize: number;
  orderBy: readonly [EmployeeSortField, SortOrder] | readonly [EmployeeSortField, SortOrder, 'id', 'asc'];
  q?: string;
  departmentId?: number;
  isActive?: boolean;
  joinDateFrom?: string;
  joinDateTo?: string;
  salaryMin?: string;
  salaryMax?: string;
}

export interface EmployeeListResult {
  employees: readonly EmployeeReadRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * จุดรวมตรรกะ query — เติม default, id ASC ตาม D11, และ normalize ฟิลด์ filter ของ S4
 * ฟิลด์ filter อื่นนอกจาก q ผ่าน DTO ตรวจ/แปลงชนิดมาแล้ว จึงส่งต่อตรง ๆ ไม่มีตรรกะเพิ่ม
 * q ตัดช่องว่างหัวท้ายก่อน แล้วถือว่าไม่ได้ส่งถ้าว่างหลังตัด (AC-L04/L05)
 */
export function createEmployeeListCommand(input: {
  sort?: EmployeeSortField;
  order?: SortOrder;
  page?: number;
  pageSize?: number;
  q?: string;
  departmentId?: number;
  isActive?: boolean;
  joinDateFrom?: string;
  joinDateTo?: string;
  salaryMin?: string;
  salaryMax?: string;
}): EmployeeListCommand {
  const sort = input.sort ?? 'id';
  const order = input.order ?? 'asc';
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;
  const orderBy: EmployeeListCommand['orderBy'] =
    sort === 'id'
      ? ['id', order]
      : [sort, order, 'id', 'asc'];

  const trimmedQ = input.q?.trim();
  const q = trimmedQ === undefined || trimmedQ === '' ? undefined : trimmedQ;

  return {
    sort,
    order,
    page,
    pageSize,
    orderBy,
    q,
    departmentId: input.departmentId,
    isActive: input.isActive,
    joinDateFrom: input.joinDateFrom,
    joinDateTo: input.joinDateTo,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
  };
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly departmentsService: DepartmentsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(input: {
    sort?: EmployeeSortField;
    order?: SortOrder;
    page?: number;
    pageSize?: number;
    q?: string;
    departmentId?: number;
    isActive?: boolean;
    joinDateFrom?: string;
    joinDateTo?: string;
    salaryMin?: string;
    salaryMax?: string;
  }): Promise<EmployeeListResult> {
    const command = createEmployeeListCommand(input);
    const page = await this.employeesRepository.findPage(command);
    return {
      employees: page.rows,
      page: command.page,
      pageSize: command.pageSize,
      total: page.total,
      totalPages: Math.ceil(page.total / command.pageSize),
    };
  }

  async findOne(id: number): Promise<EmployeeReadRow> {
    const employee = await this.employeesRepository.findById(id);
    if (employee === null) {
      throw new ResourceNotFoundError('employee', id);
    }
    return employee;
  }

  async create(input: {
    name: string;
    departmentId: number;
    salary: string;
    joinDate: string;
    isActive?: boolean;
  }): Promise<EmployeeReadRow> {
    const details = await this.validateWriteFields(
      input.name,
      input.salary,
      input.joinDate,
      input.departmentId,
    );
    if (details.length > 0) {
      throw new ValidationFailedError(details);
    }

    const id = await this.employeesRepository.insert({
      name: input.name,
      departmentId: input.departmentId,
      salary: input.salary,
      joinDate: input.joinDate,
      isActive: input.isActive ?? true,
      updatedAt: this.clock.now(),
    });

    return this.findOne(id);
  }

  async update(
    id: number,
    input: {
      name: string;
      departmentId: number;
      salary: string;
      joinDate: string;
      isActive: boolean;
    },
  ): Promise<EmployeeReadRow> {
    const current = await this.employeesRepository.findById(id);
    if (current === null) {
      throw new ResourceNotFoundError('employee', id);
    }

    const details = await this.validateWriteFields(
      input.name,
      input.salary,
      input.joinDate,
      input.departmentId,
    );
    if (details.length > 0) {
      throw new ValidationFailedError(details);
    }

    // D2 — stamp now() เฉพาะเมื่อค่าเปลี่ยนจริง ไม่งั้นคงค่า updated_at เดิมไว้ (AC-U02)
    const changed = hasEmployeeDataChanged(
      {
        name: current.name,
        departmentId: current.departmentId,
        salary: current.salary,
        joinDate: current.joinDate,
        isActive: current.isActive,
      },
      {
        name: input.name,
        departmentId: input.departmentId,
        salary: input.salary,
        joinDate: input.joinDate,
        isActive: input.isActive,
      },
    );

    if (!changed) {
      return current;
    }

    await this.employeesRepository.update({
      id,
      name: input.name,
      departmentId: input.departmentId,
      salary: input.salary,
      joinDate: input.joinDate,
      isActive: input.isActive,
      updatedAt: this.clock.now(),
    });

    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    const deleted = await this.employeesRepository.deleteById(id);
    if (!deleted) {
      throw new ResourceNotFoundError('employee', id);
    }
  }

  /** รวมกฎที่ DTO ตรวจเองไม่ได้ (หลาย rule code ในฟิลด์เดียว, ต้อง query DB) ไว้ที่เดียว รายงานทุกช่องที่ผิดพร้อมกัน (AC-V18) */
  private async validateWriteFields(
    name: string,
    salary: string,
    joinDate: string,
    departmentId: number,
  ): Promise<FieldErrorDetail[]> {
    const details: FieldErrorDetail[] = [];

    const nameError = validateName(name);
    if (nameError !== null) details.push(nameError);

    const salaryError = validateSalary(salary);
    if (salaryError !== null) details.push(salaryError);

    const joinDateError = validateJoinDate(joinDate);
    if (joinDateError !== null) details.push(joinDateError);

    if (!(await this.departmentsService.exists(departmentId))) {
      details.push({ field: 'department_id', rule: 'not_found', message: 'ไม่พบแผนกที่ระบุ' });
    }

    return details;
  }
}
