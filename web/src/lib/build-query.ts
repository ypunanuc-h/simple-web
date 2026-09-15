export interface EmployeeFilterFormValues {
  readonly q: string;
  readonly departmentId: string;
  readonly isActive: '' | 'true' | 'false';
  readonly joinDateFrom: string;
  readonly joinDateTo: string;
  readonly salaryMin: string;
  readonly salaryMax: string;
}

/**
 * ประกอบ query string จากฟอร์ม filter — ฟิลด์ที่ไม่ได้กรอก (ว่างหลัง trim) ไม่ใส่ลงไปเลย
 * ตาม SPEC.md §4.3 ที่ถือว่าพารามิเตอร์ที่ไม่ได้ส่งมา = ไม่กรอง ไม่ใช่กรองด้วยค่าว่าง
 */
export function buildEmployeeQuery(values: EmployeeFilterFormValues): string {
  const params = new URLSearchParams();

  const q = values.q.trim();
  if (q !== '') params.set('q', q);
  if (values.departmentId !== '') params.set('department_id', values.departmentId);
  if (values.isActive !== '') params.set('is_active', values.isActive);
  if (values.joinDateFrom !== '') params.set('join_date_from', values.joinDateFrom);
  if (values.joinDateTo !== '') params.set('join_date_to', values.joinDateTo);
  if (values.salaryMin !== '') params.set('salary_min', values.salaryMin);
  if (values.salaryMax !== '') params.set('salary_max', values.salaryMax);

  return params.toString();
}
