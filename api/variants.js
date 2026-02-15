// RunAds - A/B Variant Generation & Management API
// Single dispatcher: POST/GET/DELETE /api/variants/{pageId}[/generate|/{variantId}]

export const config = { maxDuration: 300 };

import { getPageTemplate, generateBrandCSS, populateTemplate } from '../lib/design-system.js';

const GITHUB_API = 'https://api.github.com';

async function getGitHubFile(path) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!resp.ok) return { data: null, sha: null };
  const file = await resp.json();
  const content = Buffer.from(file.content, 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: file.sha };
}

async function saveGitHubFile(path, data, sha, message) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const body = {
    message: message || `Update ${path}`,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
  };
  if (sha) body.sha = sha;
  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function callClaude(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  if (!resp.ok) throw new Error(`Claude API: ${resp.status}`);
  const data = await resp.json();
  return { text: data.content?.[0]?.text || '', tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) };
}

// ============================================================
// VARIANT TYPES
// ============================================================
const VARIANT_TYPES = {
  'alternate-layout': {
    name: 'Alternate Layout',
    description: 'Different section arrangement and visual hierarchy',
    transform: (html, brand) => {
      // Swap grid-2 to reverse direction, change hero style
      let modified = html.replace(/grid-template-columns:\s*1fr\s+1fr/g, 'grid-template-columns: 1fr 1fr; direction: rtl');
      modified = modified.replace('min-height: 80vh', 'min-height: 70vh; background: var(--bg-alt)');
      return modified;
    }
  },
  'dark-theme': {
    name: 'Dark Theme',
    description: 'Dark background with light text',
    transform: (html, brand) => {
      const darkOverrides = `
      :root {
        --bg: #0f0f0f !important;
        --bg-alt: #1a1a2e !important;
        --text: #e5e7eb !important;
        --text-light: #9ca3af !important;
        --border: #374151 !important;
      }
      body { background: #0f0f0f !important; color: #e5e7eb !important; }
      .section-alt { background: #1a1a2e !important; }
      .section-dark { background: ${brand?.colors?.accent || '#e94560'} !important; }
      .testimonial-card { background: #1f2937 !important; border-color: #374151 !important; }
      .sticky-nav { background: #0f0f0f !important; border-color: #374151 !important; }
      .calc-card, .premium-card { background: #1f2937 !important; border-color: #374151 !important; }
      input, select, textarea { background: #1f2937 !important; color: #e5e7eb !important; border-color: #374151 !important; }
      `;
      return html.replace('</style>', `${darkOverrides}\n</style>`);
    }
  },
  'urgency-focused': {
    name: 'Urgency Focused',
    description: 'Enhanced urgency and scarcity elements',
    transform: (html, brand) => {
      // Add urgency banner at top
      const urgencyBanner = `
      <div style="background: ${brand?.colors?.urgency || '#ef4444'}; color: #fff; text-align: center; padding: 12px; font-weight: 700; font-size: 0.9rem; position: sticky; top: 0; z-index: 300;">
        Limited Time Offer — Only Available Until Midnight Tonight
      </div>`;
      // Add countdown before CTAs
      const countdownCSS = `
      .countdown-timer { display: inline-flex; gap: 8px; margin: 16px 0; }
      .countdown-unit { background: var(--primary); color: var(--text-on-dark, #fff); padding: 8px 12px; border-radius: 4px; text-align: center; min-width: 50px; }
      .countdown-number { font-size: 1.5rem; font-weight: 800; display: block; }
      .countdown-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
      `;
      let modified = html.replace('</style>', `${countdownCSS}\n</style>`);
      modified = modified.replace('<body>', `<body>\n${urgencyBanner}`);
      return modified;
    }
  }
};

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathParts = url.pathname.replace('/api/variants', '').split('/').filter(Boolean);

    const pageId = pathParts[0];
    if (!pageId) {
      return res.status(400).json({ error: 'pageId is required' });
    }

    // POST /api/variants/{pageId}/generate - Generate variants
    if (pathParts[1] === 'generate' && req.method === 'POST') {
      return handleGenerate(pageId, req, res);
    }

    // GET /api/variants/{pageId} - List variants
    if (req.method === 'GET' && pathParts.length === 1) {
      return handleList(pageId, req, res);
    }

    // DELETE /api/variants/{pageId}/{variantId} - Delete variant
    if (req.method === 'DELETE' && pathParts.length === 2) {
      return handleDelete(pageId, pathParts[1], req, res);
    }

    return res.status(404).json({ error: 'Unknown variants action' });
  } catch (error) {
    console.error('Variants error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Generate variants for a page
async function handleGenerate(pageId, req, res) {
  const { variant_types } = req.body || {};

  // Load the page from pages.json
  const { data: pages, sha } = await getGitHubFile('data/pages.json');
  if (!pages) return res.status(500).json({ error: 'Could not load pages' });

  const pageIndex = pages.findIndex(p => p.id === pageId);
  if (pageIndex === -1) return res.status(404).json({ error: 'Page not found' });

  const page = pages[pageIndex];
  const originalHtml = page.html_content;
  const brand = {}; // Basic brand from page data

  // Determine which variant types to generate
  const typesToGenerate = variant_types || ['alternate-layout', 'dark-theme', 'urgency-focused'];
  const variants = [];

  for (const type of typesToGenerate) {
    const variantDef = VARIANT_TYPES[type];
    if (!variantDef) continue;

    try {
      const variantId = 'var_' + type + '_' + Date.now().toString(36).slice(-4);
      const variantHtml = variantDef.transform(originalHtml, brand);

      variants.push({
        id: variantId,
        name: variantDef.name,
        type: type,
        description: variantDef.description,
        html_content: variantHtml,
        views: 0,
        conversions: 0,
        conversion_rate: 0,
        is_winner: false,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error(`Failed to generate ${type} variant:`, e.message);
    }
  }

  // Save variants on the page object
  page.variants = [...(page.variants || []), ...variants];
  page.ab_test_active = false;
  pages[pageIndex] = page;

  await saveGitHubFile('data/pages.json', pages, sha, `Add ${variants.length} variants for ${page.name}`);

  return res.status(200).json({
    success: true,
    pageId,
    variants_created: variants.length,
    variants: variants.map(v => ({
      id: v.id,
      name: v.name,
      type: v.type,
      description: v.description,
      created_at: v.created_at
    }))
  });
}

// List variants for a page
async function handleList(pageId, req, res) {
  const { data: pages } = await getGitHubFile('data/pages.json');
  if (!pages) return res.status(500).json({ error: 'Could not load pages' });

  const page = pages.find(p => p.id === pageId);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  const variants = (page.variants || []).map(v => ({
    id: v.id,
    name: v.name,
    type: v.type,
    description: v.description,
    views: v.views || 0,
    conversions: v.conversions || 0,
    conversion_rate: v.views > 0 ? ((v.conversions / v.views) * 100).toFixed(1) : '0.0',
    is_winner: v.is_winner || false,
    created_at: v.created_at
  }));

  return res.status(200).json({
    pageId,
    page_name: page.name,
    ab_test_active: page.ab_test_active || false,
    variants_count: variants.length,
    variants
  });
}

// Delete a variant
async function handleDelete(pageId, variantId, req, res) {
  const { data: pages, sha } = await getGitHubFile('data/pages.json');
  if (!pages) return res.status(500).json({ error: 'Could not load pages' });

  const pageIndex = pages.findIndex(p => p.id === pageId);
  if (pageIndex === -1) return res.status(404).json({ error: 'Page not found' });

  const page = pages[pageIndex];
  const beforeCount = (page.variants || []).length;
  page.variants = (page.variants || []).filter(v => v.id !== variantId);
  const afterCount = page.variants.length;

  if (beforeCount === afterCount) {
    return res.status(404).json({ error: 'Variant not found' });
  }

  pages[pageIndex] = page;
  await saveGitHubFile('data/pages.json', pages, sha, `Delete variant ${variantId} from ${page.name}`);

  return res.status(200).json({
    success: true,
    message: 'Variant deleted',
    remaining_variants: afterCount
  });
}
