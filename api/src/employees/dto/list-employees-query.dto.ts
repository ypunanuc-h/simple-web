import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const EMPLOYEE_SORT_FIELDS = [
  'id',
  'name',
  'salary',
  'join_date',
  'updated_at',
] as const;

export const SORT_ORDERS = ['asc', 'desc'] as const;

export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_STRING_PATTERN = /^\d+(\.\d{1,2})?$/;

/** sort=department (AC-L15) ยังไม่ทำในสไลซ์นี้ */
export class ListEmployeesQueryDto {
  @IsOptional()
  @IsIn(EMPLOYEE_SORT_FIELDS)
  sort?: EmployeeSortField;

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  department_id?: number;

  /** query string เป็น string เสมอ ต้องแม็พ "true"/"false" ตรง ๆ เท่านั้น ค่าอื่นปล่อยให้ IsBoolean() ปฏิเสธ (AC-L24) */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;

  /** ล็อกรูปแบบเป็น YYYY-MM-DD ก่อน แล้วค่อยตรวจว่าเป็นวันที่จริงตามปฏิทินด้วย strict: true */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  @IsDateString({ strict: true })
  join_date_from?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  @IsDateString({ strict: true })
  join_date_to?: string;

  @IsOptional()
  @Matches(DECIMAL_STRING_PATTERN)
  salary_min?: string;

  @IsOptional()
  @Matches(DECIMAL_STRING_PATTERN)
  salary_max?: string;
}
