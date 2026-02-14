export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const results = {};

  // Read generate.js - last 80 lines
  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/api/generate.js`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const file = await resp.json();
    const content = Buffer.from(file.content, 'base64').toString('utf-8');
    const lines = content.split('\n');
    results.generateJs = {
      totalLines: lines.length,
      last80: lines.slice(-80).join('\n')
    };
  } catch (e) {
    results.generateJs = { error: e.message };
  }

  // Read index.html - search for fetch calls to /api/
  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/public/index.html`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const file = await resp.json();
    const content = Buffer.from(file.content, 'base64').toString('utf-8');
    const lines = content.split('\n');
    // Find lines that contain fetch or /api/
    const apiLines = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('/api/') || lines[i].includes('fetch(') || lines[i].includes('generatePage') || lines[i].includes('savePage') || lines[i].includes('loadPages')) {
        apiLines.push({ line: i + 1, code: lines[i].trim() });
      }
    }
    results.indexHtml = {
      totalLines: lines.length,
      apiRelatedLines: apiLines
    };
  } catch (e) {
    results.indexHtml = { error: e.message };
  }

  return res.status(200).json(results);
}
