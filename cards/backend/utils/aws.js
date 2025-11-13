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

const uploadURL = async (contentType, ext, userId) => {
    try {
      const allow = ['image/jpeg','image/png','image/webp','video/mp4', 'video/mov', 'image/heic'];

      if (!allow.includes(contentType)) {
        console.error('invalid file type');
        return null;
      }

      const key = `posts/${userId}/${crypto.randomUUID()}.${(ext || 'bin').toLowerCase()}`;

      const cmd = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: contentType
      });

      const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

      return { uploadUrl, key };
    } catch (err) {
      console.error('presign error:', err);
      return null;
    }
} 

module.exports = { grabURL, uploadURL };