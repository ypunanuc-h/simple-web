import { Controller, Get } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

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
    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      employee_count: department.employeeCount,
    }));
  }
}
