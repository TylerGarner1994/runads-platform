// RunAds - Deploy API (Vercel Serverless Function)
// Deploys HTML to GitHub Pages + updates page status in Postgres

export const config = { maxDuration: 60 };

import { getPage, updatePage, deployHtmlToGitHub } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { pageId, html_content, slug } = req.body;
    if (!html_content) return res.status(400).json({ error: 'HTML content required' });

    const deploySlug = slug || pageId || 'page';
    const deployUrl = await deployHtmlToGitHub(deploySlug, html_content);

    if (pageId) {
      try {
        await updatePage(pageId, { status: 'published', deployed_at: new Date().toISOString() });
      } catch (e) { console.warn('Could not update page status:', e.message); }
    }

    return res.json({ message: 'Deployed', url: deployUrl });
  } catch (err) {
    console.error('Deploy API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
