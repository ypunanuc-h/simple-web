import type { Config } from 'jest';

/** เทสต์ระดับหน่วยและระดับ service วางไว้ข้างไฟล์ที่มันทดสอบใน src/ */
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  setupFiles: ['<rootDir>/test/env.ts'],
  passWithNoTests: true,
};

export default config;
