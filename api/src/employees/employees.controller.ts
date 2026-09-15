import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { EmployeesService, type EmployeeListResult } from './employees.service';
import type { EmployeeReadRow } from './employees.repository';

interface EmployeeResponse {
  id: number;
  name: string;
  department: { id: number; name: string };
  salary: string;
  join_date: string;
  is_active: boolean;
  updated_at: string;
}

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async list(@Query() query: ListEmployeesQueryDto): Promise<{
    data: readonly EmployeeResponse[];
    meta: { page: number; page_size: number; total: number; total_pages: number };
  }> {
    const result = await this.employeesService.list({
      sort: query.sort,
      order: query.order,
      page: query.page,
      pageSize: query.page_size,
    });
    return this.toListResponse(result);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<EmployeeResponse> {
    return this.toEmployeeResponse(await this.employeesService.findOne(id));
  }

  private toListResponse(result: EmployeeListResult): {
    data: readonly EmployeeResponse[];
    meta: { page: number; page_size: number; total: number; total_pages: number };
  } {
    return {
      data: result.employees.map((employee) => this.toEmployeeResponse(employee)),
      meta: {
        page: result.page,
        page_size: result.pageSize,
        total: result.total,
        total_pages: result.totalPages,
      },
    };
  }

  private toEmployeeResponse(employee: EmployeeReadRow): EmployeeResponse {
    return {
      id: employee.id,
      name: employee.name,
      department: { id: employee.departmentId, name: employee.departmentName },
      salary: employee.salary,
      join_date: employee.joinDate,
      is_active: employee.isActive,
      updated_at: employee.updatedAt.toISOString(),
    };
  }
}
