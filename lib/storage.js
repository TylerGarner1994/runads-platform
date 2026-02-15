// RunAds - Unified Storage Module
// Postgres-first with GitHub fallback for backward compatibility
// Replaces inline getGitHubFile/saveGitHubFile across all API endpoints

import { initDb, isPgAvailable, getSql } from './postgres.js';

let storageReady = false;
let sql;

// ============================================================
// INITIALIZATION
// ============================================================
async function ensureStorage() {
  if (storageReady) return;
  await initDb();
  if (isPgAvailable()) {
    sql = getSql();
    // Add columns that may be missing from original schema
    try {
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'`;
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS expert_scores JSONB DEFAULT '{}'`;
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS url TEXT`;
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS ab_test_active BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS generation_job_id TEXT`;
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS factcheck_score REAL`;
      await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT ''`;
      await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_voice TEXT DEFAULT ''`;
      await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS style_guide JSONB`;
      await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS claims JSONB DEFAULT '[]'`;
      await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS testimonials_data JSONB DEFAULT '[]'`;
      await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS products_data JSONB DEFAULT '[]'`;
      await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS audiences JSONB DEFAULT '[]'`;
    } catch (e) {
      console.warn('Column migration warning (non-fatal):', e.message);
    }
  }
  storageReady = true;
}

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

// ============================================================
// GITHUB FALLBACK (kept for backward compat + deployed HTML)
// ============================================================
const GITHUB_API = 'https://api.github.com';

function ghHeaders() {
  return { 'Authorization': `token ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' };
}

function ghRepo() {
  return { owner: process.env.GITHUB_OWNER || 'TylerGarner1994', repo: process.env.GITHUB_REPO || 'runads-platform' };
}

async function getGitHubFile(path) {
  const { owner, repo } = ghRepo();
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers: ghHeaders() });
  if (resp.status === 404) return { data: null, sha: null };
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  const file = await resp.json();
  return { data: JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8')), sha: file.sha };
}

async function saveGitHubFile(path, content, sha, message) {
  const { owner, repo } = ghRepo();
  const body = { message: message || 'Update data', content: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(`GitHub save error: ${err.message || resp.status}`); }
  return await resp.json();
}

// Deploy HTML file to GitHub (still needed for public page hosting)
async function deployHtmlToGitHub(slug, htmlContent) {
  const { owner, repo } = ghRepo();
  const pagePath = `deployed-pages/${slug}.html`;
  let sha = null;
  try {
    const cr = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${pagePath}`, { headers: ghHeaders() });
    if (cr.ok) sha = (await cr.json()).sha;
  } catch (e) {}
  await saveGitHubFile(pagePath, htmlContent, sha, `Deploy: ${slug}`);
  return `https://${owner}.github.io/${repo}/${pagePath}`;
}

// ============================================================
// PAGES CRUD
// ============================================================
async function getPages(includeHtml = false) {
  await ensureStorage();
  if (isPgAvailable()) {
    const cols = includeHtml
      ? '*'
      : 'id, name, slug, client_id, client_name, status, page_type, template_type, views, leads, custom_domain, meta_title, meta_description, og_image, url, ab_test_active, generation_job_id, factcheck_score, expert_scores, variants, created_at, updated_at, deployed_at';
    const result = await sql.query(`SELECT ${cols} FROM landing_pages ORDER BY created_at DESC`);
    return result.rows.map(rowToPage);
  }
  const { data } = await getGitHubFile('data/pages.json');
  return data || [];
}

async function getPage(id) {
  await ensureStorage();
  if (isPgAvailable()) {
    const result = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
    return result.rows.length ? rowToPage(result.rows[0]) : null;
  }
  const { data } = await getGitHubFile('data/pages.json');
  return (data || []).find(p => p.id === id) || null;
}

async function getPageBySlug(slug) {
  await ensureStorage();
  if (isPgAvailable()) {
    const result = await sql`SELECT * FROM landing_pages WHERE slug = ${slug}`;
    return result.rows.length ? rowToPage(result.rows[0]) : null;
  }
  const { data } = await getGitHubFile('data/pages.json');
  return (data || []).find(p => p.slug === slug) || null;
}

async function savePage(page) {
  await ensureStorage();
  const now = new Date().toISOString();
  if (!page.id) page.id = generateId();
  page.updated_at = now;
  if (!page.created_at) page.created_at = now;

  if (isPgAvailable()) {
    await sql`
      INSERT INTO landing_pages (id, name, slug, html_content, client_id, client_name, status, page_type, template_type,
        views, leads, custom_domain, meta_title, meta_description, og_image, url, ab_test_active, generation_job_id,
        factcheck_score, expert_scores, variants, created_at, updated_at, deployed_at)
      VALUES (${page.id}, ${page.name || 'Untitled'}, ${page.slug || ''}, ${page.html_content || ''},
        ${page.client_id || null}, ${page.client_name || ''}, ${page.status || 'draft'}, ${page.page_type || 'custom'},
        ${page.template_type || null}, ${page.views || 0}, ${page.leads || 0}, ${page.custom_domain || null},
        ${page.meta_title || ''}, ${page.meta_description || ''}, ${page.og_image || null},
        ${page.url || `/p/${page.slug}`}, ${page.ab_test_active || false}, ${page.generation_job_id || null},
        ${page.factcheck_score || null}, ${JSON.stringify(page.expert_scores || {})},
        ${JSON.stringify(page.variants || [])}, ${page.created_at}, ${page.updated_at}, ${page.deployed_at || null})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, slug = EXCLUDED.slug, html_content = EXCLUDED.html_content,
        client_id = EXCLUDED.client_id, client_name = EXCLUDED.client_name, status = EXCLUDED.status,
        page_type = EXCLUDED.page_type, template_type = EXCLUDED.template_type,
        views = EXCLUDED.views, leads = EXCLUDED.leads, custom_domain = EXCLUDED.custom_domain,
        meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, og_image = EXCLUDED.og_image,
        url = EXCLUDED.url, ab_test_active = EXCLUDED.ab_test_active, generation_job_id = EXCLUDED.generation_job_id,
        factcheck_score = EXCLUDED.factcheck_score, expert_scores = EXCLUDED.expert_scores,
        variants = EXCLUDED.variants, updated_at = EXCLUDED.updated_at, deployed_at = EXCLUDED.deployed_at`;
    return page.id;
  }
  // GitHub fallback
  const { data, sha } = await getGitHubFile('data/pages.json');
  const pages = data || [];
  const idx = pages.findIndex(p => p.id === page.id);
  if (idx >= 0) pages[idx] = { ...pages[idx], ...page };
  else pages.unshift(page);
  await saveGitHubFile('data/pages.json', pages, sha, `Save page: ${page.name}`);
  return page.id;
}

async function updatePage(id, updates) {
  await ensureStorage();
  const now = new Date().toISOString();
  if (isPgAvailable()) {
    // Build dynamic SET clause
    const page = await getPage(id);
    if (!page) throw new Error('Page not found');
    const merged = { ...page, ...updates, updated_at: now };
    await savePage(merged);
    return merged;
  }
  const { data, sha } = await getGitHubFile('data/pages.json');
  const pages = data || [];
  const idx = pages.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Page not found');
  Object.assign(pages[idx], updates, { updated_at: now });
  await saveGitHubFile('data/pages.json', pages, sha, 'Update page');
  return pages[idx];
}

async function deletePage(id) {
  await ensureStorage();
  if (isPgAvailable()) {
    const result = await sql`DELETE FROM landing_pages WHERE id = ${id} RETURNING id`;
    return result.rows.length > 0;
  }
  const { data, sha } = await getGitHubFile('data/pages.json');
  const pages = data || [];
  const filtered = pages.filter(p => p.id !== id);
  if (filtered.length === pages.length) return false;
  await saveGitHubFile('data/pages.json', filtered, sha, 'Delete page');
  return true;
}

function rowToPage(row) {
  return {
    ...row,
    variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : (row.variants || []),
    expert_scores: typeof row.expert_scores === 'string' ? JSON.parse(row.expert_scores) : (row.expert_scores || {}),
    views: row.views || 0,
    leads: row.leads || 0,
    url: (row.url && (row.url.startsWith('/p/') || row.url.startsWith('http'))) ? row.url : `/p/${row.url || row.slug}`,
    ab_test_active: row.ab_test_active || false,
  };
}

// ============================================================
// CLIENTS CRUD
// ============================================================
async function getClients() {
  await ensureStorage();
  if (isPgAvailable()) {
    const result = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
    return result.rows.map(rowToClient);
  }
  const { data } = await getGitHubFile('data/clients.json');
  return data || [];
}

async function getClient(id) {
  await ensureStorage();
  if (isPgAvailable()) {
    const result = await sql`SELECT * FROM clients WHERE id = ${id}`;
    return result.rows.length ? rowToClient(result.rows[0]) : null;
  }
  const { data } = await getGitHubFile('data/clients.json');
  return (data || []).find(c => c.id === id) || null;
}

async function saveClient(client) {
  await ensureStorage();
  const now = new Date().toISOString();
  if (!client.id) client.id = generateId();
  client.updated_at = now;
  if (!client.created_at) client.created_at = now;

  if (isPgAvailable()) {
    await sql`
      INSERT INTO clients (id, name, website, industry, tagline, brand_voice, description,
        research_status, research_data, last_researched, style_guide, claims, testimonials_data,
        products_data, audiences, created_at, updated_at)
      VALUES (${client.id}, ${client.name || 'New Client'}, ${client.website || ''}, ${client.industry || ''},
        ${client.tagline || ''}, ${client.brand_voice || ''}, ${client.description || ''},
        ${client.research_status || 'pending'}, ${JSON.stringify(client.research_data || {})},
        ${client.last_researched || null}, ${JSON.stringify(client.style_guide || null)},
        ${JSON.stringify(client.claims || [])}, ${JSON.stringify(client.testimonials || [])},
        ${JSON.stringify(client.products || [])}, ${JSON.stringify(client.audiences || [])},
        ${client.created_at}, ${client.updated_at})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, website = EXCLUDED.website, industry = EXCLUDED.industry,
        tagline = EXCLUDED.tagline, brand_voice = EXCLUDED.brand_voice, description = EXCLUDED.description,
        research_status = EXCLUDED.research_status, research_data = EXCLUDED.research_data,
        last_researched = EXCLUDED.last_researched, style_guide = EXCLUDED.style_guide,
        claims = EXCLUDED.claims, testimonials_data = EXCLUDED.testimonials_data,
        products_data = EXCLUDED.products_data, audiences = EXCLUDED.audiences,
        updated_at = EXCLUDED.updated_at`;
    return client.id;
  }
  const { data, sha } = await getGitHubFile('data/clients.json');
  const clients = data || [];
  const idx = clients.findIndex(c => c.id === client.id);
  if (idx >= 0) clients[idx] = { ...clients[idx], ...client };
  else clients.unshift(client);
  await saveGitHubFile('data/clients.json', clients, sha, `Save client: ${client.name}`);
  return client.id;
}

async function updateClient(id, updates) {
  await ensureStorage();
  const client = await getClient(id);
  if (!client) throw new Error('Client not found');
  const merged = { ...client, ...updates };
  await saveClient(merged);
  return merged;
}

async function deleteClient(id) {
  await ensureStorage();
  if (isPgAvailable()) {
    const result = await sql`DELETE FROM clients WHERE id = ${id} RETURNING id`;
    return result.rows.length > 0;
  }
  const { data, sha } = await getGitHubFile('data/clients.json');
  const clients = data || [];
  const filtered = clients.filter(c => c.id !== id);
  if (filtered.length === clients.length) return false;
  await saveGitHubFile('data/clients.json', filtered, sha, 'Delete client');
  return true;
}

function rowToClient(row) {
  return {
    ...row,
    style_guide: typeof row.style_guide === 'string' ? JSON.parse(row.style_guide) : (row.style_guide || null),
    claims: typeof row.claims === 'string' ? JSON.parse(row.claims) : (row.claims || []),
    testimonials: typeof row.testimonials_data === 'string' ? JSON.parse(row.testimonials_data) : (row.testimonials_data || []),
    products: typeof row.products_data === 'string' ? JSON.parse(row.products_data) : (row.products_data || []),
    audiences: typeof row.audiences === 'string' ? JSON.parse(row.audiences) : (row.audiences || []),
    research_data: typeof row.research_data === 'string' ? JSON.parse(row.research_data) : (row.research_data || {}),
  };
}

// ============================================================
// LEADS
// ============================================================
async function getLeads(pageId) {
  await ensureStorage();
  if (isPgAvailable()) {
    const result = pageId
      ? await sql`SELECT * FROM leads WHERE page_id = ${pageId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM leads ORDER BY created_at DESC`;
    return result.rows.map(row => ({
      ...row,
      form_data: typeof row.form_data === 'string' ? JSON.parse(row.form_data) : (row.form_data || {})
    }));
  }
  const { data } = await getGitHubFile('data/leads.json');
  const leads = data || [];
  return pageId ? leads.filter(l => l.page_id === pageId) : leads;
}

// ============================================================
// STATS
// ============================================================
async function getStats() {
  await ensureStorage();
  if (isPgAvailable()) {
    const pagesResult = await sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'published') as published, COALESCE(SUM(views), 0) as views, COALESCE(SUM(leads), 0) as leads FROM landing_pages`;
    const clientsResult = await sql`SELECT COUNT(*) as total FROM clients`;
    const p = pagesResult.rows[0];
    const totalPages = parseInt(p.total);
    const published = parseInt(p.published);
    const totalViews = parseInt(p.views);
    const totalLeads = parseInt(p.leads);
    return {
      totalPages, publishedPages: published, draftPages: totalPages - published,
      totalClients: parseInt(clientsResult.rows[0].total),
      totalViews, totalLeads,
      conversionRate: totalViews > 0 ? (totalLeads / totalViews * 100).toFixed(1) : '0.0'
    };
  }
  // GitHub fallback
  const { data: pages } = await getGitHubFile('data/pages.json');
  const { data: clients } = await getGitHubFile('data/clients.json');
  const pl = pages || []; const cl = clients || [];
  const totalViews = pl.reduce((s, p) => s + (p.views || 0), 0);
  const totalLeads = pl.reduce((s, p) => s + (p.leads || 0), 0);
  const pub = pl.filter(p => p.status === 'published').length;
  return { totalPages: pl.length, publishedPages: pub, draftPages: pl.length - pub, totalClients: cl.length, totalViews, totalLeads, conversionRate: totalViews > 0 ? (totalLeads / totalViews * 100).toFixed(1) : '0.0' };
}

// ============================================================
// MIGRATION: Seed Postgres from GitHub JSON
// ============================================================
async function migrateFromGitHub() {
  await ensureStorage();
  if (!isPgAvailable()) throw new Error('Postgres not available');

  const results = { pages: 0, clients: 0, leads: 0 };

  // Migrate pages
  try {
    const { data: pages } = await getGitHubFile('data/pages.json');
    if (pages && pages.length) {
      for (const page of pages) {
        try {
          await sql`
            INSERT INTO landing_pages (id, name, slug, html_content, client_id, client_name, status, page_type, template_type,
              views, leads, custom_domain, meta_title, meta_description, og_image, url, ab_test_active, generation_job_id,
              factcheck_score, expert_scores, variants, created_at, updated_at, deployed_at)
            VALUES (${page.id}, ${page.name || ''}, ${page.slug || ''}, ${page.html_content || ''},
              ${page.client_id || null}, ${page.client_name || ''}, ${page.status || 'draft'}, ${page.page_type || 'custom'},
              ${page.template_type || null}, ${page.views || 0}, ${page.leads || 0}, ${page.custom_domain || null},
              ${page.meta_title || ''}, ${page.meta_description || ''}, ${page.og_image || null},
              ${page.url || `/p/${page.slug}`}, ${page.ab_test_active || false}, ${page.generation_job_id || null},
              ${page.factcheck_score || null}, ${JSON.stringify(page.expert_scores || {})},
              ${JSON.stringify(page.variants || [])}, ${page.created_at || new Date().toISOString()},
              ${page.updated_at || new Date().toISOString()}, ${page.deployed_at || null})
            ON CONFLICT (id) DO NOTHING`;
          results.pages++;
        } catch (e) { console.warn('Page migration skip:', page.id, e.message); }
      }
    }
  } catch (e) { console.warn('Pages migration error:', e.message); }

  // Migrate clients
  try {
    const { data: clients } = await getGitHubFile('data/clients.json');
    if (clients && clients.length) {
      for (const client of clients) {
        try {
          await sql`
            INSERT INTO clients (id, name, website, industry, tagline, brand_voice, description,
              research_status, research_data, last_researched, style_guide, claims, testimonials_data,
              products_data, audiences, created_at, updated_at)
            VALUES (${client.id}, ${client.name || ''}, ${client.website || ''}, ${client.industry || ''},
              ${client.tagline || ''}, ${client.brand_voice || ''}, ${client.description || ''},
              ${client.research_status || 'pending'}, ${JSON.stringify(client.research_data || {})},
              ${client.last_researched || null}, ${JSON.stringify(client.style_guide || null)},
              ${JSON.stringify(client.claims || [])}, ${JSON.stringify(client.testimonials || [])},
              ${JSON.stringify(client.products || [])}, ${JSON.stringify(client.audiences || [])},
              ${client.created_at || new Date().toISOString()}, ${client.updated_at || new Date().toISOString()})
            ON CONFLICT (id) DO NOTHING`;
          results.clients++;
        } catch (e) { console.warn('Client migration skip:', client.id, e.message); }
      }
    }
  } catch (e) { console.warn('Clients migration error:', e.message); }

  // Migrate leads
  try {
    const { data: leads } = await getGitHubFile('data/leads.json');
    if (leads && leads.length) {
      for (const lead of leads) {
        try {
          await sql`
            INSERT INTO leads (page_id, form_data, email, name, phone, utm_source, utm_medium,
              utm_campaign, utm_content, utm_term, referrer, device_type, ip_hash, created_at)
            VALUES (${lead.page_id || ''}, ${JSON.stringify(lead.form_data || {})}, ${lead.email || ''},
              ${lead.name || ''}, ${lead.phone || ''}, ${lead.utm_source || ''}, ${lead.utm_medium || ''},
              ${lead.utm_campaign || ''}, ${lead.utm_content || ''}, ${lead.utm_term || ''},
              ${lead.referrer || ''}, ${lead.device_type || ''}, ${lead.ip_hash || ''},
              ${lead.created_at || new Date().toISOString()})`;
          results.leads++;
        } catch (e) { console.warn('Lead migration skip:', e.message); }
      }
    }
  } catch (e) { console.warn('Leads migration error:', e.message); }

  return results;
}

export {
  ensureStorage, generateId, isPgAvailable,
  // Pages
  getPages, getPage, getPageBySlug, savePage, updatePage, deletePage,
  // Clients
  getClients, getClient, saveClient, updateClient, deleteClient,
  // Leads
  getLeads,
  // Stats
  getStats,
  // GitHub (for deploy + backward compat)
  deployHtmlToGitHub, getGitHubFile, saveGitHubFile,
  // Migration
  migrateFromGitHub
};
