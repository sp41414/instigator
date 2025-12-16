export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.spec.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
}
