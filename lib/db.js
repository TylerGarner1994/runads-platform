// RunAds - Vercel Postgres Database (Production)
import { sql } from '@vercel/postgres';

let initialized = false;

export async function initProductionDb() {
  if (initialized) return;

  await sql`
    -- Landing Pages
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
    );

    -- Page Views
    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
      timestamp TIMESTAMP DEFAULT NOW(),
      utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
      utm_content TEXT, utm_term TEXT,
      referrer TEXT, device_type TEXT, user_agent TEXT,
      ip_hash TEXT, session_id TEXT
    );

    -- Leads
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
      form_data JSONB DEFAULT '{}',
      email TEXT, name TEXT, phone TEXT,
      utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
      utm_content TEXT, utm_term TEXT,
      referrer TEXT, device_type TEXT, ip_hash TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Conversions
    CREATE TABLE IF NOT EXISTS conversions (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
      event_type TEXT DEFAULT 'conversion',
      event_value NUMERIC,
      variant_id TEXT,
      utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
      metadata JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW()
    );

    -- A/B Variants
    CREATE TABLE IF NOT EXISTS ab_variants (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
      variant_name TEXT NOT NULL,
      html_content TEXT,
      weight INTEGER DEFAULT 50,
      views INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      is_control INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Custom Domains
    CREATE TABLE IF NOT EXISTS custom_domains (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
      domain TEXT UNIQUE NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      ssl_status TEXT DEFAULT 'pending',
      dns_record TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Clients
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
    );

    -- Brand Style Guides
    CREATE TABLE IF NOT EXISTS brand_style_guides (
      id SERIAL PRIMARY KEY,
      client_id TEXT UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
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
    );

    -- Verified Claims
    CREATE TABLE IF NOT EXISTS verified_claims (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      claim_text TEXT NOT NULL,
      source TEXT,
      category TEXT DEFAULT 'general',
      verified BOOLEAN DEFAULT FALSE,
      verified_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Testimonials
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      quote TEXT NOT NULL,
      author_name TEXT, author_role TEXT,
      author_company TEXT, author_image TEXT,
      rating INTEGER, result_metric TEXT, source_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL, description TEXT,
      price TEXT, url TEXT, image_url TEXT,
      features JSONB DEFAULT '[]',
      benefits JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Target Audiences
    CREATE TABLE IF NOT EXISTS target_audiences (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      demographics JSONB DEFAULT '{}',
      psychographics JSONB DEFAULT '{}',
      pain_points JSONB DEFAULT '[]',
      desires JSONB DEFAULT '[]',
      objections JSONB DEFAULT '[]',
      triggers JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Ad Copy
    CREATE TABLE IF NOT EXISTS ad_copy (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      ad_type TEXT DEFAULT 'single_image',
      hook_framework TEXT, tone TEXT DEFAULT 'conversational',
      headline TEXT, primary_text TEXT,
      description TEXT, cta_text TEXT,
      target_audience TEXT, offer_details TEXT,
      generation_params JSONB DEFAULT '{}',
      tokens_used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Image Prompts
    CREATE TABLE IF NOT EXISTS image_prompts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      awareness_level TEXT DEFAULT 'problem_aware',
      cognitive_biases JSONB DEFAULT '[]',
      ad_styles JSONB DEFAULT '[]',
      aspect_ratio TEXT DEFAULT '4:5',
      prompt_text TEXT, concept TEXT,
      generation_params JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Page Generation Jobs
    CREATE TABLE IF NOT EXISTS page_generation_jobs (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      page_type TEXT NOT NULL,
      template_type TEXT,
      input_data JSONB DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      result_html TEXT,
      expert_scores JSONB DEFAULT '{}',
      error TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      role TEXT DEFAULT 'marketer',
      avatar TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      last_login TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_pages_slug ON landing_pages(slug);
    CREATE INDEX IF NOT EXISTS idx_pages_client ON landing_pages(client_id);
    CREATE INDEX IF NOT EXISTS idx_views_page ON page_views(page_id);
    CREATE INDEX IF NOT EXISTS idx_views_ts ON page_views(timestamp);
    CREATE INDEX IF NOT EXISTS idx_leads_page ON leads(page_id);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
  `;

  initialized = true;
  console.log('Postgres database initialized');
}

export { sql };
