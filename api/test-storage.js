export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const results = { tests: [], env: {} };

  // Check env vars
  results.env.GITHUB_OWNER = process.env.GITHUB_OWNER ? 'SET (' + process.env.GITHUB_OWNER + ')' : 'MISSING';
  results.env.GITHUB_REPO = process.env.GITHUB_REPO ? 'SET (' + process.env.GITHUB_REPO + ')' : 'MISSING';
  results.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN ? 'SET (length: ' + process.env.GITHUB_TOKEN.length + ')' : 'MISSING';
  results.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING';

  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    results.tests.push({ name: 'GitHub Token', status: 'FAIL', error: 'No GITHUB_TOKEN env var' });
    return res.status(200).json(results);
  }

  // Test 1: Can we authenticate with GitHub?
  try {
    const authResp = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const authData = await authResp.json();
    results.tests.push({ name: 'GitHub Auth', status: authResp.ok ? 'PASS' : 'FAIL', user: authData.login || authData.message });
  } catch (e) {
    results.tests.push({ name: 'GitHub Auth', status: 'FAIL', error: e.message });
  }

  // Test 2: Can we read the repo?
  try {
    const repoResp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const repoData = await repoResp.json();
    results.tests.push({ name: 'Repo Access', status: repoResp.ok ? 'PASS' : 'FAIL', detail: repoData.full_name || repoData.message });
  } catch (e) {
    results.tests.push({ name: 'Repo Access', status: 'FAIL', error: e.message });
  }

  // Test 3: Can we read data/pages.json?
  try {
    const pagesResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/pages.json`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const pagesData = await pagesResp.json();
    if (pagesResp.ok) {
      const content = Buffer.from(pagesData.content, 'base64').toString('utf-8');
      results.tests.push({ name: 'Read pages.json', status: 'PASS', sha: pagesData.sha, content: content.substring(0, 200) });
    } else {
      results.tests.push({ name: 'Read pages.json', status: 'FAIL', error: pagesData.message });
    }
  } catch (e) {
    results.tests.push({ name: 'Read pages.json', status: 'FAIL', error: e.message });
  }

  // Test 4: Can we WRITE to data/test.json?
  try {
    // First check if file exists
    const checkResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/test.json`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    let sha = null;
    if (checkResp.ok) {
      const existing = await checkResp.json();
      sha = existing.sha;
    }

    const testData = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
    const body = {
      message: 'Test storage write',
      content: Buffer.from(testData).toString('base64')
    };
    if (sha) body.sha = sha;

    const writeResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/test.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const writeData = await writeResp.json();
    results.tests.push({ name: 'Write test.json', status: writeResp.ok ? 'PASS' : 'FAIL', detail: writeResp.ok ? 'File written successfully' : writeData.message });
  } catch (e) {
    results.tests.push({ name: 'Write test.json', status: 'FAIL', error: e.message });
  }

  return res.status(200).json(results);
}
