// RunAds - Main Express Server (Development)
// In production, Vercel serverless functions handle API routes

import { config } from 'dotenv';
config();

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { nanoid } from 'nanoid';
import { initDatabase } from './database.js';
import { deployPage, deletePage, getPagesUrl } from './lib/github.js';
import { injectTracking } from './lib/tracking.js';
import { verifyAuth } from './lib/auth.js';

const app = express();
const PORT = process.env.PORT || 3457;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'runads-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static('public'));

let db;

// ============================================================
// PAGES API
// ============================================================

// Get all pages
app.get('/api/pages', (req, res) => {
  try {
    const pages = db.prepare(`
      SELECT id, name, slug, client_id, client_name, status, page_type, template_type,
             views, leads, meta_title, custom_domain, created_at, updated_at, deployed_at
      FROM landing_pages ORDER BY created_at DESC
    `).all();
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single page
app.get('/api/pages/:id', (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create page
app.post('/api/pages', (req, res) => {
  try {
    const id = nanoid(12);
    const { name, slug, html_content, client_id, client_name, page_type, template_type,
            meta_title, meta_description } = req.body;

    const pageSlug = slug || name.toLowerCase().replace(/[[a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    db.prepare(`
      INSERT INTO landing_pages (id, name, slug, html_content, client_id, client_name, page_type,
        template_type, meta_title, meta_description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(id, name, pageSlug, html_content || '', client_id || null, client_name || '',
           page_type || 'custom', template_type || null, meta_title || name, meta_description || '');

    res.json({ id, slug: pageSlug, message: 'Page created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update page
app.put('/api/pages/:id', (req, res) => {
  try {
    const { name, html_content, client_id, client_name, status, meta_title, meta_description } = req.body;
    const sets = [];
    const vals = [];

    if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
    if (html_content !== undefined) { sets.push('html_content = ?'); vals.push(html_content); }
    if (client_id !== undefined) { sets.push('client_id = ?'); vals.push(client_id); }
    if (client_name !== undefined) { sets.push('client_name = ?'); vals.push(client_name); }
    if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
    if (meta_title !== undefined) { sets.push('meta_title = ?'); vals.push(meta_title); }
    if (meta_description !== undefined) { sets.push('meta_description = ?'); vals.push(meta_description); }
    sets.push('updated_at = CURRENT_TIMESTAMP');

    if (sets.length === 1) return res.json({ message: 'Nothing to update' });

    vals.push(req.params.id);
    db.prepare(`UPDATE landing_pages SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    res.json({ message: 'Page updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete page
app.delete('/api/pages/:id', async (req, res) => {
  try {
    const page = db.prepare('SELECT slug FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    // Remove from GitHub Pages
    try { await deletePage(page.slug); } catch (e) { console.log('GitHub delete skipped:', e.message); }

    db.prepare('DELETE FROM landing_pages WHERE id = ?').run(req.params.id);
    res.json({ message: 'Page deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deploy page to GitHub Pages
app.post('/api/pages/:id/deploy', async (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    // Inject tracking script
    const apiBase = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const trackedHtml = injectTracking(page.html_content, page.id, apiBase);

    // Deploy to GitHub Pages
    const url = await deployPage(page.slug, trackedHtml);

    // Update status
    db.prepare(`
      UPDATE landing_pages SET status = 'live', deployed_at = CURRENT_TIMESTAMP,
        github_path = ? WHERE id = ?
    `).run(url, page.id);

    res.json({ url, message: 'Page deployed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick deploy (create + deploy in one step)
app.post('/api/deploy', async (req, res) => {
  try {
    const { name, slug, html_content, client_id, client_name } = req.body;
    const id = nanoid(12);
    const pageSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Store in DB
    db.prepare(`
      INSERT INTO landing_pages (id, name, slug, html_content, client_id, client_name, status)
      VALUES (?, ?, ?, ?, ?, ?, 'live')
    `).run(id, name, pageSlug, html_content, client_id || null, client_name || '');

    // Inject tracking and deploy
    const apiBase = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const trackedHtml = injectTracking(html_content, id, apiBase);
    const url = await deployPage(pageSlug, trackedHtml);

    db.prepare('UPDATE landing_pages SET github_path = ?, deployed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(url, id);

    res.json({ id, slug: pageSlug, url, message: 'Page deployed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ANALYTICS API
// ============================================================

// Track page view
app.post('/api/track/:pageId', (req, res) => {
  try {
    const { utm_source, utm_medium, utm_campaign, utm_content, utm_term,
            referrer, device_type, user_agent, session_id } = req.body;

    db.prepare(`
      INSERT INTO page_views (page_id, utm_source, utm_medium, utm_campaign, utm_content,
        utm_term, referrer, device_type, user_agent, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.pageId, utm_source, utm_medium, utm_campaign, utm_content,
           utm_term, referrer, device_type, user_agent, session_id);

    // Increment view counter
    db.prepare('UPDATE landing_pages SET views = views + 1 WHERE id = ?').run(req.params.pageId);

    res.json({ ok: true });
  } catch (err) {
    res.status(200).json({ ok: false }); // Don't fail silently for tracking
  }
});

// Track conversion
app.post('/api/convert/:pageId', (req, res) => {
  try {
    const { event_type, event_value, utm_source, utm_medium, utm_campaign, session_id, metadata } = req.body;

    db.prepare(`
      INSERT INTO conversions (page_id, event_type, event_value, utm_source, utm_medium,
        utm_campaign, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.pageId, event_type || 'conversion', event_value || null,
           utm_source, utm_medium, utm_campaign, JSON.stringify(metadata || {}));

    res.json({ ok: true });
  } catch (err) {
    res.status(200).json({ ok: false });
  }
});

// Get analytics for a page
app.get('/api/pages/:id/analytics', (req, res) => {
  try {
    const { days } = req.query;
    const since = days ? `datetime('now', '-${parseInt(days)} days')` : `datetime('now', '-30 days')`;

    const views = db.prepare(`
      SELECT DATE(timestamp) as date, COUNT(*) as count,
             device_type, utm_source, utm_medium, utm_campaign
      FROM page_views WHERE page_id = ? AND timestamp >= ${since}
      GROUP BY DATE(timestamp), device_type
      ORDER BY date
    `).all(req.params.id);

    const leads = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM leads WHERE page_id = ? AND created_at >= ${since}
      GROUP BY DATE(created_at) ORDER BY date
    `).all(req.params.id);

    const conversions = db.prepare(`
      SELECT DATE(timestamp) as date, COUNT(*) as count, event_type
      FROM conversions WHERE page_id = ? AND timestamp >= ${since}
      GROUP BY DATE(timestamp), event_type ORDER BY date
    `).all(req.params.id);

    const topSources = db.prepare(`
      SELECT utm_source, COUNT(*) as count FROM page_views
      WHERE page_id = ? AND utm_source != '' AND timestamp >= ${since}
      GROUP BY utm_source ORDER BY count DESC LIMIT 10
    `).all(req.params.id);

    const deviceBreakdown = db.prepare(`
      SELECT device_type, COUNT(*) as count FROM page_views
      WHERE page_id = ? AND timestamp >= ${since}
      GROUP BY device_type
    `).all(req.params.id);

    res.json({ views, leads, conversions, topSources, deviceBreakdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LEADS API
// ============================================================

// Submit lead (from landing page forms)
app.post('/api/submit/:pageId', (req, res) => {
  try {
    const { form_data, email, name, phone, utm_source, utm_medium, utm_campaign,
            utm_content, utm_term, referrer, device_type, session_id } = req.body;

    db.prepare(`
      INSERT INTO leads (page_id, form_data, email, name, phone, utm_source, utm_medium,
        utm_campaign, utm_content, utm_term, referrer, device_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.pageId, JSON.stringify(form_data || {}), email || '',
           name || '', phone || '', utm_source, utm_medium, utm_campaign,
           utm_content, utm_term, referrer, device_type);

    // Increment lead counter
    db.prepare('UPDATE landing_pages SET leads = leads + 1 WHERE id = ?').run(req.params.pageId);

    res.json({ ok: true, message: 'Lead captured' });
  } catch (err) {
    res.status(200).json({ ok: false });
  }
});

// Get all leads
app.get('/api/leads', (req, res) => {
  try {
    const { page_id, limit, offset } = req.query;
    let query = `
      SELECT l.*, lp.name as page_name, lp.slug as page_slug
      FROM leads l LEFT JOIN landing_pages lp ON l.page_id = lp.id
    `;
    const params = [];
    if (page_id) {
      query += ' WHERE l.page_id = ?';
      params.push(page_id);
    }
    query += ' ORDER BY l.created_at DESC';
    if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit)); }
    if (offset) { query += ' OFFSET ?'; params.push(parseInt(offset)); }

    const leads = db.prepare(query).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as count FROM leads ${page_id ? 'WHERE page_id = ?' : ''}`)
      .get(...(page_id ? [page_id] : []));

    res.json({ leads, total: total.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export leads as CSV
app.get('/api/leads/export', (req, res) => {
  try {
    const { page_id } = req.query;
    let query = 'SELECT * FROM leads';
    const params = [];
    if (page_id) { query += ' WHERE page_id = ?'; params.push(page_id); }
    query += ' ORDER BY created_at DESC';

    const leads = db.prepare(query).all(...params);

    const headers = ['id', 'page_id', 'email', 'name', 'phone', 'form_data',
      'utm_source', 'utm_medium', 'utm_campaign', 'created_at'];
    const csv = [headers.join(',')];
    leads.forEach(l => {
      csv.push(headers.map(h => `"${(l[h] || '').toString().replace(/"/g, '""')}"`).join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads-${Date.now()}.csv`);
    res.send(csv.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// A/B TESTING API
// ============================================================

app.post('/api/pages/:id/variants', (req, res) => {
  try {
    const id = nanoid(12);
    const { variant_name, html_content, weight } = req.body;
    db.prepare(`
      INSERT INTO ab_variants (id, page_id, variant_name, html_content, weight)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.params.id, variant_name, html_content, weight || 50);
    res.json({ id, message: 'Variant created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pages/:id/variants', (req, res) => {
  try {
    const variants = db.prepare('SELECT * FROM ab_variants WHERE page_id = ?').all(req.params.id);
    res.json(variants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pages/:id/ab-results', (req, res) => {
  try {
    const variants = db.prepare(`
      SELECT id, variant_name, views, conversions,
        CASE WHEN views > 0 THEN ROUND(conversions * 100.0 / views, 2) ELSE 0 END as conversion_rate
      FROM ab_variants WHERE page_id = ? ORDER BY conversion_rate DESC
    `).all(req.params.id);
    res.json(variants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CLIENTS API
// ============================================================

app.get('/api/clients', (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT c.*, COUNT(DISTINCT lp.id) as page_count,
        COUNT(DISTINCT vc.id) as claim_count, COuUNT(DISTINCT t.id) as testimonial_count
      FROM clients c
      LEFT JOIN landing_pages lp ON lp.client_id = c.id
      LEFT JOIN verified_claims vc ON vc.client_id = c.id
      LEFT JOIN testimonials t ON t.client_id = c.id
      GROUP BY c.id ORDER BY c.created_at DESC
    `).all();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const style_guide = db.prepare('SELECT * FROM brand_style_guides WHERE client_id = ?').get(req.params.id);
    const claims = db.prepare('SELECT * FROM sverified_claims WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
    const testimonials = db.prepare('SELECT * FROM ttestimonials WHERE client_id = ?').all(req.params.id);
    const products = db.prepare('SELECT * FROM products WHERE client_id = ?').all(req.params.id);
    const audiences = db.prepare('SELECT * FROM target_audiences WHERE client_id = ?').all(req.params.id);
    const pages = db.prepare('SELECT id, name, slug, status, views, leads FROM landing_pages WHERE client_id = ?').all(req.params.id);

    res.json({ ...client, style_guide, claims, testimonials, products, audiences, pages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', (req, res) => {
  try {
    const id = nanoid(12);
    const { name, website, industry, tagline, brand_voice, description } = req.body;

    db.prepare(`
      INSERT INTO clients (id, name, website, industry, tagline, brand_voice, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, website || '', industry || '', tagline || '', brand_voice || '', description || '');

    // Create default style guide
    db.prepare('INSERT INTO brand_style_guides (client_id) VALUES (?)').run(id);

    res.json({ id, message: 'Client created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', (req, res) => {
  try {
    const { name, website, industry, tagline, brand_voice, description,
            research_status, research_data } = req.body;
    const sets = [];
    const vals = [];

    if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
    if (website !== undefined) { sets.push('website = ?'); vals.push(website); }
    if (industry !== undefined) { sets.push('industry = ?'); vals.push(industry); }
    if (tagline !== undefined) { sets.push('tagline = ?'); vals.push(tagline); }
    if (brand_voice !== undefined) { sets.push('brand_voice = ?'); vals.push(brand_voice); }
    if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
    if (research_status !== undefined) { sets.push('research_status = ?'); vals.push(research_status); }
    if (research_data !== undefined) { sets.push('research_data = ?'); vals.push(JSON.stringify(research_data)); }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(req.params.id);

    db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    res.json({ message: 'Client updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Style guide update
app.put('/api/clients/:id/style-guide', (req, res) => {
  try {
    const fields = ['primary_color', 'secondary_color', 'accent_color', 'background_color',
      'text_color', 'heading_font', 'body_font', 'border_radius', 'spacing_unit',
      'max_width', 'button_style', 'custom_css'];
    const sets = [];
    const vals = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(typeof req.body[f] === 'object' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    });

    if (sets.length === 0) return res.json({ message: 'Nothing to update' });
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(req.params.id);

    db.prepare(`UPDATE brand_style_guides SET ${sets.join(', ')} WHERE client_id = ?`).run(...vals);
    res.json({ message: 'Style guide updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verified claims
app.post('/api/clients/:id/claims', (req, res) => {
  try {
    const { claim_text, source, category } = req.body;
    const result = db.prepare(`
      INSERT INTO verified_claims (client_id, claim_text, source, category)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, claim_text, source || '', category || 'general');
    res.json({ id: result.lastInsertRowid, message: 'Claim added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Testimonials
app.post('/api/clients/:id/testimonials', (req, res) => {
  try {
    const { quote, author_name, author_role, author_company, rating, result_metric } = req.body;
    const result = db.prepare(`
      INSERT INTO testimonials (client_id, quote, author_name, author_role, author_company, rating, result_metric)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, quote, author_name || '', author_role || '',
           author_company || '', rating || null, result_metric || '');
    res.json({ id: result.lastInsertRowid, message: 'Testimonial added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products
app.post('/api/clients/:id/products', (req, res) => {
  try {
    const { name, description, price, url, features, benefits } = req.body;
    const result = db.prepare(`
      INSERT INTO products (client_id, name, description, price, url, features, benefits)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, name, description || '', price || '', url || '',
           JSON.stringify(features || []), JSON.stringify(benefits || []));
    res.json({ id: result.lastInsertRowid, message: 'Product added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Target audiences
app.post('/api/clients/:id/audiences', (req, res) => {
  try {
    const { name, demographics, psychographics, pain_points, desires, objections, triggers } = req.body;
    const result = db.prepare(`
      INSERT INTO target_audiences (client_id, name, demographics, psychographics, pain_points, desires, objections, triggers)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, name, JSON.stringify(demographics || {}), JSON.stringify(psychographics || {}),
           JSON.stringify(pain_points || []), JSOn.stringify(desires || []),
           JSON.stringify(objections || []), JSON.stringify(triggers || []));
    res.json({ id: result.lastInsertRowid, message: 'Audience added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CUSTOM DOMAINS
// ============================================================

app.put('/api/pages/:id/domain', (req, res) => {
  try {
    const { domain } = req.body;
    db.prepare('UPDATE landing_pages SET custom_domain = ? WHERE id = ?').run(domain, req.params.id);
    db.prepare(`
      INSERT OR REPLACE INTO custom_domains (page_id, domain)
      VALUES (?, ?)
    `).run(req.params.id, domain);
    res.json({ message: 'Domain configured', domain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/domains', (req, res) => {
  try {
    const domains = db.prepare(`
      SELECT cd.*, lp.name as page_name, lp.slug as page_slug
      FROM custom_domains cd LEFT JOIN landing_pages lp ON cd.page_id = lp.id
    `).all();
    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DASHBOARD STATS
// ============================================================

app.get('/api/stats', (req, res) => {
  try {
    const totalPages = db.prepare('SELECT COuUNT(*) as count FROM landing_pages').get().count;
    const livePages = db.prepare("SELECT COUS

H\ÈÛÝ[ÓH[[×ÜYÙ\ÈÒTHÝ]\ÈH	Û]IÈKÙ]

KÛÝ[ÂÛÛÝÝ[Y]ÜÈH\\J	ÔÑSPÕÓÐSTÐÑJÕSJY]ÜÊK
H\ÈÛÝ[ÓH[[×ÜYÙ\ÉÊKÙ]

KÛÝ[ÂÛÛÝÝ[XYÈH\\J	ÔÑSPÕÓÐSTÐÑJÕSJXYÊK
H\ÈÛÝ[ÓH[[×ÜYÙ\ÉÊKÙ]

KÛÝ[ÂÛÛÝÝ[ÛY[ÈH\\J	ÔÑSPÕÓÕS

H\ÈÛÝ[ÓHÛY[ÉÊKÙ]

KÛÝ[Â\ËÛÛÈÝ[YÙ\Ë]TYÙ\ËÝ[Y]ÜËÝ[XYËÝ[ÛY[ÈJNÂHØ]Ú
\HÂ\ËÝ]\Ê
L
KÛÛÈ\Ü\Y\ÜØYÙHJNÂBJNÂËÈOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOBËÈÕTÑTTËÈOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB\Þ[È[Ý[ÛÝ\

HÂH]ØZ][]]X\ÙJ
NÂY
YHÂÛÛÛÛK\Ü	ÑZ[YÈ[]X[^H]X\ÙIÊNÂØÙ\ÜË^]
JNÂB\\Ý[Ô

HOÂÛÛÛÛKÙÊ[YÈÙ\\[[È]ËÛØØ[ÜÝÔÔW
NÂJNÂBÝ\

NÂÜYÙ\ÉÊKÙ]

KÛÝ[ÂÛÛÝ]TYÙ\ÈH\\JÑSPÕÓÝUS

H\ÈÛÝ[ÓH[[×ÜYÙ\ÈÒTHÝ]\ÈH	Û]IÈKÙ]

KÛÝ[ÂÛÛÝÝ[Y]ÜÈH\\J	ÔÑSPÕÓÐSTÐÑJÕSJY]ÜÊK
H\ÈÛÝ[ÓH[[×ÜYÙ\ÉÊKÙ]

KÛÝ[ÂÛÛÝÝ[XYÈH\\J	ÔÑSPÕÓÐSTÐÑJÕSKXYÊK
H\ÈÛÝ[ÓH[[×ÜYÙ\ÉÊKÙ]

KÛÝ[ÂÛÛÝÝ[ÛY[ÈH\\J	ÔÑSPÕÓÕTåB¢26÷VçBe$ôÒ6ÆVçG2rævWBæ6÷VçC°¢&W2æ§6öâ²F÷FÅvW2ÂÆfUvW2ÂF÷FÅfWw2ÂF÷FÄÆVG2ÂF÷FÄ6ÆVçG2Ò°¢Ò6F6W'"°¢&W2ç7FGW2Sæ§6öâ²W'&÷#¢W'"æÖW76vRÒ°¢Ð§Ò° ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢òò5D%B4U%dU ¢òòòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ ¦7æ2gVæ7Föâ7F'B°¢F"ÒvBæDFF&6R°¢bF"°¢6öç6öÆRæW'&÷"tfÆVBFòæFÆ¦RFF&6Rr°¢&ö6W72æWB°¢Ð ¢æÆ7FVâõ%BÂÓâ°¢6öç6öÆRæÆörÆâ'VäG26W'fW"'VææærBGG¢òöÆö6Æ÷7C¢Gµõ%GÕÆæ°¢Ò°§Ð §7F'B°
