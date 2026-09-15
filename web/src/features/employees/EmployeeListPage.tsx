import { useEffect, useState } from 'react';
import { fetchEmployees, type Employee } from '../../lib/api-client';
import { formatSalary } from '../../lib/format';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; employees: readonly Employee[] };

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

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchEmployees()
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
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Employee Management System</h1>
      <button type="button" disabled title="ยังไม่เปิดใช้งานในสไลซ์นี้">
        เพิ่มพนักงาน
      </button>

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
