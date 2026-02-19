import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initDatabase() {
  // ============================================
  // NEW TABLES FOR V2 PIPELINE
  // ============================================

  // Clients table - stores business research for reuse
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      website_url TEXT,
      industry TEXT,
      business_research JSONB,
      source_content JSONB,
      verified_facts JSONB,
      testimonials JSONB,
      research_status TEXT DEFAULT 'pending',
      last_researched_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Brand style guides - extracted brand styles per client
  await sql`
    CREATE TABLE IF NOT EXISTS brand_style_guides (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      primary_color TEXT,
      secondary_color TEXT,
      accent_color TEXT,
      background_color TEXT,
      text_color TEXT,
      heading_font TEXT,
      body_font TEXT,
      font_weights JSONB,
      font_sizes JSONB,
      border_radius TEXT,
      spacing_unit TEXT,
      max_width TEXT,
      button_style JSONB,
      card_style JSONB,
      brand_voice TEXT,
      tone_keywords JSONB,
      raw_css TEXT,
      screenshot_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Page templates - template library
  await sql`
    CREATE TABLE IF NOT EXISTS page_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      section_structure JSONB,
      html_skeleton TEXT,
      css_base TEXT,
      industries JSONB,
      conversion_goals JSONB,
      avg_conversion_rate DECIMAL,
      times_used INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Page generation jobs - track pipeline progress
  await sql`
    CREATE TABLE IF NOT EXISTS page_generation_jobs (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES clients(id),
      page_id TEXT,
      page_type TEXT NOT NULL,
      template_id TEXT REFERENCES page_templates(id),
      target_audience TEXT,
      offer_details TEXT,
      status TEXT DEFAULT 'pending',
      current_step TEXT,
      step_outputs JSONB,
      error_message TEXT,
      tokens_used INTEGER DEFAULT 0,
      estimated_cost DECIMAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    )
  `;

  // Verified claims - fact-checking database
  await sql`
    CREATE TABLE IF NOT EXISTS verified_claims (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      claim_text TEXT NOT NULL,
      claim_type TEXT,
      source_url TEXT,
      source_text TEXT,
      verification_status TEXT DEFAULT 'unverified',
      confidence_score DECIMAL,
      verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // ============================================
  // EXISTING TABLES (with new columns)
  // ============================================

  await sql`
    CREATE TABLE IF NOT EXISTS landing_pages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      client_name TEXT,
      client_id TEXT REFERENCES clients(id),
      template_id TEXT REFERENCES page_templates(id),
      job_id TEXT REFERENCES page_generation_jobs(id),
      generation_metadata JSONB,
      html_content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      deployed_at TIMESTAMP,
      custom_domain TEXT,
      meta_title TEXT,
      meta_description TEXT,
      tracking_pixel TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id),
      variant_id TEXT,
      email TEXT,
      name TEXT,
      phone TEXT,
      company TEXT,
      form_data JSONB,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_term TEXT,
      utm_content TEXT,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id),
      variant_id TEXT,
      session_id TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_term TEXT,
      utm_content TEXT,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      device_type TEXT,
      country TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS conversions (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id),
      variant_id TEXT,
      session_id TEXT,
      conversion_type TEXT NOT NULL,
      conversion_value DECIMAL,
      lead_id INTEGER REFERENCES leads(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS custom_domains (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
      domain TEXT UNIQUE NOT NULL,
      domain_type TEXT DEFAULT 'subdomain',
      ssl_status TEXT DEFAULT 'pending',
      dns_configured BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create indexes for existing tables
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_page_id ON leads(page_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_page_views_page_id ON page_views(page_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug)`;

  // Create indexes for new tables
  await sql`CREATE INDEX IF NOT EXISTS idx_clients_website_url ON clients(website_url)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_style_guides_client_id ON brand_style_guides(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_page_templates_type ON page_templates(type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_page_generation_jobs_client_id ON page_generation_jobs(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_page_generation_jobs_status ON page_generation_jobs(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_verified_claims_client_id ON verified_claims(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_landing_pages_client_id ON landing_pages(client_id)`;
}

export { sql };
