// RunAds - Postgres Database Helper
// Wraps @vercel/postgres with initialization, query helpers, and GitHub fallback

let sql;
let initialized = false;
let pgAvailable = false;

async function initDb() {
  if (initialized) return pgAvailable;

  try {
    const pg = await import('@vercel/postgres');
    sql = pg.sql;

    // Create all tables
    await sql`
      CREATE TABLE IF NOT EXISTS landing_pages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        html_content TEXT,
        client_id TEXT,
        client_name TEXT DEFAULT '',
        status TEXT DEFAULT 'draft',
        page_type TEXT DEFAULT 'custom',
        template_type TEXT,
        views INTEGER DEFAULT 0,
        leads INTEGER DEFAULT 0,
        github_path TEXT,
        custom_domain TEXT,
        meta_title TEXT,
        meta_description TEXT,
        og_image TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deployed_at TIMESTAMP
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        page_id TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
        utm_content TEXT, utm_term TEXT,
        referrer TEXT, device_type TEXT, user_agent TEXT,
        ip_hash TEXT, session_id TEXT
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        page_id TEXT NOT NULL,
        form_data JSONB DEFAULT '{}',
        email TEXT, name TEXT, phone TEXT,
        utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
        utm_content TEXT, utm_term TEXT,
        referrer TEXT, device_type TEXT, ip_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        website TEXT,
        industry TEXT,
        tagline TEXT,
        brand_voice TEXT,
        description TEXT,
        research_status TEXT DEFAULT 'pending',
        research_data JSONB DEFAULT '{}',
        last_researched TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS brand_style_guides (
        id SERIAL PRIMARY KEY,
        client_id TEXT UNIQUE NOT NULL,
        primary_color TEXT DEFAULT '#2563eb',
        secondary_color TEXT DEFAULT '#1e40af',
        accent_color TEXT DEFAULT '#f59e0b',
        background_color TEXT DEFAULT '#ffffff',
        text_color TEXT DEFAULT '#111827',
        heading_font TEXT DEFAULT 'Inter',
        body_font TEXT DEFAULT 'Inter',
        border_radius TEXT DEFAULT '8px',
        spacing_unit TEXT DEFAULT '16px',
        max_width TEXT DEFAULT '1200px',
        button_style JSONB DEFAULT '{}',
        custom_css TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS verified_claims (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        claim_text TEXT NOT NULL,
        source TEXT,
        category TEXT DEFAULT 'general',
        verified BOOLEAN DEFAULT FALSE,
        verified_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        quote TEXT NOT NULL,
        author_name TEXT, author_role TEXT,
        author_company TEXT, author_image TEXT,
        rating INTEGER, result_metric TEXT, source_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL, description TEXT,
        price TEXT, url TEXT, image_url TEXT,
        features JSONB DEFAULT '[]',
        benefits JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS target_audiences (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL,
        demographics JSONB DEFAULT '{}',
        psychographics JSONB DEFAULT '{}',
        pain_points JSONB DEFAULT '[]',
        desires JSONB DEFAULT '[]',
        objections JSONB DEFAULT '[]',
        triggers JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS page_generation_jobs (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        page_type TEXT NOT NULL,
        current_step TEXT DEFAULT 'pending',
        status TEXT DEFAULT 'pending',
        input_data JSONB DEFAULT '{}',
        research_data JSONB DEFAULT '{}',
        brand_data JSONB DEFAULT '{}',
        strategy_data JSONB DEFAULT '{}',
        copy_data JSONB DEFAULT '{}',
        design_data JSONB DEFAULT '{}',
        factcheck_data JSONB DEFAULT '{}',
        assembly_data JSONB DEFAULT '{}',
        result_html TEXT,
        result_page_id TEXT,
        expert_scores JSONB DEFAULT '{}',
        error TEXT,
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )`;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_slug ON landing_pages(slug)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_client ON landing_pages(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_views_page ON page_views(page_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_views_ts ON page_views(timestamp)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_page ON leads(page_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jobs_status ON page_generation_jobs(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jobs_client ON page_generation_jobs(client_id)`;

    pgAvailable = true;
    console.log('Postgres database initialized successfully');
  } catch (err) {
    console.warn('Postgres not available, falling back to GitHub storage:', err.message);
    pgAvailable = false;
  }

  initialized = true;
  return pgAvailable;
}

// Query helper with error handling
async function pgQuery(query) {
  if (!pgAvailable) throw new Error('Postgres not available');
  return query;
}

// Check if Postgres is available
function isPgAvailable() {
  return pgAvailable;
}

// Get the sql tagged template
function getSql() {
  return sql;
}

export { initDb, pgQuery, isPgAvailable, getSql };
