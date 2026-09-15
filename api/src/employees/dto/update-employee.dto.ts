import { IsBoolean } from 'class-validator';
import { EmployeeWriteFieldsDto } from './employee-write-fields.dto';

/** PUT ต้องส่งทุกช่องเสมอตาม D8 — is_active บังคับ ไม่มีค่าเริ่มต้น (AC-E05) */
export class UpdateEmployeeDto extends EmployeeWriteFieldsDto {
  @IsBoolean({ context: { rule: 'type' } })
  is_active!: boolean;
}
