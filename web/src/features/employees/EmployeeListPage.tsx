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
import { DEFAULT_SORT_STATE, nextSortState, type SortColumn, type SortState } from '../../lib/sort-state';
import { Modal } from '../../components/Modal';
import { Toast, type ToastState } from '../../components/Toast';
import { EmployeeForm } from './EmployeeForm';

const SORTABLE_COLUMNS: ReadonlyArray<{ readonly column: SortColumn; readonly label: string }> = [
  { column: 'salary', label: 'Salary' },
  { column: 'join_date', label: 'Join Date' },
  { column: 'updated_at', label: 'Last Updated (UTC)' },
];

function sortIndicator(sortState: SortState, column: SortColumn): string {
  if (sortState.sort !== column) return '';
  return sortState.order === 'asc' ? ' ▲' : ' ▼';
}

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
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);

  function handleSortClick(column: SortColumn): void {
    setSortState((current) => nextSortState(current, column));
  }

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

    fetchEmployees(buildEmployeeQuery(appliedFilters, sortState))
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
  }, [appliedFilters, refreshToken, sortState]);

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
    <main className="min-h-screen bg-white px-4 py-8 font-sans text-gray-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand">Employee Management System</h1>
          <button
            type="button"
            onClick={() => setFormModal({ mode: 'create' })}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            เพิ่มพนักงาน
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <label className="flex flex-col text-sm text-gray-600">
            ค้นหาชื่อ
            <input
              type="text"
              placeholder="ค้นหาชื่อ"
              value={formValues.q}
              onChange={(event) => setFormValues({ ...formValues, q: event.target.value })}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-600">
            แผนก
            <select
              value={formValues.departmentId}
              onChange={(event) => setFormValues({ ...formValues, departmentId: event.target.value })}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">ทุกแผนก</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm text-gray-600">
            สถานะ
            <select
              value={formValues.isActive}
              onChange={(event) => {
                const value = event.target.value;
                if (value === '' || value === 'true' || value === 'false') {
                  setFormValues({ ...formValues, isActive: value });
                }
              }}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">ทุกสถานะ</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>

          <label className="flex flex-col text-sm text-gray-600">
            Join date จาก
            <input
              type="date"
              value={formValues.joinDateFrom}
              onChange={(event) => setFormValues({ ...formValues, joinDateFrom: event.target.value })}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            ถึง
            <input
              type="date"
              value={formValues.joinDateTo}
              onChange={(event) => setFormValues({ ...formValues, joinDateTo: event.target.value })}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-600">
            Salary ต่ำสุด
            <input
              type="number"
              step="0.01"
              min="0"
              value={formValues.salaryMin}
              onChange={(event) => setFormValues({ ...formValues, salaryMin: event.target.value })}
              className="mt-1 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            Salary สูงสุด
            <input
              type="number"
              step="0.01"
              min="0"
              value={formValues.salaryMax}
              onChange={(event) => setFormValues({ ...formValues, salaryMax: event.target.value })}
              className="mt-1 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              ค้นหา
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </form>

        {state.status === 'loading' && <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>}

        {state.status === 'error' && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            โหลดข้อมูลพนักงานไม่สำเร็จ: {state.message}
          </p>
        )}

        {state.status === 'ready' && state.employees.length === 0 && (
          <p className="text-sm text-gray-500">ไม่พบข้อมูลพนักงาน</p>
        )}

        {state.status === 'ready' && state.employees.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-brand-light">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-brand">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-brand">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-brand">Department</th>
                  {SORTABLE_COLUMNS.map(({ column, label }) => (
                    <th key={column} className="px-3 py-2 text-left font-semibold text-brand">
                      <button
                        type="button"
                        onClick={() => handleSortClick(column)}
                        className="cursor-pointer select-none hover:underline"
                      >
                        {label}
                        {sortIndicator(sortState, column)}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-semibold text-brand">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-brand">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {state.employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">{employee.id}</td>
                    <td className="px-3 py-2 text-gray-900">{employee.name}</td>
                    <td className="px-3 py-2 text-gray-700">{employee.department.name}</td>
                    <td className="px-3 py-2 text-gray-700">{formatSalary(employee.salary)}</td>
                    <td className="px-3 py-2 text-gray-700">{employee.join_date}</td>
                    <td className="px-3 py-2 text-gray-700">{formatUpdatedAtUtc(employee.updated_at)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          employee.is_active
                            ? 'rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand'
                            : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600'
                        }
                      >
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormModal({ mode: 'edit', employee })}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(employee)}
                          className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <div className="flex min-w-[280px] flex-col gap-3">
              <p className="text-sm text-gray-800">
                ยืนยันการลบพนักงาน "{deleteTarget.name}" ใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  ยืนยันลบ
                </button>
              </div>
            </div>
          )}
        </Modal>

        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    </main>
  );
}
