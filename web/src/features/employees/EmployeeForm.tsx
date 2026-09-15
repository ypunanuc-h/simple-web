import { useState, type FormEvent } from 'react';
import type { Employee, EmployeeDepartment } from '../../lib/api-client';
import { buildEmployeePayload, type EmployeeFormValues, type EmployeeInput } from '../../lib/employee-payload';

interface EmployeeFormProps {
  readonly mode: 'create' | 'edit';
  readonly departments: readonly EmployeeDepartment[];
  readonly initialEmployee?: Employee;
  readonly onSubmit: (payload: EmployeeInput) => Promise<void>;
  readonly onCancel: () => void;
}

function toFormValues(employee: Employee | undefined): EmployeeFormValues {
  if (employee === undefined) {
    return { name: '', departmentId: '', salary: '', joinDate: '', isActive: true };
  }
  return {
    name: employee.name,
    departmentId: String(employee.department.id),
    salary: employee.salary,
    joinDate: employee.join_date,
    isActive: employee.is_active,
  };
}

const inputClass =
  'mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';
const readOnlyInputClass =
  'mt-1 block w-full rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500';
const labelClass = 'block text-sm text-gray-600';

export function EmployeeForm({ mode, departments, initialEmployee, onSubmit, onCancel }: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeFormValues>(() => toFormValues(initialEmployee));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(buildEmployeePayload(values));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-[280px] flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand">{mode === 'create' ? 'เพิ่มพนักงาน' : 'แก้ไขพนักงาน'}</h2>

      {mode === 'edit' && initialEmployee !== undefined && (
        <>
          <label className={labelClass}>
            ID
            <input type="text" value={initialEmployee.id} readOnly disabled className={readOnlyInputClass} />
          </label>
          <label className={labelClass}>
            Last Updated Date
            <input type="text" value={initialEmployee.updated_at} readOnly disabled className={readOnlyInputClass} />
          </label>
        </>
      )}

      <label className={labelClass}>
        Name
        <input
          type="text"
          required
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Department
        <select
          required
          value={values.departmentId}
          onChange={(event) => setValues({ ...values, departmentId: event.target.value })}
          className={inputClass}
        >
          <option value="" disabled>
            เลือกแผนก
          </option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Salary
        <input
          type="text"
          inputMode="decimal"
          required
          value={values.salary}
          onChange={(event) => setValues({ ...values, salary: event.target.value })}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Join Date
        <input
          type="date"
          required
          value={values.joinDate}
          onChange={(event) => setValues({ ...values, joinDate: event.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(event) => setValues({ ...values, isActive: event.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
        />
        Active
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </form>
  );
}
