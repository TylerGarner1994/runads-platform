// RunAds - GitHub Pages Deployment Module
// Uses raw GitHub API (fetch) — no external dependencies needed

const GITHUB_API = 'https://api.github.com';

function getConfig() {
  return {
    owner: process.env.GITHUB_OWNER || 'TylerGarner1994',
    repo: process.env.GITHUB_PAGES_REPO || 'runads-pages-live',
    token: process.env.GITHUB_TOKEN
  };
}

async function githubRequest(method, path, body = null) {
  const { owner, repo, token } = getConfig();
  if (!token) throw new Error('GITHUB_TOKEN not configured');

  const url = `${GITHUB_API}/repos/${owner}/${repo}${path}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);
  if (!resp.ok && resp.status !== 404 && resp.status !== 422) {
    const errText = await resp.text();
    throw new Error(`GitHub API ${resp.status}: ${errText}`);
  }
  return { status: resp.status, data: resp.ok ? await resp.json() : null };
}

// Ensure the GitHub Pages repo exists and has Pages enabled
export async function ensureRepoExists() {
  const { owner, repo, token } = getConfig();
  if (!token) return false;

  try {
    const check = await githubRequest('GET', '');
    if (check.status === 200) return true;
  } catch (e) {
    // Repo doesn't exist, create it
  }

  try {
    // Create the repo under the authenticated user
    const resp = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repo,
        description: 'RunAds - Live Landing Pages (auto-deployed)',
        auto_init: true,
        has_pages: true,
        private: false
      })
    });

    if (resp.ok || resp.status === 422) { // 422 = already exists
      // Enable GitHub Pages from main branch
      try {
        await githubRequest('POST', '/pages', {
          source: { branch: 'main', path: '/' }
        });
      } catch (pagesErr) {
        console.log('Pages may already be enabled');
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to create repo:', err.message);
    return false;
  }
}

// Deploy a landing page to GitHub Pages
export async function deployPage(slug, htmlContent) {
  const { owner, repo, token } = getConfig();
  if (!token) {
    console.log('GitHub Pages deployment skipped — no token configured');
    return null;
  }

  await ensureRepoExists();

  const path = `${slug}/index.html`;
  const content = Buffer.from(htmlContent).toString('base64');
  const message = `Deploy: ${slug} - ${new Date().toISOString()}`;

  // Check if file already exists (need sha for updates)
  let sha = null;
  try {
    const existing = await githubRequest('GET', `/contents/${path}`);
    if (existing.status === 200 && existing.data?.sha) {
      sha = existing.data.sha;
    }
  } catch (e) {
    // File doesn't exist yet, that's fine
  }

  // Create or update the file
  const body = { message, content };
  if (sha) body.sha = sha;

  await githubRequest('PUT', `/contents/${path}`, body);

  // Also update/create the root index.html (directory listing)
  try {
    await updatePagesIndex(slug);
  } catch (e) {
    console.log('Index update skipped:', e.message);
  }

  return getPagesUrl(slug);
}

// Update the root index.html to list all deployed pages
async function updatePagesIndex(newSlug) {
  const { owner, repo, token } = getConfig();

  // Get current directory listing
  let existingSlugs = [];
  try {
    const resp = await githubRequest('GET', '/contents/');
    if (resp.data && Array.isArray(resp.data)) {
      existingSlugs = resp.data
        .filter(f => f.type === 'dir' && f.name !== '.github' && f.name !== 'node_modules')
        .map(f => f.name);
    }
  } catch (e) {}

  // Add new slug if not already present
  if (!existingSlugs.includes(newSlug)) {
    existingSlugs.push(newSlug);
  }
  existingSlugs.sort();

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RunAds - Live Pages</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px; max-width: 800px; margin: 0 auto; }
h1 { color: #fff; margin-bottom: 8px; }
p { color: #94a3b8; margin-bottom: 32px; }
.page-list { list-style: none; padding: 0; }
.page-list li { border-bottom: 1px solid #1e293b; }
.page-list a { display: block; padding: 16px 0; color: #818cf8; text-decoration: none; font-size: 15px; transition: color 0.2s; }
.page-list a:hover { color: #a5b4fc; }
.page-list .slug { color: #64748b; font-size: 13px; margin-top: 4px; }
.badge { display: inline-block; padding: 2px 8px; background: #1e293b; border-radius: 10px; font-size: 11px; color: #94a3b8; margin-left: 8px; }
</style>
</head>
<body>
<h1>RunAds Live Pages</h1>
<p>${existingSlugs.length} pages deployed</p>
<ul class="page-list">
${existingSlugs.map(s => {
  const type = s.split('-')[0];
  return `<li><a href="./${s}/">${s}<span class="badge">${type}</span></a></li>`;
}).join('\n')}
</ul>
</body>
</html>`;

  const content = Buffer.from(indexHtml).toString('base64');
  let sha = null;
  try {
    const existing = await githubRequest('GET', '/contents/index.html');
    if (existing.status === 200 && existing.data?.sha) sha = existing.data.sha;
  } catch (e) {}

  const body = { message: `Update index - ${new Date().toISOString()}`, content };
  if (sha) body.sha = sha;
  await githubRequest('PUT', '/contents/index.html', body);
}

// Delete a page from GitHub Pages
export async function deletePage(slug) {
  const { token } = getConfig();
  if (!token) return true;

  const path = `${slug}/index.html`;

  try {
    const existing = await githubRequest('GET', `/contents/${path}`);
    if (existing.status === 200 && existing.data?.sha) {
      await githubRequest('DELETE', `/contents/${path}`, {
        message: `Remove: ${slug}`,
        sha: existing.data.sha
      });
    }
    return true;
  } catch (err) {
    return true; // Already gone
  }
}

// Get the public URL for a deployed page
export function getPagesUrl(slug) {
  const { owner, repo } = getConfig();
  const base = process.env.PAGES_BASE_URL || `https://${owner.toLowerCase()}.github.io/${repo}`;
  return `${base}/${slug}/`;
}

// Set a custom domain (CNAME file)
export async function setCustomDomain(domain) {
  const { token } = getConfig();
  if (!token) return;

  const content = Buffer.from(domain).toString('base64');
  let sha = null;

  try {
    const existing = await githubRequest('GET', '/contents/CNAME');
    if (existing.status === 200 && existing.data?.sha) sha = existing.data.sha;
  } catch (e) {}

  const body = { message: `Set custom domain: ${domain}`, content };
  if (sha) body.sha = sha;
  await githubRequest('PUT', '/contents/CNAME', body);
}

export default { ensureRepoExists, deployPage, deletePage, getPagesUrl, setCustomDomain };
