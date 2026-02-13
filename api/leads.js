// RunAds - Leads API (Vercel Serverless Function)
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
    const { data } = await getGitHubFile('data/leads.json');
    const leads = data || [];
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.endsWith('/export')) {
      const csv = ['Name,Email,Phone,Page,Source,Date', ...leads.map(l => `"${l.name||''}","${l.email||''}","${l.phone||''}","${l.page_name||''}","${l.source||''}","${l.created_at||''}"`)].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      return res.send(csv);
    }
    return res.json(leads);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}