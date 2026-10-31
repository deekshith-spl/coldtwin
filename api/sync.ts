import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const syncKey = process.env.SYNC_KEY;

  if (
    !syncKey ||
    req.headers['x-sync-key'] !== syncKey
  ) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  try {
    const snapshot = req.body;

    if (
      !snapshot ||
      !Array.isArray(snapshot.chambers) ||
      !Array.isArray(snapshot.readings) ||
      !Array.isArray(snapshot.lots) ||
      !Array.isArray(snapshot.farmers) ||
      !Array.isArray(snapshot.produceMeta) ||
      !snapshot.settings
    ) {
      return res.status(400).json({
        error: 'Invalid snapshot',
      });
    }

    await redis.set('coldtwin:snapshot', snapshot);

    return res.status(200).json({
      ok: true,
      message: 'ColdTwin snapshot saved',
    });
  } catch (error) {
    console.error('Snapshot sync failed:', error);

    return res.status(500).json({
      error: 'Could not save snapshot',
    });
  }
}