const express = require('express');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { authenticateToken } = require('../middleware/authMiddleware'); 

const router = express.Router();
const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * Client calls this to get a 60s presigned PUT URL.
 * Body: { contentType: 'image/jpeg', ext: 'jpg' }
 * Returns: { uploadUrl, key }
 */
router.post('/uploads/url', authenticateToken, async (req, res) => {
  try {
    const { contentType, ext } = req.body;
    const allow = ['image/jpeg','image/png','image/webp','video/mp4', 'video/mov', 'image/heic'];
    if (!allow.includes(contentType)) return res.status(400).json({ error: 'Invalid contentType' });

    const userId = req.user.id ;
    const key = `posts/${userId}/${crypto.randomUUID()}.${(ext || 'bin').toLowerCase()}`;

    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType
    });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    res.json({ uploadUrl, key });
  } catch (err) {
    console.error('presign error:', err);
    res.status(500).json({ error: 'presign-failed' });
  }
});

/**
 * the frontend call your existing POST /api/downloads/url with { key } to get a short-lived signed URL.
 * frontend to call /api/downloads/url when rendering each image and display the returned link.
 * Short-lived signed GET for a single key (60s).
 * Body: { key }
 */
router.post('/downloads/url', authenticateToken, async (req, res) => {
  try {
    const { key } = req.body;
    const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    res.json({ url });
  } catch (err) {
    console.error('sign-get error:', err);
    res.status(500).json({ error: 'sign-get-failed' });
  }
});

module.exports = router;