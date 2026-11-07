import { timingSafeEqual } from 'node:crypto';
import { get, put } from '@vercel/blob';

const WORKSPACE_PATH = 'momentum/private-workspace.json';
const MAX_PAYLOAD_BYTES = 3 * 1024 * 1024;

function isAuthorized(request) {
  const expected = process.env.MOMENTUM_SYNC_SECRET || '';
  const header = request.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function isValidWorkspace(data) {
  return Boolean(data)
    && typeof data === 'object'
    && Array.isArray(data.tasks)
    && Array.isArray(data.habits)
    && Array.isArray(data.logs)
    && Array.isArray(data.activities)
    && data.settings
    && typeof data.settings === 'object';
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (!isAuthorized(request)) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  if (request.method === 'GET') {
    try {
      const blob = await get(WORKSPACE_PATH, { access: 'private', useCache: false });
      if (!blob) return response.status(200).json({ exists: false });
      const data = await new Response(blob.stream).json();
      if (!isValidWorkspace(data)) {
        return response.status(500).json({ error: 'Stored workspace is invalid' });
      }
      return response.status(200).json({ exists: true, data });
    } catch (error) {
      console.error('Momentum cloud read failed:', error);
      return response.status(500).json({ error: 'Cloud storage unavailable' });
    }
  }

  if (request.method === 'PUT') {
    try {
      const data = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      if (!isValidWorkspace(data)) {
        return response.status(400).json({ error: 'Invalid workspace payload' });
      }
      const serialized = JSON.stringify(data);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
        return response.status(413).json({ error: 'Workspace payload too large' });
      }
      await put(WORKSPACE_PATH, serialized, {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return response.status(200).json({ ok: true, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Momentum cloud write failed:', error);
      return response.status(500).json({ error: 'Cloud storage unavailable' });
    }
  }

  response.setHeader('Allow', 'GET, PUT');
  return response.status(405).json({ error: 'Method not allowed' });
}
