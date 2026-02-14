export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const results = {};

  // 1. Read generatePage function from index.html (lines 2040-2110)
  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/public/index.html`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const file = await resp.json();
    const content = Buffer.from(file.content, 'base64').toString('utf-8');
    const lines = content.split('\n');
    results.generatePageFunc = lines.slice(2039, 2120).join('\n');
  } catch (e) {
    results.generatePageFunc = 'Error: ' + e.message;
  }

  // 2. Read pages.js POST handler
  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/api/pages.js`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const file = await resp.json();
    const content = Buffer.from(file.content, 'base64').toString('utf-8');
    results.pagesJs = content;
  } catch (e) {
    results.pagesJs = 'Error: ' + e.message;
  }

  // 3. Actually try to save a test page (simulating what frontend does)
  try {
    const GITHUB_API = 'https://api.github.com';
    // Read current pages
    const readResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/data/pages.json`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const readData = await readResp.json();
    let pages = [];
    let sha = null;
    if (readResp.ok) {
      pages = JSON.parse(Buffer.from(readData.content, 'base64').toString('utf-8'));
      sha = readData.sha;
    }

    // Add a test page
    const testPage = {
      id: 'test_' + Date.now(),
      name: 'Test Page',
      slug: 'test-page-' + Date.now(),
      html_content: '<h1>Test</h1>',
      status: 'draft',
      page_type: 'advertorial',
      created_at: new Date().toISOString()
    };
    pages.push(testPage);

    // Save back
    const saveBody = {
      message: 'Test page save',
      content: Buffer.from(JSON.stringify(pages, null, 2)).toString('base64'),
      sha: sha
    };
    const saveResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/data/pages.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveBody)
    });
    const saveData = await saveResp.json();
    results.testPageSave = {
      status: saveResp.ok ? 'PASS' : 'FAIL',
      detail: saveResp.ok ? 'Test page saved! ID: ' + testPage.id : saveData.message,
      pagesCount: pages.length
    };
  } catch (e) {
    results.testPageSave = { status: 'FAIL', error: e.message };
  }

  return res.status(200).json(results);
}
