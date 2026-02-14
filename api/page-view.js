// RunAds - Page Viewer (serves generated page HTML by slug)
// Handles routes like /p/{slug}

export const config = { maxDuration: 15 };

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

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Expect /p/{slug} -> pathParts = ['p', 'slug']
    const slug = pathParts.length > 1 ? pathParts[1] : pathParts[0];

    if (!slug) {
      return res.status(400).send('Page slug required');
    }

    const { data } = await getGitHubFile('data/pages.json');
    const pages = data || [];
    const page = pages.find(p => p.slug === slug);

    if (!page || !page.html_content) {
      return res.status(404).send(`<!DOCTYPE html><html><head><title>Page Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Page Not Found</h1><p>The page "${slug}" could not be found.</p><a href="/">← Back to Dashboard</a></body></html>`);
    }

    // Serve the page HTML directly
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(page.html_content);
  } catch (err) {
    console.error('Page view error:', err);
    return res.status(500).send('Internal server error');
  }
}
