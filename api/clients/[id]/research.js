// RunAds - Client Research Engine (Powered by Perplexity Sonar)
// 3-query deep research: Brand & Product → Reviews & Sentiment → Competitor & Market
// Auto-populates: business_research, verified_claims, brand_style_guides
//
// Perplexity advantages over basic scraping:
// - Searches the entire web, not just the client's website
// - Returns real customer reviews from third-party sites
// - Provides competitor intelligence
// - Every fact comes with citation URLs
// - Finds market/industry data for authoritative copy

export const config = { maxDuration: 300 };

import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

// ─── Call Perplexity Sonar API ───
async function callPerplexity(systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not configured');

  const body = {
    model: options.model || 'sonar-pro',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.2,
    search_mode: 'web',
    web_search_options: {
      search_context_size: options.searchDepth || 'high'
    },
    return_related_questions: false,
    ...(options.domainFilter ? { search_domain_filter: options.domainFilter } : {}),
    ...(options.recencyFilter ? { search_recency_filter: options.recencyFilter } : {})
  };

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Perplexity API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    citations: data.citations || [],
    searchResults: data.search_results || [],
    usage: data.usage || {}
  };
}

// ─── Parse JSON from AI response ───
function parseJSON(text) {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // Try extracting JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch (e2) {}
    }
    // Try finding JSON object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch (e3) {}
    }
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'Client ID is required' });

  try {
    const clientResult = await sql`SELECT * FROM clients WHERE id = ${id}`;
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const client = clientResult.rows[0];
    if (!client.website_url) {
      return res.status(400).json({ success: false, error: 'Client has no website URL configured' });
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      return res.status(500).json({ success: false, error: 'PERPLEXITY_API_KEY not configured' });
    }

    let url = client.website_url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

    // Extract domain for searches
    const domain = new URL(url).hostname.replace('www.', '');
    const now = new Date().toISOString();

    // Mark research as in_progress
    await sql`UPDATE clients SET research_status = 'in_progress', updated_at = ${now} WHERE id = ${id}`;

    console.log(`[Research] Starting 3-query research for ${client.name} (${domain})`);

    // ════════════════════════════════════════════
    // QUERY 1: Brand & Product Deep Dive
    // ════════════════════════════════════════════
    console.log('[Research] Query 1: Brand & Product...');
    const brandResult = await callPerplexity(
      `You are a brand strategist and market researcher. Return ONLY valid JSON.`,
      `Research the company at ${url} and provide a comprehensive brand and product analysis.

Search their website and any external sources. Return a JSON object:
{
  "company_name": "string",
  "industry": "string (e.g., health & wellness, beauty, finance, tech, ecommerce)",
  "tagline": "string or null",
  "description": "2-3 sentence company description",
  "founded": "year or null",
  "location": "city/country or null",
  "value_propositions": ["list of 3-5 key value props"],
  "unique_differentiators": ["what sets them apart from competitors"],
  "products": [
    {
      "name": "string",
      "description": "string",
      "price": "string or null",
      "key_features": ["list"],
      "benefits": ["list of customer benefits"]
    }
  ],
  "target_audiences": [
    {
      "segment": "e.g., Health-conscious women 30-55",
      "pain_points": ["specific problems they face"],
      "desires": ["what they want to achieve"],
      "objections": ["reasons they might not buy"]
    }
  ],
  "brand_voice": "description of their writing style, tone, personality",
  "brand_colors": ["hex codes if visible on their site"],
  "brand_fonts": ["font names if identifiable"],
  "trust_signals": ["awards, certifications, media mentions, years in business, etc."],
  "social_proof_summary": "brief summary of their social proof strategy"
}`,
      { maxTokens: 4096 }
    );

    const brandData = parseJSON(brandResult.text) || {};
    const brandCitations = brandResult.citations;

    // ════════════════════════════════════════════
    // QUERY 2: Customer Reviews & Sentiment
    // ════════════════════════════════════════════
    console.log('[Research] Query 2: Reviews & Sentiment...');
    const reviewResult = await callPerplexity(
      `You are a customer research analyst. Search review sites, forums, and social media for real customer feedback. Return ONLY valid JSON.`,
      `Find real customer reviews, testimonials, and feedback for "${brandData.company_name || client.name}" (${domain}).

Search Google Reviews, Trustpilot, ProductReview.com.au, Reddit, Facebook, and any other review sources.

Return a JSON object:
{
  "overall_sentiment": "positive/mixed/negative",
  "average_rating": "e.g., 4.5/5 or null if not found",
  "review_count": "approximate total reviews found or null",
  "testimonials": [
    {
      "quote": "exact or close-to-exact customer quote",
      "author": "name or 'Anonymous'",
      "source": "where you found it (e.g., Google Reviews, Trustpilot)",
      "source_url": "URL",
      "rating": "star rating if available",
      "date": "approximate date if available"
    }
  ],
  "common_praises": ["things customers consistently love"],
  "common_complaints": ["things customers consistently dislike"],
  "emotional_language": ["powerful words/phrases customers use naturally"],
  "before_after_stories": ["any transformation stories from customers"],
  "statistics": [
    {
      "claim": "the statistic or data point",
      "context": "what it refers to",
      "source": "where it came from",
      "source_url": "URL"
    }
  ]
}`,
      {
        maxTokens: 4096,
        domainFilter: [`-${domain}`] // Exclude client's own site to get external reviews
      }
    );

    const reviewData = parseJSON(reviewResult.text) || {};
    const reviewCitations = reviewResult.citations;

    // ════════════════════════════════════════════
    // QUERY 3: Competitor & Market Intelligence
    // ════════════════════════════════════════════
    console.log('[Research] Query 3: Competitor & Market...');
    const competitorResult = await callPerplexity(
      `You are a competitive intelligence analyst. Return ONLY valid JSON.`,
      `Analyze the competitive landscape for "${brandData.company_name || client.name}" in the ${brandData.industry || client.industry || 'unknown'} industry.

Their website: ${url}
Their products: ${brandData.products?.map(p => p.name).join(', ') || 'unknown'}

Return a JSON object:
{
  "market_overview": "2-3 sentence overview of the market/industry",
  "market_size": "estimated market size if available",
  "market_trends": ["3-5 current trends in this space"],
  "competitors": [
    {
      "name": "competitor name",
      "website": "URL",
      "positioning": "how they position themselves",
      "strengths": ["what they do well"],
      "weaknesses": ["where they fall short"],
      "price_range": "pricing if known"
    }
  ],
  "competitive_advantages": ["where ${brandData.company_name || client.name} wins vs competitors"],
  "competitive_gaps": ["where competitors might be stronger"],
  "positioning_opportunities": ["untapped angles they could own"],
  "industry_statistics": [
    {
      "claim": "the statistic",
      "context": "relevance",
      "source_url": "URL"
    }
  ],
  "customer_acquisition_channels": ["how companies in this space typically acquire customers"],
  "regulatory_or_compliance": ["any relevant regulations or certifications in this industry"]
}`,
      {
        maxTokens: 4096,
        domainFilter: [`-${domain}`] // Exclude client's own site
      }
    );

    const competitorData = parseJSON(competitorResult.text) || {};
    const competitorCitations = competitorResult.citations;

    // ════════════════════════════════════════════
    // COMBINE & STORE RESULTS
    // ════════════════════════════════════════════
    console.log('[Research] Combining results...');

    const businessResearch = {
      // Brand & Product
      company_name: brandData.company_name || client.name,
      industry: brandData.industry || client.industry,
      tagline: brandData.tagline,
      description: brandData.description,
      founded: brandData.founded,
      location: brandData.location,
      value_propositions: brandData.value_propositions || [],
      unique_differentiators: brandData.unique_differentiators || [],
      products: brandData.products || [],
      target_audiences: brandData.target_audiences || [],
      brand_voice: brandData.brand_voice,
      brand_colors: brandData.brand_colors || [],
      brand_fonts: brandData.brand_fonts || [],
      trust_signals: brandData.trust_signals || [],
      social_proof_summary: brandData.social_proof_summary,

      // Reviews & Sentiment
      overall_sentiment: reviewData.overall_sentiment,
      average_rating: reviewData.average_rating,
      review_count: reviewData.review_count,
      testimonials: reviewData.testimonials || [],
      common_praises: reviewData.common_praises || [],
      common_complaints: reviewData.common_complaints || [],
      emotional_language: reviewData.emotional_language || [],
      before_after_stories: reviewData.before_after_stories || [],
      statistics: [
        ...(reviewData.statistics || []),
        ...(competitorData.industry_statistics || [])
      ],

      // Competitor & Market
      market_overview: competitorData.market_overview,
      market_size: competitorData.market_size,
      market_trends: competitorData.market_trends || [],
      competitors: competitorData.competitors || [],
      competitive_advantages: competitorData.competitive_advantages || [],
      competitive_gaps: competitorData.competitive_gaps || [],
      positioning_opportunities: competitorData.positioning_opportunities || [],
      customer_acquisition_channels: competitorData.customer_acquisition_channels || [],
      regulatory_or_compliance: competitorData.regulatory_or_compliance || [],

      // Citations (all sources)
      citations: [...new Set([...brandCitations, ...reviewCitations, ...competitorCitations])],

      // Meta
      researched_at: now,
      research_version: '2.0-perplexity',
      queries_used: 3,
      total_tokens: (brandResult.usage.total_tokens || 0) +
                    (reviewResult.usage.total_tokens || 0) +
                    (competitorResult.usage.total_tokens || 0)
    };

    // ─── Save research to client ───
    await sql`
      UPDATE clients
      SET
        business_research = ${JSON.stringify(businessResearch)}::jsonb,
        industry = COALESCE(${businessResearch.industry || null}, industry),
        research_status = 'completed',
        last_researched_at = ${now},
        updated_at = ${now}
      WHERE id = ${id}
    `;

    // ─── Save verified claims (testimonials) ───
    let claimsCreated = 0;
    if (businessResearch.testimonials?.length > 0) {
      for (const t of businessResearch.testimonials) {
        if (!t.quote) continue;
        const claimId = uuidv4();
        try {
          await sql`
            INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
            VALUES (
              ${claimId}, ${id},
              ${t.quote},
              'testimonial',
              ${t.source_url || t.source || url},
              ${JSON.stringify(t)},
              'verified',
              ${t.source_url ? 0.95 : 0.8},
              ${now}, ${now}
            )
            ON CONFLICT DO NOTHING
          `;
          claimsCreated++;
        } catch (e) { console.warn('Failed to insert testimonial:', e.message); }
      }
    }

    // ─── Save verified claims (statistics) ───
    if (businessResearch.statistics?.length > 0) {
      for (const s of businessResearch.statistics) {
        if (!s.claim) continue;
        const claimId = uuidv4();
        try {
          await sql`
            INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
            VALUES (
              ${claimId}, ${id},
              ${s.claim},
              'statistic',
              ${s.source_url || s.source || url},
              ${JSON.stringify(s)},
              'verified',
              ${s.source_url ? 0.9 : 0.7},
              ${now}, ${now}
            )
            ON CONFLICT DO NOTHING
          `;
          claimsCreated++;
        } catch (e) { console.warn('Failed to insert statistic:', e.message); }
      }
    }

    // ─── Auto-populate brand guide ───
    let brandGuideCreated = false;
    try {
      const existingBrand = await sql`SELECT id FROM brand_style_guides WHERE client_id = ${id}`;

      // Extract brand data from research
      const primaryColor = brandData.brand_colors?.[0] || null;
      const secondaryColor = brandData.brand_colors?.[1] || null;
      const accentColor = brandData.brand_colors?.[2] || null;
      const headingFont = brandData.brand_fonts?.[0] || null;
      const bodyFont = brandData.brand_fonts?.[1] || brandData.brand_fonts?.[0] || null;

      if (existingBrand.rows.length === 0) {
        // Create new brand guide from research
        const brandGuideId = uuidv4();
        await sql`
          INSERT INTO brand_style_guides (
            id, client_id, primary_color, secondary_color, accent_color,
            background_color, text_color, heading_font, body_font,
            brand_voice, tone_keywords, created_at, updated_at
          )
          VALUES (
            ${brandGuideId}, ${id},
            ${primaryColor}, ${secondaryColor}, ${accentColor},
            '#ffffff', '#1f2937',
            ${headingFont}, ${bodyFont},
            ${brandData.brand_voice || null},
            ${JSON.stringify(brandData.value_propositions?.slice(0, 5) || [])}::jsonb,
            ${now}, ${now}
          )
        `;
        brandGuideCreated = true;
      } else {
        // Update existing brand guide with any new data (only fill NULLs)
        await sql`
          UPDATE brand_style_guides
          SET
            primary_color = COALESCE(primary_color, ${primaryColor}),
            secondary_color = COALESCE(secondary_color, ${secondaryColor}),
            accent_color = COALESCE(accent_color, ${accentColor}),
            heading_font = COALESCE(heading_font, ${headingFont}),
            body_font = COALESCE(body_font, ${bodyFont}),
            brand_voice = COALESCE(brand_voice, ${brandData.brand_voice || null}),
            updated_at = ${now}
          WHERE client_id = ${id}
        `;
      }
    } catch (brandErr) {
      console.warn('Failed to auto-populate brand guide:', brandErr.message);
    }

    console.log(`[Research] Complete! ${claimsCreated} claims, brand guide: ${brandGuideCreated ? 'created' : 'updated'}`);

    return res.status(200).json({
      success: true,
      message: 'Research completed',
      business_research: businessResearch,
      claims_created: claimsCreated,
      brand_guide_created: brandGuideCreated,
      citations: businessResearch.citations.length,
      tokens_used: businessResearch.total_tokens
    });

  } catch (error) {
    console.error('Research API error:', error);
    // Mark research as failed
    try {
      await sql`UPDATE clients SET research_status = 'failed', updated_at = ${new Date().toISOString()} WHERE id = ${id}`;
    } catch (e) { /* ignore */ }
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
