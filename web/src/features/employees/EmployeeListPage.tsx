import { useEffect, useState, type FormEvent } from 'react';
import {
  createEmployee,
  deleteEmployee,
  fetchDepartments,
  fetchEmployees,
  updateEmployee,
  type Employee,
  type EmployeeDepartment,
} from '../../lib/api-client';
import { buildEmployeeQuery, type EmployeeFilterFormValues } from '../../lib/build-query';
import type { EmployeeInput } from '../../lib/employee-payload';
import { formatSalary } from '../../lib/format';
import { EmployeeForm } from './EmployeeForm';
import { Modal } from './Modal';
import { Toast, type ToastState } from './Toast';

type FormModalState = { readonly mode: 'create' } | { readonly mode: 'edit'; readonly employee: Employee };

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
  const [refreshToken, setRefreshToken] = useState(0);
  const [formModal, setFormModal] = useState<FormModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

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
  }, [appliedFilters, refreshToken]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedFilters(formValues);
  }

  function handleReset(): void {
    setFormValues(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  async function handleCreateSubmit(payload: EmployeeInput): Promise<void> {
    try {
      await createEmployee(payload);
      setToast({ type: 'success', message: 'สร้างพนักงานสำเร็จ' });
      setFormModal(null);
      setRefreshToken((token) => token + 1);
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'สร้างพนักงานไม่สำเร็จ',
      });
    }
  }

  async function handleUpdateSubmit(id: number, payload: EmployeeInput): Promise<void> {
    try {
      await updateEmployee(id, payload);
      setToast({ type: 'success', message: 'แก้ไขพนักงานสำเร็จ' });
      setFormModal(null);
      setRefreshToken((token) => token + 1);
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'แก้ไขพนักงานไม่สำเร็จ',
      });
    }
  }

  async function handleConfirmDelete(): Promise<void> {
    if (deleteTarget === null) return;
    try {
      await deleteEmployee(deleteTarget.id);
      setToast({ type: 'success', message: `ลบพนักงาน "${deleteTarget.name}" สำเร็จ` });
      setRefreshToken((token) => token + 1);
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'ลบพนักงานไม่สำเร็จ',
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Employee Management System</h1>
      <button type="button" onClick={() => setFormModal({ mode: 'create' })}>
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
              <th>Actions</th>
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
                <td>
                  <button type="button" onClick={() => setFormModal({ mode: 'edit', employee })}>
                    แก้ไข
                  </button>{' '}
                  <button type="button" onClick={() => setDeleteTarget(employee)}>
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={formModal !== null} onClose={() => setFormModal(null)}>
        {formModal !== null && (
          <EmployeeForm
            mode={formModal.mode}
            departments={departments}
            initialEmployee={formModal.mode === 'edit' ? formModal.employee : undefined}
            onSubmit={(payload) =>
              formModal.mode === 'create'
                ? handleCreateSubmit(payload)
                : handleUpdateSubmit(formModal.employee.id, payload)
            }
            onCancel={() => setFormModal(null)}
          />
        )}
      </Modal>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        {deleteTarget !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 280 }}>
            <p>
              ยืนยันการลบพนักงาน "{deleteTarget.name}" ใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleteTarget(null)}>
                ยกเลิก
              </button>
              <button type="button" onClick={handleConfirmDelete}>
                ยืนยันลบ
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
