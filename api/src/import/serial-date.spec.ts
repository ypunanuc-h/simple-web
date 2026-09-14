import { MIN_ACCEPTED_SERIAL, epochMsToSerial, serialToIsoDate } from './serial-date';

/**
 * ค่าอ้างอิงในไฟล์นี้คำนวณอิสระจากตัว implementation ด้วย Python (datetime + epoch
 * 1899-12-30) ไม่ได้รันผ่านฟังก์ชันที่กำลังทดสอบ เพื่อไม่ให้บั๊กในโค้ดกลายเป็น "ค่าที่ถูก"
 * โดยบังเอิญ ดู PROMPTS.md รายการที่เกี่ยวข้องสำหรับการยืนยันค่า
 */
describe('epochMsToSerial', () => {
  it('AC-I03: แปลง epoch ของ 2023-01-15 (แถว 101) เป็น serial 44941', () => {
    const result = epochMsToSerial(Date.UTC(2023, 0, 15));
    expect(result).toEqual({ ok: true, serial: 44941 });
  });

  it('epoch เที่ยงคืน UTC ของวันอื่น ๆ ในไฟล์ตัวอย่างแปลงถูกต้องทุกแถว', () => {
    expect(epochMsToSerial(Date.UTC(2023, 2, 22))).toEqual({ ok: true, serial: 45007 });
    expect(epochMsToSerial(Date.UTC(2024, 5, 1))).toEqual({ ok: true, serial: 45444 });
    expect(epochMsToSerial(Date.UTC(2022, 10, 10))).toEqual({ ok: true, serial: 44875 });
    expect(epochMsToSerial(Date.UTC(2024, 1, 19))).toEqual({ ok: true, serial: 45341 });
  });

  it('ปฏิเสธ epoch ที่มีเวลาติดมา (ไม่ตรงเที่ยงคืนพอดี)', () => {
    const result = epochMsToSerial(Date.UTC(2023, 0, 15, 13, 30));
    expect(result.ok).toBe(false);
  });
});

describe('serialToIsoDate', () => {
  it('AC-I03: serial 44941 -> "2023-01-15" ไม่ใช่ "2023-01-14" หรือ "2023-01-16"', () => {
    expect(serialToIsoDate(44941)).toEqual({ ok: true, isoDate: '2023-01-15' });
  });

  it('serial ของแถวอื่น ๆ ในไฟล์ตัวอย่างแปลงกลับถูกต้องทุกแถว', () => {
    expect(serialToIsoDate(45007)).toEqual({ ok: true, isoDate: '2023-03-22' });
    expect(serialToIsoDate(45444)).toEqual({ ok: true, isoDate: '2024-06-01' });
    expect(serialToIsoDate(44875)).toEqual({ ok: true, isoDate: '2022-11-10' });
    expect(serialToIsoDate(45341)).toEqual({ ok: true, isoDate: '2024-02-19' });
  });

  it('SPEC.md §5.1/§5.4: serial ของขอบเขตวันที่ยอมรับ 1900-01-01 ถึง 2100-12-31 แปลงถูกต้อง', () => {
    expect(serialToIsoDate(61)).toEqual({ ok: true, isoDate: '1900-03-01' });
    // serial ของ 2100-12-31 คำนวณอิสระด้วย Python: (date(2100,12,31) - date(1899,12,30)).days
    expect(serialToIsoDate(73415)).toEqual({ ok: true, isoDate: '2100-12-31' });
  });

  it(`MIN_ACCEPTED_SERIAL คือ ${MIN_ACCEPTED_SERIAL} ตาม SPEC.md §5.4`, () => {
    expect(MIN_ACCEPTED_SERIAL).toBe(61);
  });

  it('AC-V13/SPEC.md §5.4: ปฏิเสธ serial ต่ำกว่า 61 (กันบั๊กปีอธิกสุรทินปลอมของ Excel ปี 1900)', () => {
    expect(serialToIsoDate(60).ok).toBe(false);
    expect(serialToIsoDate(0).ok).toBe(false);
    expect(serialToIsoDate(-1).ok).toBe(false);
  });

  it('ยอมรับ serial 61 พอดี (ขอบล่างที่ยอมรับ)', () => {
    expect(serialToIsoDate(61).ok).toBe(true);
  });
});

describe('AC-I04: ผลลัพธ์ไม่ขึ้นกับ timezone ของเครื่องที่รัน import', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each(['UTC', 'Asia/Bangkok', 'America/Los_Angeles', 'Pacific/Kiritimati'])(
    'TZ=%s ให้ผลลัพธ์เดียวกันสำหรับทุกแถวในไฟล์ตัวอย่าง',
    (tz) => {
      process.env.TZ = tz;

      // epoch ms เดียวกับที่ exceljs อ่านได้จริงจากไฟล์ example_data/exam_data.xlsx
      // (ยืนยันด้วยสคริปต์ probe แยกต่างหาก ไม่ใช่ค่าที่เดาขึ้น)
      const epochsByRow: Record<number, number> = {
        101: Date.UTC(2023, 0, 15),
        102: Date.UTC(2023, 2, 22),
        103: Date.UTC(2024, 5, 1),
        104: Date.UTC(2022, 10, 10),
        105: Date.UTC(2024, 1, 19),
      };
      const expectedIsoByRow: Record<number, string> = {
        101: '2023-01-15',
        102: '2023-03-22',
        103: '2024-06-01',
        104: '2022-11-10',
        105: '2024-02-19',
      };

      for (const [id, epoch] of Object.entries(epochsByRow)) {
        const serialResult = epochMsToSerial(epoch);
        expect(serialResult.ok).toBe(true);
        if (!serialResult.ok) continue;
        const dateResult = serialToIsoDate(serialResult.serial);
        expect(dateResult).toEqual({
          ok: true,
          isoDate: expectedIsoByRow[Number(id)],
        });
      }
    },
  );
});
