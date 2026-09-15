export interface EmployeeSnapshot {
  name: string;
  departmentId: number;
  salary: string;
  joinDate: string;
  isActive: boolean;
}

/**
 * ตัดสินว่าข้อมูลเปลี่ยนจริงหรือไม่ตาม D2 — service ใช้ผลนี้ตัดสินใจว่า updated_at
 * ควรเป็นค่าเดิมหรือ Clock.now() ตัวเปรียบเทียบเองไม่รู้จักเวลาเลย เทียบแค่ฟิลด์ข้อมูล
 * ต้องเทียบทุกฟิลด์ตรง ๆ (===) ห้ามใช้ Number()/parseFloat() กับ salary ตาม D7
 */
export function hasEmployeeDataChanged(
  current: EmployeeSnapshot,
  next: EmployeeSnapshot,
): boolean {
  return (
    current.name !== next.name ||
    current.departmentId !== next.departmentId ||
    current.salary !== next.salary ||
    current.joinDate !== next.joinDate ||
    current.isActive !== next.isActive
  );
}
