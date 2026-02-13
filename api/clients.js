// RunAds - Clients API (Vercel Serverless Function)
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
  return { data: JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8')), sha: file.sha };
}
async function saveGitHubFile(path, content, sha, message) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const body = { message, content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  if (!resp.ok) throw new Error('GitHub save error');
  return await resp.json();
}
function generateId() { const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; let r = ''; for (let i = 0; i < 12; i++) r += c.charAt(Math.floor(Math.random() * c.length)); return r; }
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const DATA_PATH = 'data/clients.json';
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pp = url.pathname.split('/').filter(Boolean);
    const cid = pp.length > 2 ? pp[2] : null;
    const sub = pp.length > 3 ? pp[3] : null;
    if (req.method === 'GET') {
      const { data } = await getGitHubFile(DATA_PATH);
      const clients = data || [];
      if (cid) { const c = clients.find(x => x.id === cid); return c ? res.json(c) : res.status(404).json({ error: 'Not found' }); }
      return res.json(clients);
    }
    if (req.method === 'POST') {
      const { data, sha } = await getGitHubFile(DATA_PATH);
      const clients = data || [];
      if (cid && sub) {
        const idx = clients.findIndex(x => x.id === cid);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });
        if (!clients[idx][sub]) clients[idx][sub] = [];
        const item = { id: generateId(), ...req.body, created_at: new Date().toISOString() };
        clients[idx][sub].push(item);
        await saveGitHubFile(DATA_PATH, clients, sha, `Add ${sub} to client`);
        return res.json(item);
      }
      const { name, website, industry, description } = req.body;
      const id = generateId(); const now = new Date().toISOString();
      const nc = { id, name: name || 'New Client', website: website || '', industry: industry || '', description: description || '', style_guide: null, claims: [], testimonials: [], products: [], audiences: [], created_at: now, updated_at: now };
      clients.unshift(nc);
      await saveGitHubFile(DATA_PATH, clients, sha, `Create client: ${name}`);
      return res.json({ id, message: 'Client created' });
    }
    if (req.method === 'PUT') {
      if (!cid) return res.status(400).json({ error: 'ID required' });
      const { data, sha } = await getGitHubFile(DATA_PATH);
      const clients = data || [];
      const idx = clients.findIndex(x => x.id === cid);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      if (sub === 'style-guide') { clients[idx].style_guide = req.body; } else { Object.assign(clients[idx], req.body); }
      clients[idx].updated_at = new Date().toISOString();
      await saveGitHubFile(DATA_PATH, clients, sha, 'Update client');
      return res.json({ message: 'Updated' });
    }
    if (req.method === 'DELETE') {
      if (!cid) return res.status(400).json({ error: 'ID required' });
      const { data, sha } = await getGitHubFile(DATA_PATH);
      const clients = data || [];
      const filtered = clients.filter(x => x.id !== cid);
      if (filtered.length === clients.length) return res.status(404).json({ error: 'Not found' });
      await saveGitHubFile(DATA_PATH, filtered, sha, 'Delete client');
      return res.json({ message: 'Deleted' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { return res.status(500).json({ error: err.message || 'Internal server error' }); }
}