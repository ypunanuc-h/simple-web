import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
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
      q: query.q,
      departmentId: query.department_id,
      isActive: query.is_active,
      joinDateFrom: query.join_date_from,
      joinDateTo: query.join_date_to,
      salaryMin: query.salary_min,
      salaryMax: query.salary_max,
    });
    return this.toListResponse(result);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<EmployeeResponse> {
    return this.toEmployeeResponse(await this.employeesService.findOne(id));
  }

  @Post()
  async create(
    @Body() dto: CreateEmployeeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EmployeeResponse> {
    const employee = await this.employeesService.create({
      name: dto.name,
      departmentId: dto.department_id,
      salary: dto.salary,
      joinDate: dto.join_date,
      isActive: dto.is_active,
    });
    res.setHeader('Location', `/api/employees/${employee.id}`);
    res.status(HttpStatus.CREATED);
    return this.toEmployeeResponse(employee);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponse> {
    const employee = await this.employeesService.update(id, {
      name: dto.name,
      departmentId: dto.department_id,
      salary: dto.salary,
      joinDate: dto.join_date,
      isActive: dto.is_active,
    });
    return this.toEmployeeResponse(employee);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.employeesService.delete(id);
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
