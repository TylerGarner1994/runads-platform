import { sql } from '@vercel/postgres';

/**
 * Migration v2 - Align database schema with generation pipeline requirements
 * Run this once via: POST /api/migrate-v2
 *
 * Changes:
 * 1. clients table: Add business_research, source_content, website_url, last_researched_at columns
 * 2. brand_style_guides: Add font_weights, font_sizes, card_style, brand_voice, tone_keywords, raw_css, created_at; change id to TEXT
 * 3. verified_claims: Add claim_type, source_url, source_text, verification_status, confidence_score, verified_at; change id to TEXT
 * 4. page_generation_jobs: Add step_outputs, template_id, target_audience, offer_details, page_id, estimated_cost, error_message
 * 5. landing_pages: Add job_id, template_id, generation_metadata
 * 6. page_templates: Create table if not exists
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const results = [];
  const errors = [];

  async function runMigration(description, query) {
    try {
      await query;
      results.push(`✅ ${description}`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        results.push(`⏭️ ${description} (already exists)`);
      } else {
        errors.push(`❌ ${description}: ${err.message}`);
      }
    }
  }

  // ============================================================
  // 1. CLIENTS TABLE - Add missing columns
  // ============================================================
  await runMigration('Add clients.website_url', sql`
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_url TEXT
  `);
  await runMigration('Add clients.business_research', sql`
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_research JSONB DEFAULT '{}'
  `);
  await runMigration('Add clients.source_content', sql`
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS source_content JSONB DEFAULT '{}'
  `);
  await runMigration('Add clients.last_researched_at', sql`
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_researched_at TIMESTAMP
  `);

  // Copy existing website values to website_url if they exist
  await runMigration('Sync clients.website to website_url', sql`
    UPDATE clients SET website_url = website WHERE website_url IS NULL AND website IS NOT NULL
  `);

  // ============================================================
  // 2. BRAND_STYLE_GUIDES TABLE - Add missing columns
  // ============================================================
  await runMigration('Add brand_style_guides.font_weights', sql`
    ALTER TABLE brand_style_guides ADD COLUMN IF NOT EXISTS font_weights JSONB DEFAULT '{}'
  `);
  await runMigration('Add brand_style_guides.font_sizes', sql`
    ALTER TABLE brand_style_guides ADD COLUMN IF NOT EXISTS font_sizes JSONB DEFAULT '{}'
  `);
  await runMigration('Add brand_style_guides.card_style', sql`
    ALTER TABLE brand_style_guides ADD COLUMN IF NOT EXISTS card_style JSONB DEFAULT '{}'
  `);
  await runMigration('Add brand_style_guides.brand_voice', sql`
    ALTER TABLE brand_style_guides ADD COLUMN IF NOT EXISTS brand_voice TEXT
  `);
  await runMigration('Add brand_style_guides.tone_keywords', sql`
    ALTER TABLE brand_style_guides ADD COLUMN IF NOT EXISTS tone_keywords JSONB DEFAULT '[]'
  `);
  await runMigration('Add brand_style_guides.raw_css', sql`
    ALTER TABLE brand_style_guides ADD COLUMN IF NOT EXISTS raw_css TEXT
  `);
  await runMigration('Add brand_style_guides.created_at', sql`
    ALTER TABLE brand_style_guides ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
  `);

  // ============================================================
  // 3. VERIFIED_CLAIMS TABLE - Add missing columns
  // ============================================================
  await runMigration('Add verified_claims.claim_type', sql`
    ALTER TABLE verified_claims ADD COLUMN IF NOT EXISTS claim_type TEXT DEFAULT 'general'
  `);
  await runMigration('Add verified_claims.source_url', sql`
    ALTER TABLE verified_claims ADD COLUMN IF NOT EXISTS source_url TEXT
  `);
  await runMigration('Add verified_claims.source_text', sql`
    ALTER TABLE verified_claims ADD COLUMN IF NOT EXISTS source_text TEXT
  `);
  await runMigration('Add verified_claims.verification_status', sql`
    ALTER TABLE verified_claims ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'
  `);
  await runMigration('Add verified_claims.confidence_score', sql`
    ALTER TABLE verified_claims ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0.5
  `);
  await runMigration('Add verified_claims.verified_at', sql`
    ALTER TABLE verified_claims ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
  `);

  // ============================================================
  // 4. PAGE_GENERATION_JOBS TABLE - Add missing columns
  // ============================================================
  await runMigration('Add page_generation_jobs.step_outputs', sql`
    ALTER TABLE page_generation_jobs ADD COLUMN IF NOT EXISTS step_outputs JSONB DEFAULT '{}'
  `);
  await runMigration('Add page_generation_jobs.template_id', sql`
    ALTER TABLE page_generation_jobs ADD COLUMN IF NOT EXISTS template_id TEXT
  `);
  await runMigration('Add page_generation_jobs.target_audience', sql`
    ALTER TABLE page_generation_jobs ADD COLUMN IF NOT EXISTS target_audience TEXT
  `);
  await runMigration('Add page_generation_jobs.offer_details', sql`
    ALTER TABLE page_generation_jobs ADD COLUMN IF NOT EXISTS offer_details TEXT
  `);
  await runMigration('Add page_generation_jobs.page_id', sql`
    ALTER TABLE page_generation_jobs ADD COLUMN IF NOT EXISTS page_id TEXT
  `);
  await runMigration('Add page_generation_jobs.estimated_cost', sql`
    ALTER TABLE page_generation_jobs ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC DEFAULT 0
  `);
  await runMigration('Add page_generation_jobs.error_message', sql`
    ALTER TABLE page_generation_jobs ADD COLUMN IF NOT EXISTS error_message TEXT
  `);

  // ============================================================
  // 5. LANDING_PAGES TABLE - Add missing columns
  // ============================================================
  await runMigration('Add landing_pages.job_id', sql`
    ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS job_id TEXT
  `);
  await runMigration('Add landing_pages.template_id', sql`
    ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS template_id TEXT
  `);
  await runMigration('Add landing_pages.generation_metadata', sql`
    ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'
  `);

  // ============================================================
  // 6. PAGE_TEMPLATES TABLE - Create if not exists
  // ============================================================
  await runMigration('Create page_templates table', sql`
    CREATE TABLE IF NOT EXISTS page_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      page_type TEXT NOT NULL,
      thumbnail_url TEXT,
      html_skeleton TEXT,
      css_base TEXT,
      section_structure JSONB DEFAULT '[]',
      variables JSONB DEFAULT '{}',
      is_premium BOOLEAN DEFAULT FALSE,
      times_used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ============================================================
  // 7. PAGE_TEMPLATES TABLE - Add missing columns for seed/recommend
  // ============================================================
  await runMigration('Add page_templates.type', sql`
    ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS type TEXT
  `);
  await runMigration('Add page_templates.industries', sql`
    ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS industries JSONB DEFAULT '[]'
  `);
  await runMigration('Add page_templates.conversion_goals', sql`
    ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS conversion_goals JSONB DEFAULT '[]'
  `);
  await runMigration('Add page_templates.is_active', sql`
    ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
  `);
  await runMigration('Add page_templates.avg_conversion_rate', sql`
    ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS avg_conversion_rate NUMERIC
  `);
  await runMigration('Drop NOT NULL on page_templates.page_type', sql`
    ALTER TABLE page_templates ALTER COLUMN page_type DROP NOT NULL
  `);

  // ============================================================
  // 8. CONVERSIONS TABLE - Create if not exists
  // ============================================================
  await runMigration('Create conversions table', sql`
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
  `);

  await runMigration('Create idx_conversions_page_id', sql`
    CREATE INDEX IF NOT EXISTS idx_conversions_page_id ON conversions(page_id)
  `);

  // ============================================================
  // 9. CUSTOM_DOMAINS TABLE - Create if not exists
  // ============================================================
  await runMigration('Create custom_domains table', sql`
    CREATE TABLE IF NOT EXISTS custom_domains (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
      domain TEXT UNIQUE NOT NULL,
      domain_type TEXT DEFAULT 'subdomain',
      ssl_status TEXT DEFAULT 'pending',
      dns_configured BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runMigration('Create idx_custom_domains_page_id', sql`
    CREATE INDEX IF NOT EXISTS idx_custom_domains_page_id ON custom_domains(page_id)
  `);

  // ============================================================
  // 10. LEADS TABLE - Add missing columns for UTM tracking
  // ============================================================
  await runMigration('Add leads.variant_id', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS variant_id TEXT
  `);
  await runMigration('Add leads.phone', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT
  `);
  await runMigration('Add leads.company', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT
  `);
  await runMigration('Add leads.form_data', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS form_data JSONB
  `);
  await runMigration('Add leads.utm_source', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source TEXT
  `);
  await runMigration('Add leads.utm_medium', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium TEXT
  `);
  await runMigration('Add leads.utm_campaign', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT
  `);
  await runMigration('Add leads.utm_term', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term TEXT
  `);
  await runMigration('Add leads.utm_content', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT
  `);
  await runMigration('Add leads.ip_address', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS ip_address TEXT
  `);
  await runMigration('Add leads.user_agent', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_agent TEXT
  `);
  await runMigration('Add leads.referrer', sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer TEXT
  `);

  // ============================================================
  // 11. PAGE_VIEWS TABLE - Add missing columns
  // ============================================================
  await runMigration('Add page_views.variant_id', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS variant_id TEXT
  `);
  await runMigration('Add page_views.session_id', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS session_id TEXT
  `);
  await runMigration('Add page_views.utm_source', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_source TEXT
  `);
  await runMigration('Add page_views.utm_medium', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_medium TEXT
  `);
  await runMigration('Add page_views.utm_campaign', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_campaign TEXT
  `);
  await runMigration('Add page_views.utm_term', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_term TEXT
  `);
  await runMigration('Add page_views.utm_content', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_content TEXT
  `);
  await runMigration('Add page_views.device_type', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS device_type TEXT
  `);
  await runMigration('Add page_views.country', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS country TEXT
  `);
  await runMigration('Add page_views.created_at (alias for timestamp)', sql`
    ALTER TABLE page_views ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  // Backfill created_at from timestamp for existing rows
  await runMigration('Backfill page_views.created_at from timestamp', sql`
    UPDATE page_views SET created_at = timestamp WHERE created_at IS NULL AND timestamp IS NOT NULL
  `);

  // ============================================================
  // 12. LANDING_PAGES - Add client_id column
  // ============================================================
  await runMigration('Add landing_pages.client_id', sql`
    ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS client_id TEXT
  `);

  return res.status(200).json({
    success: errors.length === 0,
    message: `Migration complete. ${results.length} operations run, ${errors.length} errors.`,
    results,
    errors
  });
}
