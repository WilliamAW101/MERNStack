/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: ['routes/**/*.js', 'utils/**/*.js', 'config/**/*.js'],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
};
