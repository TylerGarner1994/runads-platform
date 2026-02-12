// RunAds - SQLite Database (Development)
// Production uses Vercel Postgres via lib/db.js

let db = null;

export function getDatabase() {
  if (db) return db;

  try {
    const Database = (await import('better-sqlite3')).default;
    db = new Database('runads.db');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
    return db;
  } catch (err) {
    console.error('SQLite not available:', err.message);
    return null;
  }
}

// Lazy async initialization
let dbPromise = null;
export async function initDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    try {
      const { default: Database } = await import('better-sqlite3');
      db = new Database('runads.db');
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      initializeSchema(db);
      console.log('SQLite database initialized');
      return db;
    } catch (err) {
      console.error('SQLite not available:', err.message);
      return null;
    }
  })();
  return dbPromise;
}

function initializeSchema(db) {
  db.exec(`
    -- ============================================================
    -- CORE: Landing Pages
    -- ============================================================
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deployed_at DATETIME,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pages_slug ON landing_pages(slug);
    CREATE INDEX IF NOT EXISTS idx_pages_client ON landing_pages(client_id);
    CREATE INDEX IF NOT EXISTS idx_pages_status ON landing_pages(status);

    -- ============================================================
    -- ANALYTICS: Page Views
    -- ============================================================
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      referrer TEXT,
      device_type TEXT,
      user_agent TEXT,
      ip_hash TEXT,
      session_id TEXT,
      FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_views_page ON page_views(page_id);
    CREATE INDEX IF NOT EXISTS idx_views_timestamp ON page_views(timestamp);

    -- ============================================================
    -- LEADS: Form Submissions
    -- ============================================================
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL,
      form_data TEXT DEFAULT '{}',
      email TEXT,
      name TEXT,
      phone TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      referrer TEXT,
      device_type TEXT,
      ip_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_leads_page ON leads(page_id);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

    -- ============================================================
    -- CONVERSIONS: Event Tracking
    -- ============================================================
    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL,
      event_type TEXT DEFAULT 'conversion',
      event_value REAL,
      variant_id TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      metadata TEXT DEFAULT '{}',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_conversions_page ON conversions(page_id);

    -- ============================================================
    -- A/B TESTING: Variants
    -- ============================================================
    CREATE TABLE IF NOT EXISTS ab_variants (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      html_content TEXT,
      weight INTEGER DEFAULT 50,
      views INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      is_control INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- CUSTOM DOMAINS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS custom_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL,
      domain TEXT UNIQUE NOT NULL,
      verified INTEGER DEFAULT 0,
      ssl_status TEXT DEFAULT 'pending',
      dns_record TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- CLIENTS: Brand Management
    -- ============================================================
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT,
      industry TEXT,
      tagline TEXT,
      brand_voice TEXT,
      description TEXT,
      research_status TEXT DEFAULT 'pending',
      research_data TEXT DEFAULT '{}',
      last_researched DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

    -- ============================================================
    -- BRAND STYLE GUIDES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS brand_style_guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      button_style TEXT DEFAULT '{}',
      custom_css TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- VERIFIED CLAIMS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS verified_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      claim_text TEXT NOT NULL,
      source TEXT,
      category TEXT DEFAULT 'general',
      verified INTEGER DEFAULT 0,
      verified_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TESTIMONIALS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      quote TEXT NOT NULL,
      author_name TEXT,
      author_role TEXT,
      author_company TEXT,
      author_image TEXT,
      rating INTEGER,
      result_metric TEXT,
      source_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- PRODUCTS / SERVICES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price TEXT,
      url TEXT,
      image_url TEXT,
      features TEXT DEFAULT '[]',
      benefits TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- TARGET AUDIENCES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS target_audiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      demographics TEXT DEFAULT '{}',
      psychographics TEXT DEFAULT '{}',
      pain_points TEXT DEFAULT '[]',
      desires TEXT DEFAULT '[]',
      objections TEXT DEFAULT '[]',
      triggers TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- AD CAMPAIGNS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      platform TEXT DEFAULT 'meta',
      status TEXT DEFAULT 'draft',
      budget REAL,
      start_date DATETIME,
      end_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- AD COPY
    -- ============================================================
    CREATE TABLE IF NOT EXISTS ad_copy (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      client_id TEXT NOT NULL,
      ad_type TEXT DEFAULT 'single_image',
      hook_framework TEXT,
      tone TEXT DEFAULT 'conversational',
      headline TEXT,
      primary_text TEXT,
      description TEXT,
      cta_text TEXT,
      target_audience TEXT,
      offer_details TEXT,
      generation_params TEXT DEFAULT '{}',
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- IMAGE PROMPTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS image_prompts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      client_id TEXT NOT NULL,
      awareness_level TEXT DEFAULT 'problem_aware',
      cognitive_biases TEXT DEFAULT '[]',
      ad_styles TEXT DEFAULT '[]',
      aspect_ratio TEXT DEFAULT '4:5',
      prompt_text TEXT,
      concept TEXT,
      generation_params TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- PAGE GENERATION JOBS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS page_generation_jobs (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      page_type TEXT NOT NULL,
      template_type TEXT,
      input_data TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      result_html TEXT,
      expert_scores TEXT DEFAULT '{}',
      error TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    -- ============================================================
    -- USERS & AUTH
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      role TEXT DEFAULT 'marketer',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- SWIPE FILES (saved inspiration)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS swipe_files (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      content TEXT,
      source_url TEXT,
      screenshot_url TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export default { initDatabase, getDatabase };
            
