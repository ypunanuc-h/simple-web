import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

/**
 * ใช้ร่วมกันทั้ง POST และ PUT — SPEC.md §4.5 ทั้งสอง method รับ body เดียวกันคือ { name }
 * ต่างจาก employee ที่ POST/PUT มี is_active ต่างกัน จึงไม่ต้องแยกคลาส
 *
 * ตรวจ "ค่า" (length) ในนี้ได้เลย ต่างจาก employee-write-fields.dto.ts เพราะมีฟิลด์เดียว
 * ไม่มีปัญหา ValidationPipe หยุดที่ error แรกแล้วบัง error ของฟิลด์อื่น (ไม่มี AC-V18
 * เทียบเท่าสำหรับ department)
 */
export class DepartmentNameDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ context: { rule: 'required' } })
  @Length(1, 100, { context: { rule: 'length' } })
  name!: string;
}
