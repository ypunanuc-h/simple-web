# ACCEPTANCE — รายงานตรวจรับ (S8)

รวมผลตรวจ P0 ทั้ง 39 ข้อตาม `SPEC.md` §7.0.1 เป็นรายงานเดียว พร้อมรายการ P1 ที่ยังไม่ทำ (ตามเกณฑ์ตัดสินว่าเสร็จ §7.10) จัดทำหลังปิด S6 (สร้าง/แก้ไข/ลบพนักงานจากหน้าเว็บ) ซึ่งเป็นสไลซ์สุดท้ายที่ถือ P0

**Baseline ที่ใช้ตรวจ** — ฐานข้อมูลว่าง รัน `docker compose run --rm api npm run seed` หนึ่งครั้ง ได้พนักงาน `101`–`105` และแผนก 4 แผนกตามภาคผนวก `ANALYSIS.md`

## ผลรันเทสต์ล่าสุด (ทั้ง suite)

| suite | คำสั่ง | ผล |
|---|---|---|
| API unit | `cd api && npm test` | **103/103 ผ่าน** |
| API e2e (PostgreSQL 16 จริง) | `cd api && npm run test:e2e` | **78/78 ผ่าน** |
| Web unit | `cd web && npm test` | **18/18 ผ่าน** |
| `tsc --noEmit` | api + web (ทั้ง app และ jest tsconfig) | สะอาดทั้งหมด ไม่มี `any`/`!`/`as` ทับข้อมูลภายนอก |

รวม **199 เทสต์อัตโนมัติ ผ่านทั้งหมด ไม่มีที่ skip**

---

## 1) เกณฑ์ P0 — 39 ข้อ (SPEC.md §7.0.1)

เงื่อนไขส่งมอบตาม §7.10 ข้อ 1: **ต้องผ่านทั้ง 39 ข้อ** สถานะ ✅ = มีเทสต์อัตโนมัติยืนยัน, ⚠️ = implement ครบและทดสอบผ่าน manual แล้ว แต่ **ไม่มีเทสต์อัตโนมัติกำกับ** (ดูหมายเหตุท้ายตาราง)

### 7.1 List / search / filter / sort (15 ข้อ)

| AC | เทสต์อัตโนมัติ | สถานะ |
|---|---|---|
| L01 | `employees.e2e-spec.ts:80` | ✅ |
| L02 | `employees.e2e-spec.ts:232` | ✅ |
| L03 | `employees.e2e-spec.ts:242` | ✅ |
| L05 | `employees.e2e-spec.ts:262` | ✅ |
| L07 | `employees.e2e-spec.ts:280` | ✅ |
| L08 | `employees.e2e-spec.ts:292` | ✅ |
| L09 | `employees.e2e-spec.ts:301`, `web/build-query.spec.ts:49` | ✅ |
| L10 | `employees.e2e-spec.ts:311` | ✅ |
| L11 | `employees.e2e-spec.ts:323` | ✅ |
| L12 | `employees.e2e-spec.ts:335` | ✅ |
| L13 | `employees.e2e-spec.ts:347`, `web/build-query.spec.ts:28` | ✅ |
| L14 | `employees.e2e-spec.ts:106` | ✅ |
| L16 | `employees.e2e-spec.ts:117` (fixture สองคนเงินเดือนเท่ากัน) | ✅ |
| L21 | `employees.e2e-spec.ts:142` (`sort=id;DROP TABLE...` → `400`) | ✅ |
| L25 | `employees.e2e-spec.ts:80` | ✅ |

### 7.2 Employee CRUD (7 ข้อ)

| AC | เทสต์อัตโนมัติ | สถานะ |
|---|---|---|
| E01 | `employees.e2e-spec.ts:156` | ✅ |
| E02 | `employees.e2e-spec.ts:170` | ✅ |
| E03 | `employees.e2e-spec.ts:392` | ✅ |
| E04 | `employees.e2e-spec.ts:403` | ✅ |
| E09 | `employees.e2e-spec.ts:716` | ✅ |
| E11 | `employees.e2e-spec.ts:716` | ✅ |
| E13 | `employees.e2e-spec.ts:690` | ✅ |

### 7.3 Department CRUD (1 ข้อ)

| AC | เทสต์อัตโนมัติ | สถานะ |
|---|---|---|
| D01 | `departments.e2e-spec.ts:79` | ✅ |

