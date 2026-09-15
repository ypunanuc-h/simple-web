import { IsBoolean, IsOptional } from 'class-validator';
import { EmployeeWriteFieldsDto } from './employee-write-fields.dto';

/** is_active ไม่ส่งมาได้ ค่าเริ่มต้นคือ true ตาม DDL (AC-E04) */
export class CreateEmployeeDto extends EmployeeWriteFieldsDto {
  @IsOptional()
  @IsBoolean({ context: { rule: 'type' } })
  is_active?: boolean;
}
