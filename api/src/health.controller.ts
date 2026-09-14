import { Controller, Get } from '@nestjs/common';

/**
 * SPEC.md หัวข้อ 4.6 — คืนเฉพาะ status เท่านั้น
 * ห้ามเพิ่มเวอร์ชัน ชื่อโฮสต์ หรือสถานะการต่อฐานข้อมูล เพราะเป็นการเปิดเผย
 * รายละเอียดภายในซึ่งขัดกับหัวข้อ 6.4 และ endpoint นี้ไม่ต้องยืนยันตัวตน
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