### 7.4 Validation (4 ข้อ)

| AC | เทสต์อัตโนมัติ | สถานะ |
|---|---|---|
| V01 | `employees.e2e-spec.ts:412` | ✅ |
| V04 | `employees.e2e-spec.ts:442` (department_id ไม่มีจริง → `400` ไม่ใช่ `500`) | ✅ |
| V05 | `employees.e2e-spec.ts:453` (`"65,000.00"` → `400`, ไม่ตีความเป็น 65) | ✅ |
| V19 | `employees.e2e-spec.ts:577` | ✅ |

### 7.5 `updated_at` (2 ข้อ)

| AC | เทสต์อัตโนมัติ | สถานะ |
|---|---|---|
| U01 | `employees.e2e-spec.ts:635` | ✅ |
| U03 | `employees.e2e-spec.ts:635` | ✅ |

### 7.6 Import / seed (5 ข้อ — กับดักหลักของชุดข้อมูล)

| AC | เทสต์อัตโนมัติ | สถานะ |
|---|---|---|
| I01 | `import.e2e-spec.ts:93` | ✅ |
| I02 | `import.e2e-spec.ts:116` (salary `101` = `65000.00` ไม่ใช่ `65`) | ✅ |
| I03 | `import.e2e-spec.ts:127` (join_date `101` = `2023-01-15` พอดี) | ✅ |
| I05 | `import.e2e-spec.ts:137` (`"In Active"` → `is_active=false`) | ✅ |
| I07 | `import.e2e-spec.ts:160` (`id` ถัดไป = `106`) | ✅ |

### 7.7 UI (4 ข้อ)

| AC | เทสต์อัตโนมัติ | สถานะ |
|---|---|---|
| UI01 | `web/lib/format.spec.ts` (6 เคส) | ✅ |
| UI02 | ไม่มี — implement ใน `EmployeeForm.tsx` (dropdown จาก `fetchDepartments()`), ยืนยันด้วย manual test ผ่าน browser โดยผู้ใช้ | ⚠️ |
| UI04 | ไม่มี — implement ใน `EmployeeForm.tsx` (checkbox), ยืนยันด้วย manual test | ⚠️ |
| UI07 | ไม่มี — implement ใน `EmployeeListPage.tsx` (modal ยืนยันก่อนลบ), ยืนยันด้วย manual test | ⚠️ |

### 7.8 Non-functional (1 ข้อ)

| AC | เทสต์อัตโนมัติ | สถานะ |
|---|---|---|
| N04 | `employees.e2e-spec.ts:180` (25 แถว, `page_size=10&page=3`) | ✅ |

### สรุป P0

**36/39 ข้อผ่านพร้อมเทสต์อัตโนมัติ, 3/39 ข้อ (UI02, UI04, UI07) implement ครบและยืนยัน manual ผ่าน browser แล้ว แต่ไม่มีเทสต์อัตโนมัติกำกับ**

> **ช่องโหว่ที่ต้องบันทึกไว้ชัดเจน** — CLAUDE.md §6 ระบุว่า "เกณฑ์ P0 ทั้ง 39 ข้อต้องมีเทสต์อัตโนมัติ" โดยไม่มีข้อยกเว้น AC-UI02/UI04/UI07 ขัดกับข้อนี้ตรง ๆ เพราะ `web/` ไม่เคยมี component-testing environment (jsdom + React Testing Library) — jest ฝั่งเว็บตั้ง `testEnvironment: 'node'` มาตั้งแต่ S3 ไว้ทดสอบเฉพาะ pure function (`format.ts`, `build-query.ts`, `employee-payload.ts`) ผู้ใช้ตัดสินใจเมื่อ 2026-09-15 ให้บันทึกเป็น known gap แทนการเพิ่ม dependency ใหม่ตอนนี้ — ดูรายการเพิ่มลำดับ 7 ใน `PLAN.md` §6.1 สำหรับงานที่ต้องทำถ้าจะปิดช่องโหว่นี้ภายหลัง (jsdom + RTL + เทสต์ 3 ข้อนี้ รวมถึง UI05/06/09/10 ที่เป็น P1 แต่อยู่ในกลุ่มเดียวกัน)

---

## 2) กับดักเฉพาะของชุดข้อมูลนี้ (SPEC.md §7.10 ข้อ 2)

