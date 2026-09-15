import { Transform, Type } from 'class-transformer';
import { IsInt, IsString } from 'class-validator';

/**
 * ฟิลด์ร่วมของ POST/PUT — is_active ต่างกัน (optional ใน POST, required ใน PUT ตาม D8)
 * จึงแยกประกาศใน CreateEmployeeDto/UpdateEmployeeDto เอง
 *
 * ที่นี่ตรวจแค่ "ชนิด" ของแต่ละฟิลด์ (required/type) เท่านั้น ไม่ตรวจ "ค่า" เลย
 * (ความยาวของ name, ขอบเขตของ department_id, รูปแบบของ salary/join_date) เพราะ
 * ValidationPipe หยุดที่ DTO ทันทีเมื่อเจอ error แรก ทำให้ error จากชั้นอื่นไม่มีโอกาส
 * ได้ทำงานเลย ถ้าปล่อยให้ DTO ตรวจ "ค่า" ด้วย AC-V18 (รายงานทุกช่องที่ผิดพร้อมกัน)
 * จะพังทันทีที่มีทั้ง DTO error และ service error ปนกันในคำขอเดียว — กฎเรื่อง "ค่า"
 * ทั้งหมดจึงย้ายไปรวมที่ EmployeesService.validateWriteFields() แทน
 */
export abstract class EmployeeWriteFieldsDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ context: { rule: 'required' } })
  name!: string;

  @Type(() => Number)
  @IsInt({ context: { rule: 'required' } })
  department_id!: number;

  @IsString({ context: { rule: 'required' } })
  salary!: string;

  @IsString({ context: { rule: 'required' } })
  join_date!: string;
}
