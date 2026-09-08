import crypto from 'node:crypto';
import { isAdminEmail } from '../../src/lib/admins';
import { getAdminAuth } from './_lib/firebaseAdmin';

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: { headers?: Record<string, string | undefined> }) => {
  const authorization = event.headers?.authorization ?? event.headers?.Authorization;
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!idToken) {
    return json(401, { error: 'Authentication required' });
  }

  try {
    const user = await getAdminAuth().verifyIdToken(idToken);
    if (!isAdminEmail(user.email)) {
      return json(403, { error: 'Admin access required' });
    }
  } catch {
    return json(401, { error: 'Invalid authentication token' });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || process.env.private_key;
  if (!privateKey) {
    return json(500, { error: 'ImageKit private key not configured' });
  }
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 60 * 10;
  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');
  return json(200, { token, expire, signature });
};