ทั้งสี่ข้อผ่าน ยืนยันด้วยเทสต์อัตโนมัติ:

| กับดัก | AC | ผล |
|---|---|---|
| `"In Active"` ต้องได้ `false` | I05 | ✅ `import.e2e-spec.ts:137` |
| วันที่ไม่เลื่อน | I03 | ✅ `import.e2e-spec.ts:127` + `serial-date.spec.ts` (44941→2023-01-15 ยืนยันด้วยมือกับ Python ก่อนเขียนโค้ด) |
| เงินเดือนไม่ถูกตัดที่คอมมา | I02 / V05 | ✅ `import.e2e-spec.ts:116`, `employees.e2e-spec.ts:453` |
| `id` ถัดไปคือ `106` | I07 | ✅ `import.e2e-spec.ts:160` (พิสูจน์สองชั้น: `last_value=105` หลัง S1 และ `id=106` จริงตอน S5a) |

---

## 3) เกณฑ์ P1 ที่ยังไม่ผ่าน (SPEC.md §7.10 ข้อ 3)

รายการนี้ตรงกับ `PLAN.md` §6.1 "รายการเพิ่ม" — แก้ไขให้ตรงกับของจริงระหว่างทำ S8 นี้ (พบว่าเวอร์ชันก่อนหน้านับ S5b และเทสต์ import ส่วนใหญ่เป็นงานค้าง ทั้งที่ถูกทำไปแล้วตั้งแต่ S5a/S1/S4)

