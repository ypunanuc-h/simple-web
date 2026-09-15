import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../common/domain-error';
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
}

export interface EmployeeListResult {
  employees: readonly EmployeeReadRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * จุดรวมตรรกะ query ของ S2: จะเติม default และ id ASC ตาม D11 ในขั้น Implement
 */
export function createEmployeeListCommand(input: {
  sort?: EmployeeSortField;
  order?: SortOrder;
  page?: number;
  pageSize?: number;
}): EmployeeListCommand {
  const sort = input.sort ?? 'id';
  const order = input.order ?? 'asc';
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;
  const orderBy: EmployeeListCommand['orderBy'] =
    sort === 'id'
      ? ['id', order]
      : [sort, order, 'id', 'asc'];

  return { sort, order, page, pageSize, orderBy };
}

@Injectable()
export class EmployeesService {
  constructor(private readonly employeesRepository: EmployeesRepository) {}

  async list(input: {
    sort?: EmployeeSortField;
    order?: SortOrder;
    page?: number;
    pageSize?: number;
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
}
