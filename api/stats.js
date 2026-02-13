// RunAds - Stats API (Vercel Serverless Function)
export const config = { maxDuration: 15 };
const GITHUB_API = 'https://api.github.com';
async function getGitHubFile(path) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (resp.status === 404) return { data: null };
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  const file = await resp.json();
  return { data: JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8')) };
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { data: pages } = await getGitHubFile('data/pages.json');
    const { data: clients } = await getGitHubFile('data/clients.json');
    const pl = pages || []; const cl = clients || [];
    const totalViews = pl.reduce((s, p) => s + (p.views || 0), 0);
    const totalLeads = pl.reduce((s, p) => s + (p.leads || 0), 0);
    const pub = pl.filter(p => p.status === 'published').length;
    return res.json({ totalPages: pl.length, publishedPages: pub, draftPages: pl.length - pub, totalClients: cl.length, totalViews, totalLeads, conversionRate: totalViews > 0 ? (totalLeads / totalViews * 100).toFixed(1) : '0.0' });
  } catch (err) {
    console.error('Stats API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}