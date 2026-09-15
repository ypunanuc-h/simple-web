import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

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

/** DTO ของ S2: q/filter และ sort=department อยู่ S4/รายการเพิ่ม จึงไม่ประกาศที่นี่ */
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
}
