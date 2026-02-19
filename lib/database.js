/**
 * Unified Database Layer
 * Supports both Vercel Postgres (production) and SQLite (local development)
 */

let db = null;
let isPostgres = false;

// Detect environment and load appropriate database
async function getDatabase() {
  if (db) return { db, isPostgres };

  // Check if we're in a Vercel/production environment with Postgres
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    try {
      const { sql } = await import('@vercel/postgres');
      db = sql;
      isPostgres = true;
      console.log('[DB] Using Vercel Postgres');
      return { db, isPostgres };
    } catch (e) {
      console.warn('[DB] Vercel Postgres not available, falling back to SQLite');
    }
  }

  // Fall back to SQLite for local development
  try {
    const Database = (await import('better-sqlite3')).default;
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    db = new Database(join(__dirname, '..', 'landing-pages.db'));
    isPostgres = false;
    console.log('[DB] Using SQLite');

    // Initialize SQLite tables
    initSQLiteTables(db);

    return { db, isPostgres };
  } catch (e) {
    console.error('[DB] Failed to initialize database:', e);
    throw new Error('Database initialization failed');
  }
}

// Initialize SQLite tables (same schema as db.js)
function initSQLiteTables(sqliteDb) {
  sqliteDb.exec(`
    -- Clients table
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      website_url TEXT,
      industry TEXT,
      business_research TEXT,
      source_content TEXT,
      verified_facts TEXT,
      testimonials TEXT,
      research_status TEXT DEFAULT 'pending',
      last_researched_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Brand style guides
    CREATE TABLE IF NOT EXISTS brand_style_guides (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      primary_color TEXT,
      secondary_color TEXT,
      accent_color TEXT,
      background_color TEXT,
      text_color TEXT,
      heading_font TEXT,
      body_font TEXT,
      font_weights TEXT,
      font_sizes TEXT,
      border_radius TEXT,
      spacing_unit TEXT,
      max_width TEXT,
      button_style TEXT,
      card_style TEXT,
      brand_voice TEXT,
      tone_keywords TEXT,
      raw_css TEXT,
      screenshot_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- Verified claims
    CREATE TABLE IF NOT EXISTS verified_claims (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      claim_text TEXT NOT NULL,
      claim_type TEXT,
      source_url TEXT,
      source_text TEXT,
      verification_status TEXT DEFAULT 'unverified',
      confidence_score REAL,
      verified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- Ad copy
    CREATE TABLE IF NOT EXISTS ad_copy (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      client_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel TEXT DEFAULT 'meta',
      ad_type TEXT,
      primary_text TEXT,
      headline TEXT,
      description TEXT,
      cta TEXT,
      hook_angle TEXT,
      target_audience TEXT,
      offer_details TEXT,
      generation_prompt TEXT,
      model_used TEXT,
      tokens_used INTEGER,
      rating INTEGER,
      feedback TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- Image prompts
    CREATE TABLE IF NOT EXISTS image_prompts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      client_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ad_copy_id TEXT,
      prompt_text TEXT NOT NULL,
      negative_prompt TEXT,
      style_reference TEXT,
      aspect_ratio TEXT DEFAULT '1:1',
      image_type TEXT,
      model_target TEXT DEFAULT 'nano_banana_2',
      generation_context TEXT,
      rating INTEGER,
      feedback TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- Landing pages
    CREATE TABLE IF NOT EXISTS landing_pages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      client_name TEXT,
      client_id TEXT,
      template_id TEXT,
      job_id TEXT,
      generation_metadata TEXT,
      html_content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      deployed_at TEXT,
      custom_domain TEXT,
      meta_title TEXT,
      meta_description TEXT,
      tracking_pixel TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_clients_website_url ON clients(website_url);
    CREATE INDEX IF NOT EXISTS idx_brand_style_guides_client_id ON brand_style_guides(client_id);
    CREATE INDEX IF NOT EXISTS idx_verified_claims_client_id ON verified_claims(client_id);
    CREATE INDEX IF NOT EXISTS idx_ad_copy_client_id ON ad_copy(client_id);
    CREATE INDEX IF NOT EXISTS idx_image_prompts_client_id ON image_prompts(client_id);
  `);
}

/**
 * Execute a query that works on both Postgres and SQLite
 * @param {string} query - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Parameters to bind
 * @returns {Promise<{rows: Array}>}
 */
