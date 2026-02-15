// RunAds - Leads API (Vercel Serverless Function)
// Postgres-first storage via unified storage module

export const config = { maxDuration: 15 };

import { getLeads } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const leads = await getLeads();
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.endsWith('/export')) {
      const csv = ['Name,Email,Phone,Page,Source,Date', ...leads.map(l => `"${l.name||''}","${l.email||''}","${l.phone||''}","${l.page_name||''}","${l.source||''}","${l.created_at||''}"`)].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      return res.send(csv);
    }
    return res.json(leads);
  } catch (err) {
    console.error('Leads API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
