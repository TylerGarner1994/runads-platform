// RunAds - GitHub Pages Deployment Module
let octokitInstance = null;

async function getOctokit() {
  if (octokitInstance) return octokitInstance;
  const { Octokit } = await import('octokit');
  octokitInstance = new Octokit({ auth: process.env.GITHUB_TOKEN });
  return octokitInstance;
}

function getConfig() {
  return {
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO || 'runads-pages-live'
  };
}

// Ensure the GitHub Pages repo exists
export async function ensureRepoExists() {
  const octokit = await getOctokit();
  const { owner, repo } = getConfig();

  try {
    await octokit.rest.repos.get({ owner, repo });
    return true;
  } catch (err) {
    if (err.status === 404) {
      // Create the repo
      await octokit.rest.repos.createForAuthenticatedUser({
        name: repo,
        description: 'RunAds - Live Landing Pages',
        auto_init: true,
        has_pages: true,
        private: false
      });

      // Enable GitHub Pages from main branch
      try {
        await octokit.rest.repos.createPagesSite({
          owner,
          repo,
          source: { branch: 'main', path: '/' }
        });
      } catch (pagesErr) {
        console.log('Pages may already be enabled:', pagesErr.message);
      }

      return true;
    }
    throw err;
  }
}

// Deploy a landing page to GitHub Pages
export async function deployPage(slug, htmlContent) {
  const octokit = await getOctokit();
  const { owner, repo } = getConfig();

  await ensureRepoExists();

  const path = `${slug}/index.html`;
  const content = Buffer.from(htmlContent).toString('base64');
  const message = `Deploy: ${slug} - ${new Date().toISOString()}`;

  try {
    // Check if file exists (for update)
    const { data: existing } = await octokit.rest.repos.getContent({
      owner, repo, path
    });

    // Update existing file
    await octokit.rest.repos.createOrUpdateFileContents({
      owner, repo, path, message, content,
      sha: existing.sha
    });
  } catch (err) {
    if (err.status === 404) {
      // Create new file
      await octokit.rest.repos.createOrUpdateFileContents({
        owner, repo, path, message, content
      });
    } else {
      throw err;
    }
  }

  return getPagesUrl(slug);
}

// Delete a page from GitHub Pages
export async function deletePage(slug) {
  const octokit = await getOctokit();
  const { owner, repo } = getConfig();

  const path = `${slug}/index.html`;

  try {
    const { data: existing } = await octokit.rest.repos.getContent({
      owner, repo, path
    });

    await octokit.rest.repos.deleteFile({
      owner, repo, path,
      message: `Remove: ${slug}`,
      sha: existing.sha
    });

    return true;
  } catch (err) {
    if (err.status === 404) return true; // Already gone
    throw err;
  }
}

// Get the public URL for a deployed page
export function getPagesUrl(slug) {
  const { owner, repo } = getConfig();
  const base = process.env.PAGES_BASE_URL || `https://${owner}.github.io/${repo}`;
  return `${base}/${slug}/`;
}

// Set a custom domain (CNAME file)
export async function setCustomDomain(domain) {
  const octokit = await getOctokit();
  const { owner, repo } = getConfig();

  const path = 'CNAME';
  const content = Buffer.from(domain).toString('base64');

  try {
    const { data: existing } = await octokit.rest.repos.getContent({
      owner, repo, path
    });
    await octokit.rest.repos.createOrUpdateFileContents({
      owner, repo, path,
      message: `Set custom domain: ${domain}`,
      content, sha: existing.sha
    });
  } catch (err) {
    if (err.status === 404) {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner, repo, path,
        message: `Set custom domain: ${domain}`,
        content
      });
    } else {
      throw err;
    }
  }
}

export default { ensureRepoExists, deployPage, deletePage, getPagesUrl, setCustomDomain };
