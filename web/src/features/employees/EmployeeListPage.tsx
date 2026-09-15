import { useEffect, useState, type FormEvent } from 'react';
import {
  fetchDepartments,
  fetchEmployees,
  type Employee,
  type EmployeeDepartment,
} from '../../lib/api-client';
import { buildEmployeeQuery, type EmployeeFilterFormValues } from '../../lib/build-query';
import { formatSalary } from '../../lib/format';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; employees: readonly Employee[] };

const EMPTY_FILTERS: EmployeeFilterFormValues = {
  q: '',
  departmentId: '',
  isActive: '',
  joinDateFrom: '',
  joinDateTo: '',
  salaryMin: '',
  salaryMax: '',
};

/**
 * ตัดสตริง ISO ตรง ๆ ไม่ผ่าน Date object เลยแม้แต่ก้าวเดียว เพื่อไม่ให้ timezone
 * ของเครื่องที่เปิดหน้าเว็บมีผลกับค่าที่แสดง ตาม SPEC.md §2.1 ที่ระบุว่า
 * Last Updated Date เป็น read-only และต้องแสดงเป็นเวลา UTC เสมอ
 */
function formatUpdatedAtUtc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

export function EmployeeListPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [departments, setDepartments] = useState<readonly EmployeeDepartment[]>([]);
  const [formValues, setFormValues] = useState<EmployeeFilterFormValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<EmployeeFilterFormValues>(EMPTY_FILTERS);

  useEffect(() => {
    // dropdown แผนกเป็นตัวช่วยเสริม (AC-UI02 ห้าม hardcode) ถ้าโหลดไม่สำเร็จเหลือแค่ "ทุกแผนก"
    // ไม่ทำให้หน้ารายการหลักใช้งานไม่ได้ทั้งหน้า จึงไม่ผูกกับ state ผิดพลาดหลักของหน้า
    fetchDepartments()
      .then((result) => setDepartments(result))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchEmployees(buildEmployeeQuery(appliedFilters))
      .then((result) => {
        if (!cancelled) {
          setState({ status: 'ready', employees: result.employees });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedFilters(formValues);
  }

  function handleReset(): void {
    setFormValues(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Employee Management System</h1>
      <button type="button" disabled title="ยังไม่เปิดใช้งานในสไลซ์นี้">
        เพิ่มพนักงาน
      </button>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '16px 0' }}
      >
        <input
          type="text"
          placeholder="ค้นหาชื่อ"
          value={formValues.q}
          onChange={(event) => setFormValues({ ...formValues, q: event.target.value })}
        />

        <select
          value={formValues.departmentId}
          onChange={(event) => setFormValues({ ...formValues, departmentId: event.target.value })}
        >
          <option value="">ทุกแผนก</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>

        <select
          value={formValues.isActive}
          onChange={(event) => {
            const value = event.target.value;
            if (value === '' || value === 'true' || value === 'false') {
              setFormValues({ ...formValues, isActive: value });
            }
          }}
        >
          <option value="">ทุกสถานะ</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <label>
          Join date จาก{' '}
          <input
            type="date"
            value={formValues.joinDateFrom}
            onChange={(event) => setFormValues({ ...formValues, joinDateFrom: event.target.value })}
          />
        </label>
        <label>
          ถึง{' '}
          <input
            type="date"
            value={formValues.joinDateTo}
            onChange={(event) => setFormValues({ ...formValues, joinDateTo: event.target.value })}
          />
        </label>

        <label>
          Salary ต่ำสุด{' '}
          <input
            type="number"
            step="0.01"
            min="0"
            value={formValues.salaryMin}
            onChange={(event) => setFormValues({ ...formValues, salaryMin: event.target.value })}
          />
        </label>
        <label>
          Salary สูงสุด{' '}
          <input
            type="number"
            step="0.01"
            min="0"
            value={formValues.salaryMax}
            onChange={(event) => setFormValues({ ...formValues, salaryMax: event.target.value })}
          />
        </label>

        <button type="submit">ค้นหา</button>
        <button type="button" onClick={handleReset}>
          ล้างตัวกรอง
        </button>
      </form>

      {state.status === 'loading' && <p>กำลังโหลดข้อมูล...</p>}

      {state.status === 'error' && (
        <p role="alert" style={{ color: 'crimson' }}>
          โหลดข้อมูลพนักงานไม่สำเร็จ: {state.message}
        </p>
      )}

      {state.status === 'ready' && state.employees.length === 0 && (
        <p>ไม่พบข้อมูลพนักงาน</p>
      )}

      {state.status === 'ready' && state.employees.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Salary</th>
              <th>Join Date</th>
              <th>Status</th>
              <th>Last Updated (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {state.employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td>{employee.name}</td>
                <td>{employee.department.name}</td>
                <td>{formatSalary(employee.salary)}</td>
                <td>{employee.join_date}</td>
                <td>{employee.is_active ? 'Active' : 'Inactive'}</td>
                <td>{formatUpdatedAtUtc(employee.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
