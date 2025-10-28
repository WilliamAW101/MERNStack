const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the .env.test file before each test run
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

//Replaces with harmless mock so no real emails are sent during testing
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue(true),
}));

afterEach(() => {
  jest.clearAllMocks();
});

setTimeout(10000); // Increase timeout for async operations if needed