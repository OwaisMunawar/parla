/**
 * Two projects: the app under jest-expo, and the tutor server in plain Node.
 * They share one coverage gate because the server imports the tutor contract
 * from the app, and a contract change has to keep both green.
 */
const transformIgnorePatterns = [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@shopify/react-native-skia|ai|@ai-sdk/.*|@standard-schema/.*|@workflow/.*|eventsource-parser|ts-fsrs))',
];

/** @type {import('jest').Config} */
module.exports = {
  // Coverage gates domain logic, repositories and engines. Screens are covered
  // by component tests and Maestro flows rather than line counts, and thin
  // adapters over native modules are exercised on the simulator.
  collectCoverageFrom: [
    'src/**/lib/**/*.ts',
    'src/core/db/**/*.ts',
    'src/core/errors/**/*.ts',
    'src/core/clock/**/*.ts',
    'src/core/i18n/**/*.ts',
    'src/core/speech/clipRecognizer.ts',
    'src/core/speech/scriptedRecognizer.ts',
    'src/core/speech/Speaker.ts',
    'src/features/**/data/**/*.ts',
    'src/features/**/engine/**/*.ts',
    'server/src/**/*.ts',
    '!src/core/db/expoSqliteDriver.ts',
    '!src/features/**/engine/expoIapBilling.ts',
    '!src/features/**/engine/revenueCatBilling.ts',
    '!src/features/widget/data/**',
    '!src/features/demo/data/**',
    '!**/__tests__/**',
    '!src/features/progress/data/notifications.ts',
    '!server/src/main.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: { lines: 90, statements: 90, functions: 90, branches: 80 },
  },
  coverageReporters: ['text-summary', 'lcov'],
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo/ios',
      // Worklets ships native-only entry points; this resolver picks the JS ones.
      resolver: 'react-native-worklets/jest/resolver',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/ios/', '/android/', '/server/'],
      transformIgnorePatterns,
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      roots: ['<rootDir>/server'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transform: { '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
      transformIgnorePatterns,
    },
  ],
};
