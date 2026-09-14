#!/bin/sh
# สร้างฐานข้อมูลสำหรับเทสต์แยกจาก dev ตอน initdb ครั้งแรก
# รันเฉพาะตอน named volume ยังว่าง ถ้าลบ volume แล้วยกใหม่จะรันอีกครั้ง
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
  CREATE DATABASE ${TEST_DB_NAME:-ems_test} OWNER $POSTGRES_USER;
SQL
