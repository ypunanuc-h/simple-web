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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 280 }}>
      <h2 style={{ margin: 0 }}>{mode === 'create' ? 'เพิ่มพนักงาน' : 'แก้ไขพนักงาน'}</h2>

      {mode === 'edit' && initialEmployee !== undefined && (
        <>
          <label>
            ID
            <input type="text" value={initialEmployee.id} readOnly disabled style={{ display: 'block', width: '100%' }} />
          </label>
          <label>
            Last Updated Date
            <input
              type="text"
              value={initialEmployee.updated_at}
              readOnly
              disabled
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </>
      )}

      <label>
        Name
        <input
          type="text"
          required
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <label>
        Department
        <select
          required
          value={values.departmentId}
          onChange={(event) => setValues({ ...values, departmentId: event.target.value })}
          style={{ display: 'block', width: '100%' }}
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

      <label>
        Salary
        <input
          type="text"
          inputMode="decimal"
          required
          value={values.salary}
          onChange={(event) => setValues({ ...values, salary: event.target.value })}
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <label>
        Join Date
        <input
          type="date"
          required
          value={values.joinDate}
          onChange={(event) => setValues({ ...values, joinDate: event.target.value })}
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(event) => setValues({ ...values, isActive: event.target.checked })}
        />{' '}
        Active
      </label>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} disabled={submitting}>
          ยกเลิก
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </form>
  );
}