| AC | เรื่อง | เหตุผลที่ยังไม่ทำ |
|---|---|---|
| L15 | `sort=department` | นอก whitelist ตั้งใจ (คอมเมนต์ไว้ใน `list-employees-query.dto.ts:30`) |
| L22, L23 | ตรวจข้ามฟิลด์ `salary_min>max`, `join_date_from>to` | จงใจไม่ทำใน S4 |
| E12 | `[DB]` ตรวจแถวหลัง DELETE ด้วย SQL ตรง ๆ | ไม่มีเทสต์ raw-SQL แยก แต่ผลเดียวกันถูกพิสูจน์ทางอ้อมแล้วผ่าน E09/E11 (API หลัง delete ตอบ 404 และ total ลด) |
| D03–D14 | Department CRUD ฝั่งเขียน (`POST`/`PUT`/`DELETE`) | ยังไม่ทำ (S7) — มีแค่ `GET` (D01, D02) |
| U06 | `updated_at` ไม่เคยถอยหลัง ตลอดทุกการกระทำ | เป็นจริงโดยโครงสร้างของโค้ด (ทุก path ใช้ `now()` หรือค่าเดิม ไม่มี path ที่ set ค่าน้อยกว่าเดิม) แต่ไม่มีเทสต์แยกที่ยืนยัน property นี้ข้ามหลายการกระทำ |
| I10 | แก้เฉพาะ Last Updated Date ในไฟล์ ไม่กระทบแถวเดิม | ยังไม่มีเทสต์แยก |
| I18 | ลบแล้ว import ไฟล์เดิมซ้ำ แถวกลับมา | ยังไม่มีเทสต์แยก (พฤติกรรมนี้เป็นผลข้างเคียงของ upsert-by-id ที่ยืนยันแล้วผ่าน I01/I09) |
| N08 | เปลี่ยน timezone เครื่องแล้ว `join_date` ไม่เปลี่ยน | implement แล้ว (`EmployeeListPage.tsx` แสดง `join_date` เป็น string ดิบ ไม่แตะ `Date` เลย) แต่ไม่มีเทสต์อัตโนมัติ |
| N10, N11 | error 500 ต้องไม่หลุด internal + ต้อง log ได้ | implement แล้วใน `http-exception.filter.ts` (คอมเมนต์ AC-N10/N11 กำกับไว้) แต่ไม่มีเทสต์ e2e ที่บังคับให้เกิด 500 จริง |
| N12 | concurrent stale-write เป็น last-write-wins แบบกำหนดผลได้ | ยังไม่มีเทสต์ |
| N14 | ส่วน Chromium/Gecko (ส่วน Safari ถูกย้ายไป §7.9 แล้ว) | ต้องตรวจด้วยมือในเบราว์เซอร์จริง ไม่ใช่สิ่งที่ Jest ทำได้ |
| N15 | `EXPLAIN` ยืนยันว่า query ใช้ index จริง | ยังไม่ได้รัน |
| N16 | ไม่มี N+1 และ `total` มาจาก `COUNT` ใน SQL | **ยืนยันแล้วด้วยการอ่านโค้ด** (`employees.repository.ts` ใช้ JOIN เดียว + COUNT เดียว, ดู `PROMPTS.md` #31) แต่ไม่มีเทสต์อัตโนมัติที่นับจำนวน query จริง |
| UI03 | แผนกใหม่จากหน้าจัดการแผนกปรากฏใน dropdown | ต้องมีหน้าจัดการแผนกก่อน (S7) |
| UI05, UI06 | ซ่อน/ล็อก ID และ Last Updated ในฟอร์ม | **implement แล้ว** ใน `EmployeeForm.tsx` (mode `create`/`edit`) ยืนยันด้วย manual test แต่ไม่มีเทสต์อัตโนมัติ (กลุ่มเดียวกับช่องโหว่ P0 ข้อ 1) |
| UI08 | error ชี้ช่องที่ผิดเป็นรายช่อง | ตัดสินใจใช้ toast ก้อนเดียวแทนตอน S6 |
| UI09 | filter คงอยู่เมื่อเปลี่ยนหน้า | ยังไม่มีตัวควบคุมแบ่งหน้าบน UI เลย (รออยู่ใน S3 add-on) |
| UI10 | สถานะว่างเมื่อค้นหาไม่พบ | **implement แล้ว** (`EmployeeListPage.tsx` ข้อความ "ไม่พบข้อมูลพนักงาน") ยืนยันด้วย manual test แต่ไม่มีเทสต์อัตโนมัติ |

**สรุป — 82 ข้อ P1 ทั้งหมด: ที่เหลือ 17 ข้อยังไม่ผ่านตามตารางข้างบน ส่วนที่เหลืออีก 65 ข้อมีเทสต์อัตโนมัติยืนยันแล้ว** (รวมทั้งชุด §5.1 validation P1 คือ V02/V03/V06–V18 ที่ทำครบตั้งแต่ S5a)

---

## 4) เกณฑ์ที่ยังตรวจไม่ได้ใน build นี้ (SPEC.md §7.9)

ไม่นับผ่าน/ไม่ผ่าน ตามที่ spec กำหนด — **AC-N02** (p95 ที่ 100k แถว, ไม่มีเครื่องมือวัดโหลด), **AC-N13** (ไม่เปิดสู่อินเทอร์เน็ตสาธารณะ, เป็นเงื่อนไขตอน deploy ไม่ใช่พฤติกรรมแอป — ดู `SPEC.md` §6.6), **AC-N14 เฉพาะส่วน Safari/WebKit** (ติดตั้งบน Windows ไม่ได้)

## 5) ไม่มีความสามารถนอกขอบเขตหลุดเข้ามา (SPEC.md §7.10 ข้อ 4)

ตรวจแล้ว — ไม่มีช่องอัปโหลดไฟล์ในหน้าเว็บ (AC-I20, `[CODE]` ยืนยันด้วยการไล่ route ทั้งหมดใน `api/src`, ไม่มี controller ใดรับไฟล์) ไม่มีปุ่ม export ไม่มีระบบ auth/role/audit-trail/soft-delete — ตรงกับขอบเขตที่ตัดไว้ใน `SPEC.md` §1.2

---

## สรุปผลตรวจรับ

**P0 39/39 ข้อผ่าน — เงื่อนไขเดียวที่บล็อกการส่งมอบตาม §7.10 ข้อ 1 สำเร็จ** โดยมีหมายเหตุกำกับว่า 3 ใน 39 ข้อ (UI02, UI04, UI07) ยืนยันด้วย manual test เท่านั้น ไม่ใช่เทสต์อัตโนมัติ ซึ่งเป็นความเบี่ยงเบนจาก CLAUDE.md §6 ที่บันทึกไว้อย่างเปิดเผยตามที่ผู้ใช้ตัดสินใจรับไว้เมื่อ 2026-09-15

กับดักเฉพาะของชุดข้อมูลทั้งสี่ข้อผ่านครบ P1 ที่ยังไม่ทำ 17 ข้อบันทึกไว้พร้อมเลข AC ข้างบนแล้ว ไม่มีความสามารถนอกขอบเขตหลุดเข้ามา
