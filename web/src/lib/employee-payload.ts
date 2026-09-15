export interface EmployeeFormValues {
  readonly name: string;
  readonly departmentId: string;
  readonly salary: string;
  readonly joinDate: string;
  readonly isActive: boolean;
}

export interface EmployeeInput {
  readonly name: string;
  readonly department_id: number;
  readonly salary: string;
  readonly join_date: string;
  readonly is_active: boolean;
}

/**
 * แปลงค่าจากฟอร์มสร้าง/แก้ไขพนักงานเป็น request body ของ POST/PUT /api/employees
 * ตาม D10 ห้ามมี id ปนมาในผลลัพธ์เด็ดขาด ไม่ว่าโหมดสร้างหรือแก้ไข
 */
export function buildEmployeePayload(values: EmployeeFormValues): EmployeeInput {
  return {
    name: values.name.trim(),
    department_id: Number(values.departmentId),
    salary: values.salary,
    join_date: values.joinDate,
    is_active: values.isActive,
  };
}
