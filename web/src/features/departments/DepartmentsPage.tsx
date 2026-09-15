import { useEffect, useState, type FormEvent } from 'react';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
  type Department,
} from '../../lib/api-client';
import { Modal } from '../../components/Modal';
import { Toast, type ToastState } from '../../components/Toast';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; departments: readonly Department[] };

type FormModalState = { readonly mode: 'create' } | { readonly mode: 'edit'; readonly department: Department };

interface DepartmentFormProps {
  readonly mode: 'create' | 'edit';
  readonly initialName: string;
  readonly onSubmit: (name: string) => Promise<void>;
  readonly onCancel: () => void;
}

function DepartmentForm({ mode, initialName, onSubmit, onCancel }: DepartmentFormProps) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(name);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-[280px] flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand">{mode === 'create' ? 'เพิ่มแผนก' : 'แก้ไขแผนก'}</h2>

      <label className="block text-sm text-gray-600">
        ชื่อแผนก
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
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

export function DepartmentsPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshToken, setRefreshToken] = useState(0);
  const [formModal, setFormModal] = useState<FormModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchDepartments()
      .then((departments) => {
        if (!cancelled) setState({ status: 'ready', departments });
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
  }, [refreshToken]);

  async function handleCreateSubmit(name: string): Promise<void> {
    try {
      await createDepartment(name);
      setToast({ type: 'success', message: 'สร้างแผนกสำเร็จ' });
      setFormModal(null);
      setRefreshToken((token) => token + 1);
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'สร้างแผนกไม่สำเร็จ' });
    }
  }

  async function handleUpdateSubmit(id: number, name: string): Promise<void> {
    try {
      await updateDepartment(id, name);
      setToast({ type: 'success', message: 'แก้ไขแผนกสำเร็จ' });
      setFormModal(null);
      setRefreshToken((token) => token + 1);
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'แก้ไขแผนกไม่สำเร็จ' });
    }
  }

  async function handleConfirmDelete(): Promise<void> {
    if (deleteTarget === null) return;
    try {
      await deleteDepartment(deleteTarget.id);
      setToast({ type: 'success', message: `ลบแผนก "${deleteTarget.name}" สำเร็จ` });
      setRefreshToken((token) => token + 1);
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'ลบแผนกไม่สำเร็จ' });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 font-sans text-gray-900 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand">จัดการแผนก</h1>
          <button
            type="button"
            onClick={() => setFormModal({ mode: 'create' })}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            เพิ่มแผนก
          </button>
        </div>

        {state.status === 'loading' && <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>}

        {state.status === 'error' && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            โหลดข้อมูลแผนกไม่สำเร็จ: {state.message}
          </p>
        )}

        {state.status === 'ready' && state.departments.length === 0 && (
          <p className="text-sm text-gray-500">ยังไม่มีแผนก</p>
        )}

        {state.status === 'ready' && state.departments.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-brand-light">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-brand">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-brand">จำนวนพนักงาน</th>
                  <th className="px-3 py-2 text-left font-semibold text-brand">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {state.departments.map((department) => (
                  <tr key={department.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900">{department.name}</td>
                    <td className="px-3 py-2 text-gray-700">{department.employee_count}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormModal({ mode: 'edit', department })}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(department)}
                          disabled={department.employee_count > 0}
                          title={
                            department.employee_count > 0
                              ? 'ย้ายพนักงานออกจากแผนกนี้ก่อนจึงจะลบได้'
                              : undefined
                          }
                          className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
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
            <DepartmentForm
              mode={formModal.mode}
              initialName={formModal.mode === 'edit' ? formModal.department.name : ''}
              onSubmit={(name) =>
                formModal.mode === 'create'
                  ? handleCreateSubmit(name)
                  : handleUpdateSubmit(formModal.department.id, name)
              }
              onCancel={() => setFormModal(null)}
            />
          )}
        </Modal>

        <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
          {deleteTarget !== null && (
            <div className="flex min-w-[280px] flex-col gap-3">
              <p className="text-sm text-gray-800">
                ยืนยันการลบแผนก "{deleteTarget.name}" ใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้
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
