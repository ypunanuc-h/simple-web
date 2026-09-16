# ems simple web

เว็บแอปจัดการข้อมูลพนักงาน — แสดงรายการ/เรียง/กรอง และ CRUD พนักงานครบวงจร พร้อม import จาก Excel สำหรับ seed ข้อมูลตั้งต้น

รายละเอียดสิ่งที่แอปทำได้: [SPEC.md](SPEC.md) · ผลตรวจรับ: [ACCEPTANCE.md](ACCEPTANCE.md) · วิธีทำงานในรีโปนี้: [CLAUDE.md](CLAUDE.md)

## Stack

NestJS + TypeScript (strict) + TypeORM + PostgreSQL 16 · React + TypeScript + Vite · Docker Compose

## ยกระบบขึ้น

```bash
cp .env.example .env
docker compose up -d
```

ตรวจว่าขึ้นครบและพร้อมใช้งาน:

```bash
curl http://localhost:3000/api/health        # {"status":"ok"}
```

เปิดหน้าเว็บที่ `http://localhost:5173`

`db` มี healthcheck และ `api` รอจนกว่า `db` จะพร้อมก่อนเริ่มเอง ไม่ต้องรอด้วยมือ พอร์ตทั้งหมดตั้งค่าได้ผ่าน `.env` (ค่าเริ่มต้น: API `3000`, web `5173`, Postgres publish ที่ `55432` เพราะ `5432` มักถูก Postgres ที่ลงไว้ในเครื่องใช้อยู่แล้ว)

## Seed ข้อมูลตั้งต้นจาก Excel

Import เป็นคำสั่งฝั่ง server แบบ one-off เท่านั้น ไม่มี endpoint หรือปุ่มในหน้าเว็บที่รับไฟล์ (ตาม `SPEC.md` AC-I20):

```bash
docker compose run --rm api npm run seed
```

```bash
docker compose up
docker compose restart web
docker compose down -v
```

อ่านจาก `example_data/exam_data.xlsx` รันซ้ำได้อย่างปลอดภัย — ไฟล์เดิมที่ import ซ้ำจะไม่เปลี่ยนข้อมูลใด ๆ (idempotent ตาม D1) ผลลัพธ์สรุปจำนวนแถวที่เพิ่ม/แก้ไข/ไม่เปลี่ยน/ถูกข้ามพร้อมเหตุผล

## รันเทสต์

เทสต์ที่แตะฐานข้อมูลต้องมี `db` container ขึ้นอยู่ก่อน (`docker compose up -d db`) เทสต์รันบนเครื่อง ไม่ใช่ในคอนเทนเนอร์ ต่อผ่าน `localhost:55432` เข้าฐานข้อมูลเทสต์แยกต่างหาก (`ems_test`, สร้างอัตโนมัติตอน volume ว่างครั้งแรก)

```bash
cd api
npm install
npm test          # unit — 103 เทสต์
npm run test:e2e  # e2e กับ PostgreSQL จริง — 78 เทสต์

cd ../web
npm install
npm test          # unit — 18 เทสต์
```

ทุกชื่อเทสต์ขึ้นต้นด้วยเลข acceptance criteria ที่ตรงกับ `SPEC.md` §7 (เช่น `AC-I05: "In Active" ต้องบันทึกเป็น is_active = false`)

## Migration Databsae
```bash
docker compose run --rm api npm run migration:run
docker compose run --rm api npm run migration:revert
docker compose run --rm api npm run typeorm -- migration:show
```

## โครงสร้างโปรเจกต์

```
api/src/employees/    controller → service → repository → TypeORM
api/src/departments/  โครงเดียวกัน
api/src/import/       ตัวอ่าน .xlsx + seed script (ไม่มี controller, ไม่มี route ชี้เข้า)
api/src/common/       exception filter, domain error, ตัวช่วยร่วม
api/src/migrations/   schema เปลี่ยนผ่าน migration เท่านั้น (synchronize: false เสมอ)
api/test/             e2e ด้วย Supertest กับ PostgreSQL จริง

web/src/features/     หน้าเว็บแยกตามฟีเจอร์ (employees)
web/src/lib/          api client, ตัวจัดรูปแบบ, ตรรกะฝั่ง FE ที่มีเงื่อนไข
```

รายละเอียดเหตุผลของโครงสร้างนี้: `CLAUDE.md` §4

## สถานะปัจจุบัน

ฟีเจอร์หลักครบตาม `SPEC.md` §1.1 — แสดงรายการ/เรียง/แบ่งหน้า, ค้นหา/กรอง, และ CRUD พนักงานเต็มรูปแบบจากหน้าเว็บ (สร้าง/แก้ไข/ลบ พร้อม toast แจ้งผล) P0 ทั้ง 39 ข้อผ่านครบ — ดูรายละเอียดพร้อมเลข AC และเทสต์ที่อ้างอิงใน [ACCEPTANCE.md](ACCEPTANCE.md)

**ยังไม่ทำ** (P1 ทั้งหมด ไม่บล็อกการส่งมอบ): Department CRUD ฝั่งเขียนและหน้าจัดการแผนก, การเรียง/แบ่งหน้าบนหน้าเว็บ, error รายช่องบนฟอร์ม, และรายการอื่นตาม `ACCEPTANCE.md` หัวข้อ 3
