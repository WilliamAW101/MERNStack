const { ObjectId } = require('mongodb');

// Reuse the same AWS mocking pattern as authRoutes.test.js
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://example.com/signed');

jest.mock('@aws-sdk/client-s3', () => {
    const S3Client = jest.fn().mockImplementation(() => ({}));
    const GetObjectCommand = jest.fn().mockImplementation(input => input);
    const PutObjectCommand = jest.fn().mockImplementation(input => input);
    return { S3Client, GetObjectCommand, PutObjectCommand };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: (...args) => mockGetSignedUrl(...args)
}));

process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-2';
process.env.S3_BUCKET = process.env.S3_BUCKET || 'test-bucket';

// Provide a global crypto.randomUUID for uploadURL
global.crypto = global.crypto || {
    randomUUID: jest.fn(() => 'test-uuid'),
};

const { grabURL, uploadURL } = require('../utils/aws');

describe('utils/aws.grabURL', () => {
    beforeEach(() => {
        mockGetSignedUrl.mockReset();
        mockGetSignedUrl.mockResolvedValue('https://example.com/signed');
    });

    it('returns a signed URL when presigner succeeds', async () => {
        const key = 'posts/user123/photo.jpg';

        const url = await grabURL(key);

        expect(url).toBe('https://example.com/signed');
        expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
        const [, cmd] = mockGetSignedUrl.mock.calls[0];
        expect(cmd).toMatchObject({
            Bucket: process.env.S3_BUCKET,
            Key: key,
        });
    });

    it('returns null when presigner throws', async () => {
        mockGetSignedUrl.mockRejectedValueOnce(new Error('sign error'));

        const url = await grabURL('posts/user123/photo.jpg');

        expect(url).toBeNull();
        expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });
});

describe('utils/aws.uploadURL', () => {
    it('returns null for unsupported content types', async () => {
        const result = await uploadURL('application/json', 'json', 'user123');

        expect(result).toBeNull();
        expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it('returns null when presigning the upload URL fails (or PutObjectCommand is missing)', async () => {
        const result = await uploadURL('image/png', 'png', 'user123');

        expect(result).toBeNull();
    });
});
