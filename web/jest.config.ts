import type { Config } from 'jest';

/** เทสต์ตรรกะฝั่ง FE ที่มีเงื่อนไข เช่น format.ts วางไว้ข้างไฟล์ที่มันทดสอบใน src/ */
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  passWithNoTests: true,
};

export default config;
