/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@biblebeam/bible-providers$': '<rootDir>/packages/bible-providers/src/base.ts',
    '^@biblebeam/verse-matcher$':   '<rootDir>/packages/verse-matcher/src/index.ts',
    '^@biblebeam/bible-data$':      '<rootDir>/packages/bible-data/src/index.ts',
    '^@biblebeam/stt-providers$':   '<rootDir>/packages/stt-providers/src/index.ts',
  },
};