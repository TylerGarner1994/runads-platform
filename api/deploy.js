// RunAds - Deploy API (Vercel Serverless Function)
export const config = { maxDuration: 60 };
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
async function saveGitHubRawFile(path, content, sha, message) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const body = { message, content: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  if (!resp.ok) throw new Error('GitHub save error');
  return await resp.json();
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { pageId, html_content, slug } = req.body;
    if (!html_content) return res.status(400).json({ error: 'HTML content required' });
    const pagePath = `deployed-pages/${slug || pageId || 'page'}.html`;
    const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
    const repo = process.env.GITHUB_REPO || 'runads-platform';
    const token = process.env.GITHUB_TOKEN;
    let sha = null;
    try { const cr = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${pagePath}`, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }); if (cr.ok) sha = (await cr.json()).sha; } catch(e){}
    await saveGitHubRawFile(pagePath, html_content, sha, `Deploy: ${slug || pageId}`);
    if (pageId) {
      const { data, sha: ps } = await getGitHubFile('data/pages.json');
      const pages = data || [];
      const idx = pages.findIndex(p => p.id === pageId);
      if (idx !== -1) { pages[idx].status = 'published'; pages[idx].deployed_at = new Date().toISOString(); await saveGitHubRawFile('data/pages.json', pages, ps, 'Mark deployed'); }
    }
    return res.json({ message: 'Deployed', url: `https://${owner}.github.io/${repo}/${pagePath}` });
  } catch (err) { return res.status(500).json({ error: err.message || 'Internal server error' }); }
}