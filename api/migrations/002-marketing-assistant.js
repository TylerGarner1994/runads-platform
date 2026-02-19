import { sql } from '@vercel/postgres';

/**
 * Migration: Add AI Marketing Assistant tables
 * Run this once on production to add new tables for ads, campaigns, etc.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'marketer',
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // User sessions
    await sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        refresh_token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Campaigns
    await sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL,
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        objective TEXT,
        channel TEXT DEFAULT 'meta',
        target_audience TEXT,
        budget TEXT,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Ad copy
    await sql`
      CREATE TABLE IF NOT EXISTS ad_copy (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID,
        client_id TEXT NOT NULL,
        user_id UUID NOT NULL,
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
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Image prompts
    await sql`
      CREATE TABLE IF NOT EXISTS image_prompts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID,
        client_id TEXT NOT NULL,
        user_id UUID NOT NULL,
        ad_copy_id UUID,
        prompt_text TEXT NOT NULL,
        negative_prompt TEXT,
        style_reference TEXT,
        aspect_ratio TEXT DEFAULT '1:1',
        image_type TEXT,
        model_target TEXT DEFAULT 'nano_banana_2',
        generation_context JSONB,
        rating INTEGER,
        feedback TEXT,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Ad performance
    await sql`
      CREATE TABLE IF NOT EXISTS ad_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ad_copy_id UUID,
        campaign_id UUID,
        external_ad_id TEXT,
        channel TEXT DEFAULT 'meta',
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(10,2) DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        ctr DECIMAL(5,4),
        cpc DECIMAL(10,2),
        cpm DECIMAL(10,2),
        roas DECIMAL(10,2),
        date_range_start DATE,
        date_range_end DATE,
        raw_data JSONB,
        synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Swipe files
    await sql`
      CREATE TABLE IF NOT EXISTS swipe_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        client_id TEXT,
        title TEXT NOT NULL,
        channel TEXT,
        ad_type TEXT,
        primary_text TEXT,
        headline TEXT,
        description TEXT,
        image_description TEXT,
        image_url TEXT,
        landing_page_url TEXT,
        why_it_works TEXT,
        hooks_used JSONB,
        tags JSONB,
        source TEXT,
        performance_notes TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ad_copy_client_id ON ad_copy(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ad_copy_campaign_id ON ad_copy(campaign_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ad_copy_user_id ON ad_copy(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_image_prompts_client_id ON image_prompts(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_image_prompts_ad_copy_id ON image_prompts(ad_copy_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ad_performance_ad_copy_id ON ad_performance(ad_copy_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_swipe_files_user_id ON swipe_files(user_id)`;

    return res.status(200).json({
      success: true,
      message: 'Migration completed: AI Marketing Assistant tables created'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
