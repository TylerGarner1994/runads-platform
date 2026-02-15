// RunAds - Stats API (Vercel Serverless Function)
// Postgres-first storage via unified storage module

export const config = { maxDuration: 15 };

import { getStats } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const stats = await getStats();
    return res.json(stats);
  } catch (err) {
    console.error('Stats API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
