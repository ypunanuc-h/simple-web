import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './data-source';
import { HealthController } from './health.controller';
import { CLOCK, SystemClock } from './common/clock';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesRepository } from './employees/employees.repository';
import { EmployeesService } from './employees/employees.service';
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';

@Module({
  imports: [TypeOrmModule.forRoot(buildDataSourceOptions())],
  controllers: [HealthController, EmployeesController, DepartmentsController],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    EmployeesRepository,
    EmployeesService,
    DepartmentsService,
  ],
  exports: [CLOCK],
})
export class AppModule {}
