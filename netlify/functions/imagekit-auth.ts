import crypto from 'node:crypto';

export const handler = async () => {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || process.env.private_key;
  if (!privateKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ImageKit private key not configured' }),
    };
  }
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 60 * 10;
  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, expire, signature }),
  };
};
