// RunAds - Page Viewer (serves generated page HTML by slug)
// Postgres-first storage via unified storage module

export const config = { maxDuration: 15 };

import { getPageBySlug } from '../lib/storage.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const slug = pathParts.length > 1 ? pathParts[1] : pathParts[0];

    if (!slug) return res.status(400).send('Page slug required');

    const page = await getPageBySlug(slug);

    if (!page || !page.html_content) {
      return res.status(404).send(`<!DOCTYPE html><html><head><title>Page Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Page Not Found</h1><p>The page "${slug}" could not be found.</p><a href="/">← Back to Dashboard</a></body></html>`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(page.html_content);
  } catch (err) {
    console.error('Page view error:', err);
    return res.status(500).send('Internal server error');
  }
}
