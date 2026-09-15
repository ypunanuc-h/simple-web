export type SortColumn = 'salary' | 'join_date' | 'updated_at';
export type SortOrder = 'asc' | 'desc';

export interface SortState {
  readonly sort: SortColumn | null;
  readonly order: SortOrder;
}

export const DEFAULT_SORT_STATE: SortState = { sort: null, order: 'asc' };

/**
 * คลิกหัวคอลัมน์เดิมที่กำลังเรียงอยู่แล้ว → สลับทิศทาง asc/desc
 * คลิกคอลัมน์อื่น → เริ่มเรียงคอลัมน์นั้นใหม่ที่ asc เสมอ ไม่สืบทอดทิศทางเดิม
 */
export function nextSortState(current: SortState, column: SortColumn): SortState {
  if (current.sort === column) {
    return { sort: column, order: current.order === 'asc' ? 'desc' : 'asc' };
  }
  return { sort: column, order: 'asc' };
}
