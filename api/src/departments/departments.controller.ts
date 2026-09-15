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
} from '@nestjs/common';
import { DepartmentNameDto } from './dto/department-name.dto';
import { DepartmentsService } from './departments.service';
import type { DepartmentReadRow } from './departments.repository';

interface DepartmentResponse {
  id: number;
  name: string;
  employee_count: number;
}

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async list(): Promise<DepartmentResponse[]> {
    const departments = await this.departmentsService.list();
    return departments.map((department) => this.toResponse(department));
  }

  @Post()
  async create(@Body() dto: DepartmentNameDto): Promise<DepartmentResponse> {
    const department = await this.departmentsService.create(dto.name);
    return this.toResponse(department);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DepartmentNameDto,
  ): Promise<DepartmentResponse> {
    const department = await this.departmentsService.update(id, dto.name);
    return this.toResponse(department);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.departmentsService.delete(id);
  }

  private toResponse(department: DepartmentReadRow): DepartmentResponse {
    return {
      id: department.id,
      name: department.name,
      employee_count: department.employeeCount,
    };
  }
}