export async function query(queryStr, params = []) {
  const { db, isPostgres } = await getDatabase();

  if (isPostgres) {
    // Vercel Postgres uses tagged template literals
    // We need to convert our parameterized query
    return await db.query(queryStr, params);
  } else {
    // SQLite - convert $1, $2 to ? placeholders
    const sqliteQuery = queryStr.replace(/\$\d+/g, '?');
    const stmt = db.prepare(sqliteQuery);

    // Check if it's a SELECT query
    const isSelect = queryStr.trim().toUpperCase().startsWith('SELECT');

    if (isSelect) {
      const rows = stmt.all(...params);
      return { rows };
    } else {
      const result = stmt.run(...params);
      return { rows: [], changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  }
}

/**
 * Helper to run raw SQL (useful for complex queries)
 */
export async function raw(queryStr, params = []) {
  return query(queryStr, params);
}

/**
 * Get all clients
 */
export async function getClients() {
  const result = await query(`
    SELECT
      c.*,
      bsg.id as brand_guide_id,
      (SELECT COUNT(*) FROM landing_pages WHERE client_id = c.id) as page_count,
      (SELECT COUNT(*) FROM verified_claims WHERE client_id = c.id) as claim_count
    FROM clients c
    LEFT JOIN brand_style_guides bsg ON bsg.client_id = c.id
    ORDER BY c.created_at DESC
  `);

  return result.rows.map(row => ({
    ...row,
    business_research: typeof row.business_research === 'string'
      ? JSON.parse(row.business_research || '{}')
      : row.business_research || {},
    verified_facts: typeof row.verified_facts === 'string'
      ? JSON.parse(row.verified_facts || '[]')
      : row.verified_facts || [],
    testimonials: typeof row.testimonials === 'string'
      ? JSON.parse(row.testimonials || '[]')
      : row.testimonials || [],
    has_brand_guide: !!row.brand_guide_id
  }));
}

/**
 * Get client by ID
 */
export async function getClientById(id) {
  const result = await query(`
    SELECT c.*,
           b.primary_color, b.secondary_color, b.accent_color,
           b.background_color, b.text_color,
           b.heading_font, b.body_font, b.brand_voice, b.tone_keywords,
           b.button_style, b.card_style
    FROM clients c
    LEFT JOIN brand_style_guides b ON c.id = b.client_id
    WHERE c.id = $1
  `, [id]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    business_research: typeof row.business_research === 'string'
      ? JSON.parse(row.business_research || '{}')
      : row.business_research || {},
    tone_keywords: typeof row.tone_keywords === 'string'
      ? JSON.parse(row.tone_keywords || '[]')
      : row.tone_keywords || []
  };
}

/**
 * Create a new client
 */
export async function createClient({ id, name, website_url, industry }) {
  const now = new Date().toISOString();
  await query(`
    INSERT INTO clients (id, name, website_url, industry, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, name, website_url || null, industry || null, now, now]);

  return getClientById(id);
}

/**
 * Update a client
 */
export async function updateClient(id, updates) {
  const { name, website_url, industry, business_research, verified_facts, testimonials, research_status } = updates;
  const now = new Date().toISOString();

  await query(`
    UPDATE clients
    SET name = COALESCE($1, name),
        website_url = COALESCE($2, website_url),
        industry = COALESCE($3, industry),
        business_research = COALESCE($4, business_research),
        verified_facts = COALESCE($5, verified_facts),
        testimonials = COALESCE($6, testimonials),
        research_status = COALESCE($7, research_status),
        updated_at = $8
    WHERE id = $9
  `, [
    name,
    website_url,
    industry,
    business_research ? JSON.stringify(business_research) : null,
    verified_facts ? JSON.stringify(verified_facts) : null,
    testimonials ? JSON.stringify(testimonials) : null,
    research_status,
    now,
    id
  ]);

  return getClientById(id);
}

/**
 * Get verified claims for a client
 */
export async function getVerifiedClaims(clientId, limit = 10) {
  const result = await query(`
    SELECT claim_text, claim_type
    FROM verified_claims
    WHERE client_id = $1
    AND verification_status = 'verified'
    ORDER BY confidence_score DESC
    LIMIT $2
  `, [clientId, limit]);

  return result.rows;
}

/**
 * Save ad copy
 */
export async function saveAdCopy(data) {
  const {
    id, campaign_id, client_id, user_id, channel, ad_type,
    primary_text, headline, description, cta, hook_angle,
    target_audience, offer_details, generation_prompt, model_used, tokens_used
  } = data;

  const now = new Date().toISOString();

  await query(`
    INSERT INTO ad_copy (
      id, campaign_id, client_id, user_id, channel, ad_type,
      primary_text, headline, description, cta, hook_angle,
      target_audience, offer_details, generation_prompt, model_used,
      tokens_used, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
  `, [
    id, campaign_id || null, client_id, user_id, channel || 'meta', ad_type,
    primary_text, headline, description, cta, hook_angle,
    target_audience, offer_details, generation_prompt, model_used, tokens_used, now
  ]);

  return { id, ...data };
}

/**
 * Save image prompt
 */
export async function saveImagePrompt(data) {
  const {
    id, campaign_id, client_id, user_id, ad_copy_id,
    prompt_text, negative_prompt, style_reference, aspect_ratio,
    image_type, model_target, generation_context
  } = data;

  const now = new Date().toISOString();

  await query(`
    INSERT INTO image_prompts (
      id, campaign_id, client_id, user_id, ad_copy_id,
      prompt_text, negative_prompt, style_reference, aspect_ratio,
      image_type, model_target, generation_context, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    id, campaign_id || null, client_id, user_id, ad_copy_id || null,
    prompt_text, negative_prompt, style_reference, aspect_ratio,
    image_type, model_target || 'nano_banana_2',
    typeof generation_context === 'object' ? JSON.stringify(generation_context) : generation_context,
    now
  ]);

  return { id, ...data };
}

export { getDatabase };
export default { query, raw, getClients, getClientById, createClient, updateClient, getVerifiedClaims, saveAdCopy, saveImagePrompt };
