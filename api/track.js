// RunAds - Tracking & Lead Capture API (Vercel Serverless Function)
// Handles: page views (/api/track/:pageId), form submissions (/api/submit/:pageId), conversions (/api/convert/:pageId)

export const config = { maxDuration: 15 };

import { initDb, getSql, isPgAvailable } from '../lib/postgres.js';

// GitHub fallback for storing tracking data
const GITHUB_API = 'https://api.github.com';

async function getGitHubFile(path) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!resp.ok) return { data: null, sha: null };
  const file = await resp.json();
  const content = Buffer.from(file.content, 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: file.sha };
}

async function saveGitHubFile(path, data, sha, message) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const body = { message, content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the page ID and action from URL
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Expected patterns: /api/track/:pageId, /api/submit/:pageId, /api/convert/:pageId
    const action = pathParts[1]; // track, submit, or convert
    const pageId = pathParts[2] || req.body?.pageId;

    if (!pageId) {
      return res.status(400).json({ error: 'pageId is required' });
    }

    const body = req.body || {};

    await initDb();

    if (action === 'submit') {
      // Form submission → create lead
      return handleSubmission(pageId, body, res);
    } else if (action === 'convert') {
      // Conversion event
      return handleConversion(pageId, body, res);
    } else {
      // Default: page view tracking
      return handlePageView(pageId, body, res);
    }

  } catch (error) {
    console.error('Tracking error:', error);
    // Always return success to not break the landing page
    return res.status(200).json({ success: true, note: 'tracking recorded' });
  }
}

async function handlePageView(pageId, body, res) {
  const {
    session_id, utm_source, utm_medium, utm_campaign,
    utm_content, utm_term, referrer, device_type, user_agent
  } = body;

  if (isPgAvailable()) {
    const sql = getSql();
    await sql`
      INSERT INTO page_views (page_id, session_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, device_type, user_agent)
      VALUES (${pageId}, ${session_id || null}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_content || null}, ${utm_term || null}, ${referrer || null}, ${device_type || null}, ${user_agent || null})
    `;
    // Increment view count on page
    await sql`UPDATE landing_pages SET views = views + 1 WHERE id = ${pageId} OR slug = ${pageId}`;
  } else {
    // GitHub fallback: increment views in pages.json
    try {
      const { data: pages, sha } = await getGitHubFile('data/pages.json');
      if (pages) {
        const page = pages.find(p => p.id === pageId || p.slug === pageId || p.url === pageId);
        if (page) {
          page.views = (page.views || 0) + 1;
          await saveGitHubFile('data/pages.json', pages, sha, `Track view: ${pageId}`);
        }
      }
    } catch (e) {
      console.error('GitHub tracking fallback failed:', e.message);
    }
  }

  return res.status(200).json({ success: true });
}

async function handleSubmission(pageId, body, res) {
  const {
    session_id, form_data, utm_source, utm_medium, utm_campaign,
    utm_content, utm_term, referrer, device_type
  } = body;

  // Extract common fields from form_data
  const email = form_data?.email || body.email || null;
  const name = form_data?.name || body.name || null;
  const phone = form_data?.phone || body.phone || null;

  if (isPgAvailable()) {
    const sql = getSql();
    await sql`
      INSERT INTO leads (page_id, form_data, email, name, phone, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, device_type)
      VALUES (${pageId}, ${JSON.stringify(form_data || {})}, ${email}, ${name}, ${phone}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_content || null}, ${utm_term || null}, ${referrer || null}, ${device_type || null})
    `;
    // Increment lead count
    await sql`UPDATE landing_pages SET leads = leads + 1 WHERE id = ${pageId} OR slug = ${pageId}`;
  } else {
    // GitHub fallback
    try {
      const { data: leads, sha } = await getGitHubFile('data/leads.json');
      const leadList = leads || [];
      leadList.push({
        id: 'lead_' + Date.now().toString(36),
        page_id: pageId,
        email, name, phone,
        form_data: form_data || {},
        utm_source, utm_medium, utm_campaign,
        created_at: new Date().toISOString()
      });
      await saveGitHubFile('data/leads.json', leadList, sha, `New lead from ${pageId}`);
    } catch (e) {
      console.error('GitHub lead save failed:', e.message);
    }
  }

  return res.status(200).json({ success: true });
}

async function handleConversion(pageId, body, res) {
  const { session_id, event_type, event_value, variant_id, utm_source, utm_medium, utm_campaign, metadata } = body;

  if (isPgAvailable()) {
    const sql = getSql();
    await sql`
      INSERT INTO conversions (page_id, event_type, event_value, variant_id, utm_source, utm_medium, utm_campaign, metadata)
      VALUES (${pageId}, ${event_type || 'conversion'}, ${event_value || null}, ${variant_id || null}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${JSON.stringify(metadata || {})})
    `;
  }

  return res.status(200).json({ success: true });
}
