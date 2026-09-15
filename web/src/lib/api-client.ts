import { readArray, readBoolean, readField, readNumber, readString } from './json';

export interface EmployeeDepartment {
  readonly id: number;
  readonly name: string;
}

export interface Employee {
  readonly id: number;
  readonly name: string;
  readonly department: EmployeeDepartment;
  readonly salary: string;
  readonly join_date: string;
  readonly is_active: boolean;
  readonly updated_at: string;
}

export interface EmployeeListMeta {
  readonly page: number;
  readonly page_size: number;
  readonly total: number;
  readonly total_pages: number;
}

export interface EmployeeListResult {
  readonly employees: readonly Employee[];
  readonly meta: EmployeeListMeta;
}

function toDepartment(value: unknown): EmployeeDepartment {
  return { id: readNumber(value, 'id'), name: readString(value, 'name') };
}

function toEmployee(value: unknown): Employee {
  return {
    id: readNumber(value, 'id'),
    name: readString(value, 'name'),
    department: toDepartment(readField(value, 'department')),
    salary: readString(value, 'salary'),
    join_date: readString(value, 'join_date'),
    is_active: readBoolean(value, 'is_active'),
    updated_at: readString(value, 'updated_at'),
  };
}

function toMeta(value: unknown): EmployeeListMeta {
  return {
    page: readNumber(value, 'page'),
    page_size: readNumber(value, 'page_size'),
    total: readNumber(value, 'total'),
    total_pages: readNumber(value, 'total_pages'),
  };
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    return readString(readField(body, 'error'), 'message');
  } catch {
    return `เรียก API ไม่สำเร็จ (สถานะ ${response.status})`;
  }
}

export async function fetchEmployees(): Promise<EmployeeListResult> {
  const response = await fetch('/api/employees');
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const body: unknown = await response.json();
  return {
    employees: readArray(body, 'data').map((row) => toEmployee(row)),
    meta: toMeta(readField(body, 'meta')),
  };
}
