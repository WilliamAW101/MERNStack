const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue(true),
}));

afterEach(() => {
    jest.clearAllMocks();
});
jest.setTimeout(60000);
