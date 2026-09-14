import type { Config } from 'jest';

/** e2e แยกออกมาเพราะต้องใช้ฐานข้อมูลจริงและรันช้ากว่า */
const config: Config = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  setupFiles: ['<rootDir>/test/env.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
};

export default config;
