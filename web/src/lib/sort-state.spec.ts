import { nextSortState, type SortState } from './sort-state';

const UNSORTED: SortState = { sort: null, order: 'asc' };

describe('nextSortState', () => {
  it('คลิกคอลัมน์ครั้งแรก (ยังไม่ได้เรียงอะไรเลย) เริ่มที่ asc', () => {
    expect(nextSortState(UNSORTED, 'salary')).toEqual({ sort: 'salary', order: 'asc' });
  });

  it('คลิกคอลัมน์เดิมซ้ำตอนเป็น asc อยู่ สลับเป็น desc', () => {
    const current: SortState = { sort: 'salary', order: 'asc' };
    expect(nextSortState(current, 'salary')).toEqual({ sort: 'salary', order: 'desc' });
  });

  it('คลิกคอลัมน์เดิมซ้ำตอนเป็น desc อยู่ สลับกลับเป็น asc', () => {
    const current: SortState = { sort: 'salary', order: 'desc' };
    expect(nextSortState(current, 'salary')).toEqual({ sort: 'salary', order: 'asc' });
  });

  it('คลิกคอลัมน์อื่นระหว่างที่มีคอลัมน์หนึ่งกำลังเรียงอยู่ เริ่มคอลัมน์ใหม่ที่ asc ไม่สืบทอดทิศทางเดิม', () => {
    const current: SortState = { sort: 'salary', order: 'desc' };
    expect(nextSortState(current, 'join_date')).toEqual({ sort: 'join_date', order: 'asc' });
  });

  it('ทำงานถูกต้องกับทุกคอลัมน์ที่รองรับ', () => {
    expect(nextSortState(UNSORTED, 'join_date')).toEqual({ sort: 'join_date', order: 'asc' });
    expect(nextSortState(UNSORTED, 'updated_at')).toEqual({ sort: 'updated_at', order: 'asc' });
  });
});
