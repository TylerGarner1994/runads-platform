// RunAds - Data Migration API
// Seeds Postgres database from existing GitHub JSON files
// GET /api/migrate - Run migration (one-time operation)

export const config = { maxDuration: 60 };

import { migrateFromGitHub } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const results = await migrateFromGitHub();
    return res.json({ success: true, message: 'Migration complete', migrated: results });
  } catch (err) {
    console.error('Migration error:', err);
    return res.status(500).json({ error: err.message });
  }
}
