const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = new S3Client({ region: process.env.AWS_REGION });

const grabURL = async (key) => {
    try {
        const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
        const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
        return url;
    } catch (err) {
        console.error('sign-get error:', err);
        return null;
    }
}

module.exports = { grabURL };