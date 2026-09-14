/**
 * หน้าเปล่าของ S0 มีไว้ให้ service web ใน compose ขึ้นได้ครบสามตัว
 * หน้ารายการจริง ตัวเรียกใช้ API และตัวจัดรูปแบบเงินเดือนอยู่ใน S3
 */
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Employee Management System</h1>
      <p>S0 — ระบบยกขึ้นแล้ว หน้ารายการพนักงานจะมาใน S3</p>
    </main>
  );
}
