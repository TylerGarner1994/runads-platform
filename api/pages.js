// RunAds - Pages API (Vercel Serverless Function)
// Uses GitHub API for persistent storage (stores pages.json in repo)

export const config = { maxDuration: 30 };

const GITHUB_API = 'https://api.github.com';

async function getGitHubFile(path) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (resp.status === 404) return { data: null, sha: null };
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  const file = await resp.json();
  const content = JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8'));
  return { data: content, sha: file.sha };
}

async function saveGitHubFile(path, content, sha, message) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const body = { message: message || 'Update data', content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) { const err = await resp.json(); throw new Error(`GitHub save error: ${err.message}`); }
  return await resp.json();
}

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const DATA_PATH = 'data/pages.json';

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const pageId = pathParts.length > 2 ? pathParts[2] : null;
    const subRoute = pathParts.length > 3 ? pathParts[3] : null;

    if (req.method === 'GET') {
      const { data } = await getGitHubFile(DATA_PATH);
      const pages = data || [];
      if (pageId) {
        if (subRoute === 'analytics') {
          const page = pages.find(p => p.id === pageId);
          if (!page) return res.status(404).json({ error: 'Page not found' });
          return res.json({ pageId: page.id, views: page.views || 0, leads: page.leads || 0, conversions: 0, conversionRate: '0.0', dailyViews: [], topSources: [] });
        }
        if (subRoute === 'variants') {
          const page = pages.find(p => p.id === pageId);
          if (!page) return res.status(404).json({ error: 'Page not found' });
          return res.json(page.variants || []);
        }
        const page = pages.find(p => p.id === pageId);
        if (!page) return res.status(404).json({ error: 'Page not found' });
        return res.json(page);
      }
      const pageList = pages.map(({ html_content, ...rest }) => ({
        ...rest,
        url: rest.url || `/p/${rest.slug}`,
        clientName: rest.client_name || rest.clientName || ''
      }));
      return res.json({ pages: pageList });
    }

    if (req.method === 'POST') {
      const { data, sha } = await getGitHubFile(DATA_PATH);
      const pages = data || [];
      if (pageId && subRoute === 'deploy') {
        const idx = pages.findIndex(p => p.id === pageId);
        if (idx === -1) return res.status(404).json({ error: 'Page not found' });
        pages[idx].status = 'published';
        pages[idx].deployed_at = new Date().toISOString();
        pages[idx].updated_at = new Date().toISOString();
        await saveGitHubFile(DATA_PATH, pages, sha, `Deploy page: ${pages[idx].name}`);
        return res.json({ message: 'Page deployed', url: `/p/${pages[idx].slug}` });
      }
      if (pageId && subRoute === 'variants') {
        const idx = pages.findIndex(p => p.id === pageId);
        if (idx === -1) return res.status(404).json({ error: 'Page not found' });
        if (!pages[idx].variants) pages[idx].variants = [];
        const variant = { id: generateId(), ...req.body, created_at: new Date().toISOString() };
        pages[idx].variants.push(variant);
        await saveGitHubFile(DATA_PATH, pages, sha, `Add variant to: ${pages[idx].name}`);
        return res.json(variant);
      }
      const { name, slug, html_content, client_id, client_name, page_type, template_type, meta_title, meta_description } = req.body;
      const id = generateId();
      const pageSlug = slug || (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^~|-$/g, '');
      const now = new Date().toISOString();
      const newPage = { id, name: name || 'Untitled Page', slug: pageSlug, html_content: html_content || '', client_id: client_id || null, client_name: client_name || '', page_type: page_type || 'custom', template_type: template_type || null, status: 'draft', meta_title: meta_title || name || '', meta_description: meta_description || '', views: 0, leads: 0, custom_domain: null, created_at: now, updated_at: now, deployed_at: null };
      pages.unshift(newPage);
      await saveGitHubFile(DATA_PATH, pages, sha, `Create page: ${name}`);
      return res.json({ id, slug: pageSlug, message: 'Page created' });
    }

    if (req.method === 'PUT') {
      if (!pageId) return res.status(400).json({ error: 'Page ID required' });
      const { data, sha } = await getGitHubFile(DATA_PATH);
      const pages = data || [];
      const idx = pages.findIndex(p => p.id === pageId);
      if (idx === -1) return res.status(404).json({ error: 'Page not found' });
      if (subRoute === 'domain') {
        pages[idx].custom_domain = req.body.domain;
        pages[idx].updated_at = new Date().toISOString();
        await saveGitHubFile(DATA_PATH, pages, sha, `Update domain: ${pages[idx].name}`);
        return res.json({ message: 'Domain updated' });
      }
      Object.keys(req.body).forEach(key => { if (req.body[key] !== undefined) pages[idx][key] = req.body[key]; });
      pages[idx].updated_at = new Date().toISOString();
      await saveGitHubFile(DATA_PATH, pages, sha, `Update page: ${pages[idx].name}`);
      return res.json({ message: 'Page updated' });
    }

    if (req.method === 'DELETE') {
      if (!pageId) return res.status(400).json({ error: 'Page ID required' });
      const { data, sha } = await getGitHubFile(DATA_PATH);
      const pages = data || [];
      const filtered = pages.filter(p => p.id !== pageId);
      if (filtered.length === pages.length) return res.status(404).json({ error: 'Page not found' });
      await saveGitHubFile(DATA_PATH, filtered, sha, 'Delete page');
      return res.json({ message: 'Page deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Pages API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
