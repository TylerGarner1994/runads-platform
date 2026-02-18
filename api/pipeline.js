// RunAds - 7-Step Generation Pipeline API
// Routes: POST /api/pipeline (dispatches based on action parameter)
// Actions: start, status, research, brand, strategy, copy, design, factcheck, assembly

export const config = { maxDuration: 300 };

import { createJob, getJob, startJobStep, updateJobStep, failJob, getProgress, getStepLabel, PIPELINE_STEPS } from '../lib/job-manager.js';
import { scrapeWebsite, scrapeMultiPage, extractBrandAssets, extractImages, fetchPage } from '../lib/website-scraper.js';
import { isGeminiAvailable, extractBusinessDataWithGemini } from '../lib/gemini.js';
import { buildTriggerContext, getStrategyContext, TRIGGERS } from '../lib/psychological-triggers.js';
import { getPageTemplate, generateBrandCSS, populateTemplate, getComponent, getPageTypeDesignInstructions, getBaseStyles } from '../lib/design-system.js';
import { savePage as savePageToStorage, getClient, updateClient, saveVerifiedClaims, getVerifiedClaims } from '../lib/storage.js';
import { deployPage as deployToGitHubPages, getPagesUrl } from '../lib/github.js';
import { getResearchSkillContext, getStrategySkillContext, getCopySkillContext, getBrandSkillContext } from '../lib/skill-loader.js';

// ============================================================
// ANTHROPIC API HELPER
// ============================================================
async function callClaude(systemPrompt, userPrompt, model = 'claude-sonnet-4-5-20250929', maxTokens = 8192) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error: ${resp.status} - ${err}`);
  }

  const data = await resp.json();
  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  const text = data.content?.[0]?.text || '';
  return { text, tokensUsed };
}

// Try to parse JSON from Claude's response (handles markdown code blocks)
function parseJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text); } catch (e) {}
  // Try extracting from code block
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch (e) {}
  }
  // Return as-is wrapped in object
  return { raw: text };
}

// ============================================================
// GITHUB STORAGE (for saving final pages)
// ============================================================
const GITHUB_API = 'https://api.github.com';

async function getGitHubFile(path) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!resp.ok) return { data: null, sha: null };
  const file = await resp.json();
  const content = Buffer.from(file.content, 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: file.sha };
}

async function saveGitHubFile(path, data, sha, message) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const body = {
    message: message || `Update ${path}`,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
  };
  if (sha) body.sha = sha;
  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// ============================================================
// STEP IMPLEMENTATIONS
// ============================================================

// STEP 1: RESEARCH - Deep website analysis (DR-MARKET-RESEARCH Framework)
// Now uses multi-page scraping + Gemini for initial extraction (faster/cheaper)
// Falls back to single-page + Claude-only if Gemini unavailable
async function runResearch(job) {
  const url = job.input_data.url || job.input_data.productUrl;
  const productName = job.input_data.productName;

  // Use multi-page scraping for richer data (main page + up to 4 sub-pages)
  let websiteData = {};
  if (url) {
    try {
      websiteData = await scrapeMultiPage(url, 4);
      console.log(`Multi-page scrape complete: ${websiteData.pagesScraped} pages scraped for ${url}`);
    } catch (e) {
      console.warn(`Multi-page scrape failed, falling back to single page: ${e.message}`);
      try {
        websiteData = await scrapeWebsite(url);
      } catch (e2) {
        websiteData = { error: e2.message, url };
      }
    }
  }

  // Try Gemini for initial structured extraction (faster + cheaper than Claude)
  let geminiData = null;
  let geminiTokens = 0;
  if (websiteData.text && isGeminiAvailable()) {
    try {
      const geminiResult = await extractBusinessDataWithGemini(websiteData.text, url);
      geminiData = geminiResult.data;
      geminiTokens = geminiResult.tokensUsed;
      console.log(`Gemini extraction complete: ${geminiTokens} tokens used`);
    } catch (e) {
      console.warn(`Gemini extraction failed, using Claude-only: ${e.message}`);
    }
  }

  const systemPrompt = `You are a PhD-level market researcher conducting deep competitive and customer intelligence analysis. You will analyze the provided business to extract:

1. **CUSTOMER RESEARCH**: Demographics, psychographics, Jobs-To-Be-Done (JTBD), pain point discovery, desire discovery
2. **COMPETITOR ANALYSIS**: Positioning, messaging patterns, offer comparison, differentiation strategies
3. **MARKET RESEARCH**: TAM/SAM/SOM sizing, market dynamics, growth indicators
4. **PRODUCT RESEARCH**: Features-to-benefits mapping, unique mechanisms, USP, proof elements

Your job is to surface the 88-question avatar framework summary including:
- Customer awareness level (Schwartz 1-5 scale)
- Market sophistication stage (1-5)
- Dominant resident emotion
- Voice of Customer (VOC) — exact words/phrases customers use
- Unique mechanism identification (what makes this different?)
- Competitor positioning map
- Proof inventory (testimonials, case studies, data, credentials)
- Key objections/resistance points
- Decision-making criteria

Return valid JSON only.`;

  // Load full skill frameworks from /skills/ directory
  const researchSkillContext = getResearchSkillContext();

  // Build Gemini pre-extraction context if available
  const geminiContext = geminiData ? `
## PRE-EXTRACTED BUSINESS DATA (from Gemini — use as starting point, enhance with deeper analysis):
Company: ${geminiData.company_name || 'Unknown'}
Industry: ${geminiData.industry || 'Unknown'}
Tagline: ${geminiData.tagline || 'N/A'}
Description: ${geminiData.description || 'N/A'}
Value Props: ${JSON.stringify(geminiData.value_propositions || [])}
Products: ${JSON.stringify(geminiData.products_services || [])}
Testimonials Found: ${(geminiData.testimonials || []).length}
Statistics Found: ${(geminiData.statistics || []).length}
Trust Signals: ${JSON.stringify(geminiData.trust_signals || [])}
Target Audiences: ${JSON.stringify(geminiData.target_audiences || [])}
Brand Voice: ${JSON.stringify(geminiData.brand_voice || {})}
Key Objections: ${JSON.stringify(geminiData.key_objections || [])}
---
` : '';

  const userPrompt = `Conduct PhD-level market research on this business. Extract competitive intelligence, customer insights, market dynamics, and proof elements.

${researchSkillContext ? '## SKILL REFERENCE FRAMEWORKS (follow these methodologies):\n' + researchSkillContext + '\n\n---\n' : ''}
${geminiContext}
${url ? 'Website URL: ' + url : ''}
${productName ? '\nProduct/Service: ' + productName : ''}
${websiteData.meta ? '\nPage Title: ' + websiteData.meta.title + '\nMeta Description: ' + websiteData.meta.description : ''}
${websiteData.pagesScraped ? '\nPages Scraped: ' + websiteData.pagesScraped + ' (main page + ' + (websiteData.subPages?.length || 0) + ' sub-pages)' : ''}
${websiteData.text ? '\nWebsite Content (multi-page excerpt):\n' + websiteData.text.substring(0, 15000) : ''}
${websiteData.products?.length ? '\nProducts found: ' + websiteData.products.map(p => p.name).join(', ') : ''}
${websiteData.testimonials?.length ? '\nTestimonials found: ' + websiteData.testimonials.length + '\n' + websiteData.testimonials.slice(0, 5).map(t => '  - "' + t.quote.substring(0, 100) + '"').join('\n') : ''}

Return a JSON object with these fields:
{
  "company_name": "string",
  "industry": "string",
  "tagline": "string",
  "value_propositions": ["string (each should be customer-centric, not feature-based)", ...],
  "unique_differentiators": ["string (what makes this mechanically different?)", ...],
  "products_services": [{"name": "string", "description": "string", "price": "string or null", "unique_mechanism": "string"}],

  "customer_research": {
    "avatar_summary": "string (88-question framework summary: demographics, psychographics, JTBD, pain points, desires)",
    "awareness_level": "1-5 (Schwartz scale: 1=Unaware, 2=Problem-Aware, 3=Solution-Aware, 4=Product-Aware, 5=Most-Aware)",
    "market_sophistication": "1-5 (1=Novice, 5=Expert)",
    "dominant_emotion": "string (fear, hope, greed, pride, belonging, guilt?)",
    "voice_of_customer": ["string (exact words customers use - extract from testimonials)", ...],
    "pain_points_layered": [{"level": "surface|emotional|existential", "description": "string"}, ...],
    "desires_layered": [{"level": "surface|aspiration|identity", "description": "string"}, ...]
  },

  "competitor_analysis": {
    "competitors": ["string (company name)", ...],
    "positioning_map": "string (how do competitors position relative to each other?)",
    "messaging_matrix": ["string (common competitor messaging angles)", ...]
  },

  "market_research": {
    "market_size_indicators": "string (TAM/SAM/SOM indicators if visible)",
    "growth_signals": ["string", ...]
  },

  "product_research": {
    "unique_mechanism": "string (THE core mechanism that makes this work differently. Use categories: New Discovery, Hidden Cause, Overlooked Factor, Proprietary Process, Counter-Intuitive)",
    "mechanism_type": "string (New Discovery | Hidden Cause | Overlooked Factor | Proprietary Process | Counter-Intuitive)",
    "proof_inventory": {
      "testimonials": [{"quote": "string", "author": "string", "specificity": "result or transformation"}],
      "case_studies": ["string (if available)", ...],
      "credentials": ["string (certifications, awards, expert endorsements)", ...],
      "data_points": ["string (studies, statistics, hard numbers)", ...]
    },
    "key_objections": ["string (what prevents customers from buying?)", ...]
  },

  "brand_voice": {"tone": "string", "keywords": ["string"]},
  "target_audiences": [{"name": "string", "demographics": "string", "pain_points": ["string"], "desires": ["string"]}],
  "emotional_hooks": ["string (what moves customers emotionally?)"]
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt, 'claude-sonnet-4-5-20250929', 8192);
  const researchData = parseJSON(text);
  researchData._websiteMeta = websiteData.meta || {};
  researchData._scrapedColors = websiteData.colors || [];
  researchData._scrapedFonts = websiteData.fonts || [];
  researchData._scrapedImages = websiteData.images || [];
  researchData._scrapedTestimonials = websiteData.testimonials || [];
  researchData._pagesScraped = websiteData.pagesScraped || 1;
  researchData._subPages = websiteData.subPages || [];
  researchData._geminiUsed = !!geminiData;
  researchData._geminiTokens = geminiTokens;

  // Merge Gemini-extracted testimonials and statistics into research data if not already captured
  if (geminiData) {
    // Merge Gemini testimonials into proof inventory
    const existingTestimonials = researchData.product_research?.proof_inventory?.testimonials || [];
    const geminiTestimonials = (geminiData.testimonials || []).filter(gt =>
      !existingTestimonials.some(et => et.quote && gt.quote && et.quote.substring(0, 50) === gt.quote.substring(0, 50))
    );
    if (geminiTestimonials.length > 0 && researchData.product_research?.proof_inventory) {
      researchData.product_research.proof_inventory.testimonials = [
        ...existingTestimonials, ...geminiTestimonials
      ];
    }

    // Merge Gemini statistics into data_points
    const existingDataPoints = researchData.product_research?.proof_inventory?.data_points || [];
    const geminiStats = (geminiData.statistics || []).map(s => s.text || s).filter(s =>
      !existingDataPoints.some(dp => typeof dp === 'string' && dp.includes(s.substring(0, 20)))
    );
    if (geminiStats.length > 0 && researchData.product_research?.proof_inventory) {
      researchData.product_research.proof_inventory.data_points = [
        ...existingDataPoints, ...geminiStats
      ];
    }
  }

  // Auto-populate verified_claims table from research findings
  if (job.client_id) {
    try {
      const claimsToSave = [];

      // Extract testimonials as verified claims (high confidence)
      const testimonials = researchData.product_research?.proof_inventory?.testimonials || [];
      for (const t of testimonials) {
        if (t.quote) {
          claimsToSave.push({
            claim_text: t.quote,
            source: url || 'website',
            category: 'testimonial',
            claim_type: 'testimonial',
            confidence_score: 0.9,
            verification_status: 'auto_extracted'
          });
        }
      }

      // Extract statistics/data points as verified claims
      const dataPoints = researchData.product_research?.proof_inventory?.data_points || [];
      for (const dp of dataPoints) {
        if (dp) {
          claimsToSave.push({
            claim_text: typeof dp === 'string' ? dp : dp.text || dp.claim || JSON.stringify(dp),
            source: url || 'website',
            category: 'statistic',
            claim_type: 'statistic',
            confidence_score: 0.8,
            verification_status: 'auto_extracted'
          });
        }
      }

      // Extract credentials as verified claims
      const credentials = researchData.product_research?.proof_inventory?.credentials || [];
      for (const cred of credentials) {
        if (cred) {
          claimsToSave.push({
            claim_text: typeof cred === 'string' ? cred : cred.text || JSON.stringify(cred),
            source: url || 'website',
            category: 'credential',
            claim_type: 'claim',
            confidence_score: 0.85,
            verification_status: 'auto_extracted'
          });
        }
      }

      // Extract value propositions as lower-confidence claims
      const valueProps = researchData.value_propositions || [];
      for (const vp of valueProps) {
        if (vp) {
          claimsToSave.push({
            claim_text: typeof vp === 'string' ? vp : JSON.stringify(vp),
            source: url || 'website',
            category: 'value_proposition',
            claim_type: 'claim',
            confidence_score: 0.7,
            verification_status: 'auto_extracted'
          });
        }
      }

      // Also extract from scraped testimonials (direct from HTML)
      for (const st of websiteData.testimonials || []) {
        if (st.quote && !claimsToSave.find(c => c.claim_text === st.quote)) {
          claimsToSave.push({
            claim_text: st.quote,
            source: url || 'website',
            category: 'testimonial',
            claim_type: 'testimonial',
            confidence_score: 0.9,
            verification_status: 'auto_extracted'
          });
        }
      }

      if (claimsToSave.length > 0) {
        const savedCount = await saveVerifiedClaims(job.client_id, claimsToSave);
        console.log(`Saved ${savedCount} verified claims for client ${job.client_id}`);
        researchData._verifiedClaimsSaved = savedCount;
      }
    } catch (e) {
      console.warn('Failed to save verified claims (non-fatal):', e.message);
    }
  }

  return { data: researchData, tokensUsed: tokensUsed + geminiTokens };
}

// STEP 2: BRAND - Extract brand identity
async function runBrand(job) {
  const url = job.input_data.url || job.input_data.productUrl;
  const research = job.research_data || {};

  let brandAssets = {};
  if (url) {
    try {
      brandAssets = await extractBrandAssets(url);
    } catch (e) {
      brandAssets = { error: e.message };
    }
  }

  // Load brand extraction skill framework
  const brandSkillContext = getBrandSkillContext();

  const systemPrompt = `You are an expert brand designer and visual identity specialist. Extract and define a complete brand guide from the provided information.
${brandSkillContext ? '\nFollow this skill framework for extraction methodology:\n' + brandSkillContext.substring(0, 6000) : ''}

Return valid JSON only.`;

  const userPrompt = `Create a comprehensive brand guide for this business.

Company: ${research.company_name || 'Unknown'}
Industry: ${research.industry || 'Unknown'}
Brand Voice: ${JSON.stringify(research.brand_voice || {})}

Colors found on website: ${JSON.stringify(brandAssets.colors || research._scrapedColors || [])}
Fonts found on website: ${JSON.stringify(brandAssets.fonts || research._scrapedFonts || [])}
Border radii found: ${JSON.stringify(brandAssets.borderRadii || [])}
Max widths found: ${JSON.stringify(brandAssets.maxWidths || [])}

Return a JSON object:
{
  "colors": {
    "primary": "#hex (main brand color)",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "typography": {
    "heading_font": "font-family string",
    "body_font": "font-family string",
    "heading_sizes": { "h1": "string", "h2": "string", "h3": "string" }
  },
  "spacing": {
    "border_radius": "string (e.g., 8px)",
    "spacing_unit": "string (e.g., 16px)",
    "max_width": "string (e.g., 1200px)"
  },
  "button_style": {
    "border_radius": "string",
    "padding": "string",
    "font_weight": "string"
  },
  "brand_voice": {
    "tone": "string describing the tone",
    "keywords": ["string", ...],
    "do": ["writing guidelines to follow"],
    "dont": ["writing guidelines to avoid"]
  }
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt, 'claude-sonnet-4-5-20250929', 4096);
  const brandData = parseJSON(text);
  return { data: brandData, tokensUsed };
}

// STEP 3: STRATEGY - Create page plan before any writing happens
// Decides which claims go where, plans the persuasion flow, maps the entire page
async function runStrategy(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const pageType = job.page_type;
  const audience = job.input_data.audience || job.input_data.targetAudience || '';
  const tone = job.input_data.tone || 'Professional & Trustworthy';

  // Get verified claims and testimonials
  const testimonials = research.product_research?.proof_inventory?.testimonials || research._scrapedTestimonials || [];
  const dataPoints = research.product_research?.proof_inventory?.data_points || [];

  const userPrompt = `Create a strategic page plan for a ${pageType} landing page.

## BUSINESS
Company: ${research.company_name || 'Unknown'}
Industry: ${research.industry || 'Unknown'}
Value Propositions: ${JSON.stringify(research.value_propositions || [])}
Unique Mechanism: ${research.product_research?.unique_mechanism || research.unique_differentiators?.[0] || 'Not specified'}
Target Audience: ${audience || JSON.stringify(research.target_audiences?.[0] || {})}

## VERIFIED DATA (only use these, do not invent)
Testimonials: ${JSON.stringify(testimonials.slice(0, 10))}
Data Points: ${JSON.stringify(dataPoints.slice(0, 10))}
Key Claims: ${JSON.stringify(research.key_claims || [])}
Objections: ${JSON.stringify(research.product_research?.key_objections || [])}

## BRAND VOICE
Tone: ${tone}
${brand.brand_voice?.keywords?.length ? 'Keywords: ' + brand.brand_voice.keywords.join(', ') : ''}

## TASK
Plan the page strategy. Decide:
1. Who is the target persona (one primary persona)?
2. What is the hook/headline angle?
3. What sections should the page have and in what order?
4. Which verified claims and testimonials go in which sections?
5. What is the CTA strategy?
6. How do we handle objections?

Return JSON:
{
  "page_goal": "string",
  "target_persona": {
    "description": "string",
    "pain_points": ["string"],
    "desires": ["string"],
    "objections": ["string"]
  },
  "hook": {
    "headline": "string (the headline angle, not final copy)",
    "subheadline": "string",
    "angle": "string (curiosity-gap|story-hook|statistic-lead|problem-agitation)"
  },
  "sections": [
    {
      "name": "string (e.g., 'opening_story', 'problem', 'mechanism', 'solution', 'proof', 'testimonials', 'faq', 'cta')",
      "purpose": "string",
      "key_message": "string",
      "elements": ["string (what elements: text, stats, testimonial, image, CTA, etc.)"],
      "claims_to_use": ["string (which verified claims to include here)"]
    }
  ],
  "cta_strategy": {
    "primary_cta": "string",
    "secondary_cta": "string or null",
    "cta_placement": ["string (where CTAs appear)"],
    "urgency_element": "string or null"
  },
  "objection_handling": [
    {"objection": "string", "response": "string"}
  ],
  "social_proof_strategy": "string (how to stack proof throughout the page)",
  "tone_guidelines": "string"
}`;

  const { text, tokensUsed } = await callClaude(null, userPrompt, 'claude-sonnet-4-5-20250929', 3000);
  const strategyData = parseJSON(text);
  return { data: strategyData, tokensUsed };
}

// STEP 4: COPY - Generate page copy
// Simplified, focused prompt that produces natural, human-sounding copy
async function runCopy(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const strategy = job.strategy_data || {};
  const pageType = job.page_type;
  const tone = job.input_data.tone || 'Professional & Trustworthy';

  // Get verified claims and testimonials from research
  const testimonials = research.product_research?.proof_inventory?.testimonials || research._scrapedTestimonials || [];
  const dataPoints = research.product_research?.proof_inventory?.data_points || [];
  const objections = research.product_research?.key_objections || [];

  // Page-type-specific guidelines (focused, not encyclopedic)
  const pageTypeGuidelines = {
    advertorial: `Write as a journalistic article, NOT an ad. 1500-2500 words.
Use a conversational, editorial tone like a health/lifestyle magazine feature.
Open with a named character's story (first name, age, specific details).
Structure: hook story > problem > "what experts are saying" > discovery > mechanism > proof > soft product intro > testimonials > FAQ > editorial CTA.
The product should not appear until the second half of the article.
Use pull quotes, blockquotes, and data callouts to break up text.`,
    'sales-letter': `Write a direct response sales letter. 2000-3000 words.
Lead with the biggest promise or most compelling proof point.
Structure: headline > subheadline > lead story > problem > mechanism > solution > proof stack > offer > guarantee > CTA > P.S.
Stack proof from strongest to weakest: third-party data > expert quotes > testimonials > logical arguments.`,
    listicle: `Write as a numbered list article. 100-200 words per item.
Use curiosity-driven headlines for each item. 7-15 items.
Mix format: some items text-heavy, some with stats, some with mini-stories.`,
    quiz: `Write quiz content with 5-8 insight-focused questions.
Each question should make the reader reflect on their situation.
Results should feel personalized and lead naturally to the product as a solution.`,
    'vip-signup': `Write exclusive, premium-feeling copy. 500-800 words.
Emphasize scarcity, exclusivity, and insider access.
Use sophisticated language without being pretentious.`
  };

  const userPrompt = `Write copy for a ${pageType} landing page for ${research.company_name || 'this business'}.

## BUSINESS CONTEXT
Company: ${research.company_name || 'Unknown'}
Industry: ${research.industry || 'Unknown'}
Value Propositions: ${JSON.stringify(research.value_propositions || [])}
Unique Mechanism: ${research.product_research?.unique_mechanism || research.unique_differentiators?.[0] || 'Not specified'}
Products: ${JSON.stringify((research.products_services || []).slice(0, 3))}

## STRATEGY (follow this plan)
${JSON.stringify({
  page_goal: strategy.page_strategy?.hero_strategy?.headline_angle || strategy.strategic_framework?.big_idea || 'Convert visitors',
  target_persona: strategy.personas?.[0] || {},
  sections: strategy.page_strategy?.sections || [],
  cta_strategy: strategy.page_strategy?.hero_strategy || {}
}, null, 2)}

## VERIFIED CLAIMS (use ONLY these, do not invent statistics)
Testimonials: ${JSON.stringify(testimonials.slice(0, 5))}
Data Points: ${JSON.stringify(dataPoints.slice(0, 5))}
If you need a stat but none is verified, write [NEEDS VERIFICATION: description] instead.

## BRAND VOICE
Tone: ${tone}
${brand.brand_voice?.keywords?.length ? 'Keywords: ' + brand.brand_voice.keywords.join(', ') : ''}
${brand.brand_voice?.do?.length ? 'Do: ' + brand.brand_voice.do.join('; ') : ''}
${brand.brand_voice?.dont?.length ? 'Avoid: ' + brand.brand_voice.dont.join('; ') : ''}

## PAGE TYPE GUIDELINES
${pageTypeGuidelines[pageType] || pageTypeGuidelines.advertorial}

## WRITING RULES
- Write like a skilled human copywriter, not an AI. Be conversational and specific.
- NEVER use em dashes. Use commas, colons, periods, or semicolons instead.
- Use specific numbers, real names, and concrete details from the research.
- Short paragraphs (2-3 sentences). Vary sentence length.
- Every section must advance the reader toward the CTA.

## OUTPUT FORMAT
Return JSON:
{
  "meta": {"title": "string (60 chars max)", "description": "string (155 chars max)"},
  "hero": {
    "headline": "string",
    "subheadline": "string",
    "cta_text": "string",
    "cta_subtext": "string or null"
  },
  "sections": [
    {
      "id": "string (e.g., 'opening', 'problem', 'mechanism', 'solution', 'proof', 'faq', 'cta')",
      "type": "content|testimonial|features|faq|cta|social_proof",
      "headline": "string",
      "subheadline": "string or null",
      "content": "string (the actual copy for this section, multiple paragraphs)",
      "items": [{"headline": "string", "description": "string"}],
      "cta": {"text": "string", "subtext": "string or null"},
      "testimonials": [{"quote": "string", "author": "string", "role": "string"}]
    }
  ],
  "footer_cta": {"headline": "string", "subheadline": "string", "cta_text": "string"},
  "social_proof": {
    "stats": [{"number": "string", "label": "string"}],
    "testimonials": [{"quote": "string", "author": "string", "role": "string"}]
  },
  "objection_handling": [{"objection": "string", "response": "string"}],
  "unverified_claims": ["any claims that need verification"]
}`;

  const { text, tokensUsed } = await callClaude(null, userPrompt, 'claude-sonnet-4-5-20250929', 8000);
  const copyData = parseJSON(text);
  return { data: copyData, tokensUsed };
}

// STEP 5: DESIGN - Generate complete HTML page
// Simplified, focused prompt. No CSS framework dump. Just brand + copy + page type.
async function runDesign(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const strategy = job.strategy_data || {};
  const copy = job.copy_data || {};
  const pageType = job.page_type;
  const companyName = research.company_name || 'Our Company';

  // Extract simple brand values (no CSS framework dump)
  const primaryColor = brand.colors?.primary || brand.style_guide?.primary_color || '#1a1a2e';
  const secondaryColor = brand.colors?.secondary || brand.style_guide?.secondary_color || '#16213e';
  const accentColor = brand.colors?.accent || brand.style_guide?.accent_color || '#e94560';

  // Determine fonts
  const headingFont = brand.typography?.heading_font || brand.style_guide?.heading_font || '';
  const bodyFont = brand.typography?.body_font || brand.style_guide?.body_font || '';

  // Default editorial font pairings per page type
  const fontPairings = {
    advertorial: { heading: 'Playfair Display', body: 'Source Sans Pro' },
    'sales-letter': { heading: 'Merriweather', body: 'Open Sans' },
    listicle: { heading: 'DM Sans', body: 'Inter' },
    quiz: { heading: 'Poppins', body: 'Inter' },
    'vip-signup': { heading: 'Cormorant Garamond', body: 'Montserrat' },
    calculator: { heading: 'Space Grotesk', body: 'Inter' },
  };
  const pairing = fontPairings[pageType] || fontPairings.advertorial;
  const useHeading = headingFont && headingFont !== "'Inter', sans-serif"
    ? headingFont.replace(/'/g, '').split(',')[0].trim()
    : pairing.heading;
  const useBody = bodyFont && bodyFont !== "'Inter', sans-serif"
    ? bodyFont.replace(/'/g, '').split(',')[0].trim()
    : pairing.body;

  // Collect real images from scraper
  const scrapedImages = research._scrapedImages || [];
  const imageList = scrapedImages.length > 0
    ? scrapedImages.slice(0, 8).map((img, i) => `${i + 1}. ${img.url} (${img.category})`).join('\n')
    : '';

  // Page-type-specific design guidelines
  const designGuidelines = {
    advertorial: `Design as a premium editorial/news article layout:
- Narrow content column (max-width: 700px), centered
- Sticky nav: company name left, CTA button right
- Hero: category label, large serif headline, italic subheadline, byline with date
- Feature image below hero (full column width)
- Drop cap on first paragraph
- Pull quotes in styled blockquotes (left border accent)
- Dark background sections for key data/science callouts
- Statistics displayed as large numbers in a 3-column row
- Testimonials as simple blockquotes with attribution
- FAQ as clickable accordion items
- Native ad disclosure at bottom
- Reading progress bar at very top`,
    'sales-letter': `Design as a direct response sales letter:
- Clean, single-column layout (max-width: 800px)
- Large, bold headline at top
- Long-form body with clear section breaks
- Product showcase cards on dark background
- Testimonial cards with star ratings
- Guarantee badge/section
- Multiple CTA buttons throughout`,
    listicle: `Design as a numbered list article:
- Clean article layout, narrow column
- Numbered items with card-style containers
- Alternating layouts for variety
- Progress indicator showing list position`,
    quiz: `Design as an interactive quiz:
- Full-width question cards
- Progress bar showing completion
- JavaScript-driven question flow
- Results page with personalized recommendation`,
    'vip-signup': `Design as a premium exclusive offer:
- Elegant, minimal layout
- Premium color palette
- Limited-spots counter
- Single prominent CTA`
  };

  const userPrompt = `Create a stunning, conversion-optimized ${pageType} landing page using this copy and brand guide.

## BRAND GUIDE
Primary Color: ${primaryColor}
Secondary Color: ${secondaryColor}
Accent Color: ${accentColor}
Heading Font: ${useHeading}
Body Font: ${useBody}
Button Style: ${brand.style_guide?.button_style || 'rounded, accent color background, white text'}
Spacing: ${brand.style_guide?.spacing_scale || 'generous whitespace'}

## COPY DATA
${JSON.stringify(copy, null, 2)}

## COMPANY
Name: ${companyName}
Industry: ${research.industry || 'Not specified'}
Products: ${JSON.stringify((research.products_services || []).slice(0, 3))}
Website: ${research.url || job.input_data?.url || ''}

${imageList ? `## PRODUCT IMAGES (use these in <img> tags)
${imageList}
You MUST use at least 2 of these images. Use the first as the hero/feature image.` : '## IMAGES\nNo product images available. Use styled CSS backgrounds instead. Do NOT use placeholder image services.'}

## DESIGN GUIDELINES
${designGuidelines[pageType] || designGuidelines.advertorial}

## REQUIREMENTS
- Return ONLY complete HTML starting with <!DOCTYPE html> and ending with </html>
- Embed ALL CSS in a <style> tag. Only external resource: Google Fonts.
- Include this in <head>: <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(useHeading)}:wght@400;600;700;800&family=${encodeURIComponent(useBody)}:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
- Mobile-responsive (use CSS Grid/Flexbox, @media queries for < 768px)
- Apply EXACT brand colors from the brand guide
- Modern 2025 design: generous whitespace, subtle shadows, smooth transitions
- Smooth scroll behavior
- NEVER use em dashes. Use commas, colons, or periods.
- NEVER use emoji as design elements.
- Every section must be filled with real content from the copy data.
- The page MUST be complete with </body> and </html> tags. Do not truncate.
- Include interactive FAQ accordion if the copy has objection handling or FAQ items.
- Include viewport meta tag and Open Graph meta tags.

Return ONLY the complete HTML. No explanations.`;

  const { text, tokensUsed } = await callClaude(null, userPrompt, 'claude-sonnet-4-5-20250929', 16000);

  // Clean up the response
  let html = text;
  html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/i, '');
  if (!html.trim().startsWith('<!DOCTYPE') && !html.trim().startsWith('<html')) {
    const docIdx = html.indexOf('<!DOCTYPE');
    const htmlIdx = html.indexOf('<html');
    const startIdx = docIdx >= 0 ? docIdx : htmlIdx;
    if (startIdx > 0) html = html.substring(startIdx);
  }
  const htmlEndIdx = html.lastIndexOf('</html>');
  if (htmlEndIdx > 0) html = html.substring(0, htmlEndIdx + 7);

  return { data: { html, template_type: pageType, design_system_version: '5.0' }, tokensUsed };
}

// STEP 6: FACTCHECK - Verify claims against verified_claims database
async function runFactcheck(job) {
  const research = job.research_data || {};
  const copy = job.copy_data || {};
  let html = job.design_data?.html || '';

  // Step 1: Fetch verified claims from database for this client
  let dbClaims = [];
  if (job.client_id) {
    try {
      dbClaims = await getVerifiedClaims(job.client_id, { limit: 50 });
    } catch (e) {
      console.warn('Could not fetch verified claims:', e.message);
    }
  }

  // Step 2: Extract claims from the generated HTML
  const extractedClaims = extractClaimsFromHtml(html);

  // Step 3: Cross-reference extracted claims against verified claims database
  const verificationResults = crossReferenceVerifiedClaims(extractedClaims, dbClaims, research);

  // Step 4: Send to Claude for additional review with verified claims context
  const verifiedClaimsContext = dbClaims.length > 0
    ? `\n\nVERIFIED CLAIMS DATABASE (${dbClaims.length} entries — only these are confirmed true):\n${dbClaims.map(c => `- [${c.category || 'general'}] "${c.claim_text}" (confidence: ${c.confidence_score || 'N/A'}, source: ${c.source || 'website'})`).join('\n')}`
    : '\n\nNo verified claims in database — treat ALL statistics and specific claims as unverified.';

  const systemPrompt = `You are a rigorous fact-checker and compliance reviewer. You have access to a VERIFIED CLAIMS DATABASE — only claims that appear in this database (or closely match) should be considered verified.

CRITICAL RULES:
1. Statistics (percentages, numbers, dollar amounts) that do NOT appear in the verified claims database must be flagged as "unverified"
2. Testimonials that do NOT match verified testimonials must be flagged
3. Claims about awards, certifications, or "featured in" that aren't verified must be flagged
4. If a claim is fabricated by the AI (not from research or verified claims), flag as "high" severity

Return valid JSON only.`;

  const userPrompt = `Fact-check this landing page content against the verified claims database.
${verifiedClaimsContext}

ORIGINAL RESEARCH DATA:
Key Claims: ${JSON.stringify(research.key_claims || [])}
Testimonials: ${JSON.stringify(research.product_research?.proof_inventory?.testimonials || research.testimonials || [])}
Products: ${JSON.stringify(research.products_services || [])}
Data Points: ${JSON.stringify(research.product_research?.proof_inventory?.data_points || [])}

COPY TO VERIFY:
Hero: ${JSON.stringify(copy.hero || {})}
Sections: ${JSON.stringify((copy.sections || copy.body_sections || []).slice(0, 5))}
Social Proof Stats: ${JSON.stringify(copy.social_proof?.stats || [])}
Testimonials Used: ${JSON.stringify(copy.social_proof?.testimonials || [])}

PRE-CHECKED RESULTS (from automated cross-reference):
${JSON.stringify(verificationResults.summary, null, 2)}

Return JSON:
{
  "verified_claims": [{"claim": "string", "status": "verified|unverified|needs_source", "source": "string or null", "note": "string"}],
  "flagged_issues": [{"issue": "string", "severity": "low|medium|high", "suggestion": "string"}],
  "claims_to_remove": ["string (exact text of claims that should be removed from HTML)"],
  "compliance_notes": ["string"],
  "overall_score": 0-100,
  "recommendation": "approve|revise|reject"
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt, 'claude-haiku-4-5-20251001', 4096);
  const factcheckData = parseJSON(text);

  // Step 5: Remove/flag unverified claims from HTML if flagged
  let cleanedHtml = html;
  const claimsToRemove = factcheckData.claims_to_remove || [];
  for (const claimText of claimsToRemove) {
    if (claimText && claimText.length > 10) {
      // Replace the claim with a verification notice or remove it
      cleanedHtml = cleanedHtml.replace(claimText, '[STAT REMOVED - UNVERIFIED]');
    }
  }

  // If claims were removed, update the design data with cleaned HTML
  if (claimsToRemove.length > 0 && cleanedHtml !== html) {
    factcheckData._htmlCleaned = true;
    factcheckData._claimsRemoved = claimsToRemove.length;
    // Store the cleaned HTML back in design_data for assembly step
    // (This is done via the job update in the main handler)
  }

  factcheckData._verifiedClaimsCount = dbClaims.length;
  factcheckData._extractedClaimsCount = extractedClaims.length;
  factcheckData._crossReferenceResults = verificationResults.summary;
  if (cleanedHtml !== html) {
    factcheckData._cleanedHtml = cleanedHtml;
  }

  return { data: factcheckData, tokensUsed };
}

// Helper: Extract claims (statistics, testimonials, specific assertions) from HTML
function extractClaimsFromHtml(html) {
  if (!html) return [];
  const claims = [];

  // Strip HTML tags for text analysis
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // Extract statistics: percentages, numbers with units
  const statPatterns = [
    /(\d+(?:\.\d+)?%\s*(?:of|increase|decrease|improvement|reduction|more|less|better|growth|success|satisfaction|report|experience)[^.]*)/gi,
    /(\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|saved|revenue|profit|increase))?[^.]*)/gi,
    /(\d+(?:,\d{3})*\+?\s*(?:customers|clients|users|patients|people|reviews|testimonials|results|case studies|countries|years)[^.]*)/gi,
  ];

  for (const pattern of statPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const claim = match[1].trim();
      if (claim.length > 10 && claim.length < 300) {
        claims.push({ text: claim, type: 'statistic' });
      }
    }
  }

  // Extract quoted testimonials
  const quotePattern = /[""]([^""]{30,300})[""](?:\s*[-–—]\s*([A-Z][^,\n]{2,50}))?/g;
  let match;
  while ((match = quotePattern.exec(text)) !== null) {
    claims.push({ text: match[1].trim(), type: 'testimonial', author: match[2]?.trim() });
  }

  return claims;
}

// Helper: Cross-reference extracted claims against verified claims DB
function crossReferenceVerifiedClaims(extractedClaims, dbClaims, research) {
  const results = { verified: [], unverified: [], needs_review: [] };

  for (const claim of extractedClaims) {
    let matched = false;

    // Check against verified claims database
    for (const dbClaim of dbClaims) {
      if (fuzzyClaimMatch(claim.text, dbClaim.claim_text)) {
        results.verified.push({ claim: claim.text, matchedTo: dbClaim.claim_text, confidence: dbClaim.confidence_score });
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check against research source content as fallback
      const sourceContent = JSON.stringify(research);
      if (claim.type === 'statistic') {
        // For stats, check if any numbers appear in the source
        const numbers = claim.text.match(/\d+(?:\.\d+)?/g) || [];
        const foundInSource = numbers.some(n => sourceContent.includes(n));
        if (foundInSource) {
          results.needs_review.push({ claim: claim.text, reason: 'Numbers found in research but not in verified claims DB' });
        } else {
          results.unverified.push({ claim: claim.text, reason: 'Statistic not found in verified claims or research' });
        }
      } else {
        results.needs_review.push({ claim: claim.text, reason: 'Not in verified claims DB, needs manual review' });
      }
    }
  }

  return {
    results,
    summary: {
      total_claims_found: extractedClaims.length,
      verified: results.verified.length,
      unverified: results.unverified.length,
      needs_review: results.needs_review.length
    }
  };
}

// Helper: Fuzzy matching for claims (handles minor wording differences)
function fuzzyClaimMatch(claimA, claimB) {
  if (!claimA || !claimB) return false;
  const a = claimA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = claimB.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Exact substring match
  if (a.includes(b) || b.includes(a)) return true;
  // Check if key numbers match
  const numsA = claimA.match(/\d+(?:\.\d+)?/g) || [];
  const numsB = claimB.match(/\d+(?:\.\d+)?/g) || [];
  if (numsA.length > 0 && numsB.length > 0) {
    return numsA.some(n => numsB.includes(n));
  }
  return false;
}

// STEP 7: ASSEMBLY - Final QA and page creation
async function runAssembly(job) {
  // Use cleaned HTML from factcheck if available, otherwise use design HTML
  let html = job.factcheck_data?._cleanedHtml || job.design_data?.html || '';
  const research = job.research_data || {};
  const copy = job.copy_data || {};
  const factcheck = job.factcheck_data || {};
  const pageType = job.page_type;
  const companyName = research.company_name || 'Landing Page';

  // Remove any remaining [STAT REMOVED - UNVERIFIED] markers
  html = html.replace(/\[STAT REMOVED - UNVERIFIED\]/g, '');
  html = html.replace(/\[TESTIMONIAL REMOVED - UNVERIFIED\]/g, '');

  // Strip ANY remaining {{PLACEHOLDER}} patterns (from old template system or missed slots)
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, '');

  // ── Inject real product images from website scrape ──
  const scrapedImages = research._scrapedImages || [];
  if (scrapedImages.length > 0) {
    const productImages = scrapedImages.filter(i => i.category === 'product');
    const heroImages = scrapedImages.filter(i => i.category === 'hero');
    const galleryImages = scrapedImages.filter(i => i.category === 'gallery');
    const featureImages = scrapedImages.filter(i => i.category === 'feature');
    const allUsable = [...productImages, ...heroImages, ...galleryImages, ...featureImages, ...scrapedImages.filter(i => i.category === 'general')];

    // Replace placeholder/dummy image URLs with real images
    const placeholderPattern = /https?:\/\/(via\.placeholder\.com|placehold\.it|placeholder\.com|source\.unsplash\.com|picsum\.photos|dummyimage\.com|placeimg\.com|loremflickr\.com)[^\s"')]+/gi;
    let imgIndex = 0;
    html = html.replace(placeholderPattern, () => {
      if (imgIndex < allUsable.length) return allUsable[imgIndex++].url;
      return allUsable.length > 0 ? allUsable[0].url : '';
    });

    // Replace data-placeholder-image attributes
    html = html.replace(/data-placeholder-image="([^"]*)"/gi, (match, type) => {
      let img;
      if (type === 'product' && productImages.length > 0) img = productImages[0];
      else if (type === 'hero' && heroImages.length > 0) img = heroImages[0];
      else if (allUsable.length > 0) img = allUsable[0];
      return img ? `src="${img.url}" alt="${img.alt || companyName}"` : match;
    });

    // Replace product-class img src
    const productImgPattern = /(<img[^>]*class="[^"]*product[^"]*"[^>]*src=")([^"]+)(")/gi;
    let pIdx = 0;
    html = html.replace(productImgPattern, (match, before, src, after) => {
      if (pIdx < productImages.length) return before + productImages[pIdx++].url + after;
      else if (allUsable.length > 0) return before + allUsable[0].url + after;
      return match;
    });
  }

  // Remove any empty image containers (gray boxes with no content)
  // Pattern: div with min-height that only contains whitespace or a span with placeholder text
  html = html.replace(/<div[^>]*style="[^"]*min-height:\s*\d+px[^"]*"[^>]*>\s*<span[^>]*style="[^"]*color:\s*var\(--text-light\)[^"]*"[^>]*>\s*<\/span>\s*<\/div>/gi, '');

  // Remove img tags with empty/broken src
  html = html.replace(/<img[^>]*src="\s*"[^>]*>/gi, '');

  // Generate a slug
  const slug = `${pageType}-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}-${Date.now().toString(36)}`;

  // ── Ensure HTML has proper closing tags (Claude sometimes truncates) ──
  if (!html.includes('</body>')) {
    // HTML was truncated — close any open tags and add closing structure
    // First, close any potentially open <section>, <div>, <main>, <article> tags
    const openTags = [];
    const tagPattern = /<(section|div|main|article|aside|footer|header|nav)[\s>]/gi;
    const closePattern = /<\/(section|div|main|article|aside|footer|header|nav)>/gi;
    let m;
    const openCounts = {};
    const closeCounts = {};
    while ((m = tagPattern.exec(html)) !== null) {
      const tag = m[1].toLowerCase();
      openCounts[tag] = (openCounts[tag] || 0) + 1;
    }
    while ((m = closePattern.exec(html)) !== null) {
      const tag = m[1].toLowerCase();
      closeCounts[tag] = (closeCounts[tag] || 0) + 1;
    }
    // Close unclosed tags in reverse nesting order
    for (const tag of ['div', 'section', 'article', 'main', 'aside', 'footer', 'header', 'nav']) {
      const unclosed = (openCounts[tag] || 0) - (closeCounts[tag] || 0);
      for (let i = 0; i < unclosed; i++) {
        html += `</${tag}>`;
      }
    }
    html += '\n</body>\n</html>';
    console.warn('Assembly: HTML was truncated, added closing tags');
  }
  if (!html.includes('</html>')) {
    html += '\n</html>';
  }

  // ── Replace em dashes with regular dashes in final HTML ──
  // Em dashes are a telltale sign of AI-generated content
  html = html.replace(/\u2014/g, ' - ');
  html = html.replace(/&mdash;/g, ' - ');

  // Inject tracking script + admin editor widget
  const trackingScript = generateTrackingScript(slug);
  const adminWidget = generateAdminWidgetScript(slug);
  const injectedScripts = trackingScript + (adminWidget || '');
  // Always inject before </body> (which is now guaranteed to exist)
  html = html.replace('</body>', `${injectedScripts}\n</body>`);

  // Create page record
  const pageId = 'pg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const pageName = copy.meta?.title || copy.headlines?.hero_headline || `${companyName} ${pageType}`;

  const page = {
    id: pageId,
    name: pageName,
    slug: slug,
    html_content: html,
    client_id: job.client_id || null,
    client_name: companyName,
    page_type: pageType,
    status: 'live',
    views: 0,
    leads: 0,
    meta_title: copy.meta?.title || pageName,
    meta_description: copy.meta?.description || '',
    created_at: new Date().toISOString(),
    deployed_at: new Date().toISOString(),
    url: `/p/${slug}`,
    generation_job_id: job.id,
    factcheck_score: factcheck.overall_score || null
  };

  // Save page to storage (Postgres-first with GitHub fallback)
  try {
    await savePageToStorage(page);
  } catch (e) {
    console.error('Failed to save page:', e.message);
  }

  // Deploy to GitHub Pages (parallel to Vercel hosting — like Unicorn does)
  let githubPagesUrl = null;
  try {
    githubPagesUrl = await deployToGitHubPages(slug, html);
    if (githubPagesUrl) {
      console.log(`GitHub Pages deployed: ${githubPagesUrl}`);
      // Update the page record with the GitHub Pages URL
      try {
        await savePageToStorage({ ...page, github_pages_url: githubPagesUrl });
      } catch (e) {}
    }
  } catch (e) {
    console.error('GitHub Pages deployment failed (non-fatal):', e.message);
  }

  return {
    data: {
      html,
      pageId,
      pageName,
      slug,
      githubPagesUrl,
      factcheckScore: factcheck.overall_score || null,
      factcheckRecommendation: factcheck.recommendation || 'approve'
    },
    tokensUsed: 0
  };
}

// ============================================================
// TRACKING SCRIPT GENERATOR
// ============================================================
function generateTrackingScript(pageId) {
  return `
<script>
(function() {
  var pageId = '${pageId}';
  var apiBase = 'https://runads-platform.vercel.app';
  var sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
  var params = new URLSearchParams(window.location.search);
  var utmData = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content')
  };

  // Track page view
  fetch(apiBase + '/api/track/' + pageId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      referrer: document.referrer,
      device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      ...utmData
    })
  }).catch(function() {});

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    var formData = {};
    new FormData(form).forEach(function(value, key) { formData[key] = value; });
    fetch(apiBase + '/api/submit/' + pageId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        form_data: formData,
        ...utmData
      })
    }).catch(function() {});
  });
})();
</script>`;
}

// ============================================================
// ADMIN CHAT WIDGET SCRIPT GENERATOR
// Builds widget entirely via DOM API (no innerHTML) to avoid
// broken rendering when HTML structure is incomplete
// ============================================================
function generateAdminWidgetScript(slug) {
  const adminKey = process.env.ADMIN_EDIT_KEY || '';
  if (!adminKey) return ''; // Don't inject widget if no admin key configured
  return `
<script>
(function(){
  var SLUG='${slug}',KEY='${adminKey}',API='https://runads-platform.vercel.app/api/chat';
  var panel=null,open=false;
  function el(tag,styles,txt){var e=document.createElement(tag);if(styles)Object.assign(e.style,styles);if(txt)e.textContent=txt;return e;}
  function createPanel(){
    if(panel)return;
    var w=el('div',{position:'fixed',bottom:'0',right:'20px',width:'380px',height:'480px',background:'#1a1a2e',borderRadius:'12px 12px 0 0',boxShadow:'0 -4px 24px rgba(0,0,0,0.3)',display:'flex',flexDirection:'column',zIndex:'99999',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',color:'#fff'});
    var hd=el('div',{padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.1)'});
    hd.appendChild(el('span',{fontWeight:'600',fontSize:'14px'},'RunAds Editor'));
    var xb=el('button',{background:'none',border:'none',color:'#9ca3af',fontSize:'18px',cursor:'pointer',padding:'0 4px'},'X');
    xb.onclick=toggle;hd.appendChild(xb);w.appendChild(hd);
    var ms=el('div',{flex:'1',overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'10px'});ms.id='__ra_msgs';
    ms.appendChild(el('div',{background:'rgba(255,255,255,0.08)',padding:'10px 12px',borderRadius:'8px',fontSize:'13px',color:'#d1d5db',lineHeight:'1.5'},'Describe any changes you want to make to this page.'));
    w.appendChild(ms);
    var ft=el('div',{padding:'12px',borderTop:'1px solid rgba(255,255,255,0.1)',display:'flex',gap:'8px'});
    var ip=document.createElement('input');ip.id='__ra_input';ip.type='text';ip.placeholder='Describe your change...';Object.assign(ip.style,{flex:'1',padding:'10px 12px',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'8px',fontSize:'13px',background:'rgba(255,255,255,0.06)',color:'#fff',outline:'none'});
    ip.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();send();}});ft.appendChild(ip);
    var sb=el('button',{padding:'10px 16px',background:'#6366f1',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'500'},'Send');sb.id='__ra_send';sb.onclick=send;ft.appendChild(sb);
    w.appendChild(ft);panel=el('div',{display:'none'});panel.id='__ra_editor';panel.appendChild(w);document.body.appendChild(panel);
  }
  function toggle(){
    if(!panel)createPanel();
    open=!open;
    panel.style.display=open?'block':'none';
    if(open)document.getElementById('__ra_input').focus();
  }
  function addMsg(text,isUser){
    var m=document.getElementById('__ra_msgs');
    var b=document.createElement('div');
    b.style.cssText='padding:10px 12px;border-radius:8px;font-size:13px;line-height:1.5;max-width:85%;word-wrap:break-word;'+(isUser?'background:#6366f1;color:#fff;align-self:flex-end;':'background:rgba(255,255,255,0.08);color:#d1d5db;align-self:flex-start;');
    b.textContent=text;
    m.appendChild(b);
    m.scrollTop=m.scrollHeight;
    return b;
  }
  function send(){
    var inp=document.getElementById('__ra_input');
    var msg=inp.value.trim();
    if(!msg)return;
    inp.value='';
    addMsg(msg,true);
    var loading=addMsg('Working on it...', false);
    var btn=document.getElementById('__ra_send');
    btn.disabled=true;btn.textContent='...';
    fetch(API,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({slug:SLUG,message:msg,adminKey:KEY})
    })
    .then(function(r){return r.json();})
    .then(function(d){
      loading.remove();
      if(d.success){
        addMsg(d.response||'Change applied!',false);
        setTimeout(function(){location.reload();},1500);
      }else{
        addMsg('Error: '+(d.error||'Unknown error'),false);
      }
    })
    .catch(function(e){loading.remove();addMsg('Error: '+e.message,false);})
    .finally(function(){btn.disabled=false;btn.textContent='Send';});
  }
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.code==='KeyE'){e.preventDefault();toggle();}
    if(e.key==='Escape'&&open)toggle();
  });
})();
</script>`;
}

// ============================================================
// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse the action from the URL path
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathParts = url.pathname.replace('/api/pipeline', '').split('/').filter(Boolean);

    // POST /api/pipeline/scrape-claims (or body action)
    if ((pathParts[0] === 'scrape-claims' || req.body?.action === 'scrape-claims') && req.method === 'POST') {
      return handleScrapeClaims(req, res);
    }

    // POST /api/pipeline/scrape-images (or body action)
    if ((pathParts[0] === 'scrape-images' || req.body?.action === 'scrape-images') && req.method === 'POST') {
      return handleScrapeImages(req, res);
    }

    // POST /api/pipeline/start
    if (pathParts[0] === 'start' && req.method === 'POST') {
      return handleStart(req, res);
    }

    // GET /api/pipeline/{jobId}/status
    if (pathParts.length >= 2 && pathParts[1] === 'status' && req.method === 'GET') {
      return handleStatus(pathParts[0], req, res);
    }

    // POST /api/pipeline/{jobId}/step/{stepName}
    if (pathParts.length >= 3 && pathParts[1] === 'step' && req.method === 'POST') {
      return handleStep(pathParts[0], pathParts[2], req, res);
    }

    return res.status(404).json({ error: 'Unknown pipeline action', path: pathParts });
  } catch (error) {
    console.error('Pipeline error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Handle POST /api/pipeline/scrape-images
async function handleScrapeImages(req, res) {
  const { clientId, url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const html = await fetchPage(url);
    const images = extractImages(html, url);

    // Save to client record
    if (clientId && images.length > 0) {
      const client = await getClient(clientId);
      if (client) {
        await updateClient(clientId, { scrapedImages: images, _scrapedImages: images });
      }
    }

    return res.json({ success: true, images, count: images.length });
  } catch (error) {
    console.error('Scrape images error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Handle POST /api/pipeline/start
async function handleStart(req, res) {
  const { clientId, pageType, url, productUrl, productName, audience, targetAudience, tone } = req.body || {};

  if (!pageType) {
    return res.status(400).json({ error: 'pageType is required' });
  }

  const inputData = {
    url: url || productUrl || null,
    productName: productName || null,
    audience: audience || targetAudience || null,
    tone: tone || 'Professional & Trustworthy'
  };

  const job = await createJob({ clientId, pageType, inputData });

  return res.status(200).json({
    success: true,
    jobId: job.id,
    status: 'pending',
    message: 'Generation job created. Call /api/pipeline/{jobId}/step/research to begin.'
  });
}

// Handle GET /api/pipeline/{jobId}/status
async function handleStatus(jobId, req, res) {
  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const progress = getProgress(job.current_step, job.status);
  const stepLabel = getStepLabel(job.current_step);

  return res.status(200).json({
    jobId: job.id,
    status: job.status,
    currentStep: job.current_step,
    stepLabel,
    progress,
    tokensUsed: job.tokens_used,
    cost: ((job.tokens_used || 0) / 1000000) * 9,
    error: job.error,
    // Include step completion data
    stepsCompleted: {
      research: Object.keys(job.research_data || {}).length > 0,
      brand: Object.keys(job.brand_data || {}).length > 0,
      strategy: Object.keys(job.strategy_data || {}).length > 0,
      copy: Object.keys(job.copy_data || {}).length > 0,
      design: Object.keys(job.design_data || {}).length > 0,
      factcheck: Object.keys(job.factcheck_data || {}).length > 0,
      assembly: Object.keys(job.assembly_data || {}).length > 0,
    },
    result: job.status === 'complete' ? {
      pageId: job.assembly_data?.pageId || job.result_page_id,
      pageName: job.assembly_data?.pageName,
      slug: job.assembly_data?.slug,
      factcheckScore: job.assembly_data?.factcheckScore,
    } : null,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at
  });
}

// Handle POST /api/pipeline/{jobId}/step/{stepName}
async function handleStep(jobId, stepName, req, res) {
  if (!PIPELINE_STEPS.includes(stepName)) {
    return res.status(400).json({ error: `Invalid step: ${stepName}. Valid steps: ${PIPELINE_STEPS.join(', ')}` });
  }

  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status === 'complete') {
    return res.status(400).json({ error: 'Job already complete' });
  }

  if (job.status === 'failed') {
    return res.status(400).json({ error: 'Job has failed. Create a new job.' });
  }

  // Mark step as in-progress
  await startJobStep(jobId, stepName);

  try {
    const stepFunctions = {
      research: runResearch,
      brand: runBrand,
      strategy: runStrategy,
      copy: runCopy,
      design: runDesign,
      factcheck: runFactcheck,
      assembly: runAssembly,
    };

    const stepFn = stepFunctions[stepName];
    // Re-fetch job to get latest data from previous steps
    const freshJob = await getJob(jobId);
    const { data, tokensUsed } = await stepFn(freshJob);

    // Save step data and transition
    await updateJobStep(jobId, stepName, data, tokensUsed);

    const updatedJob = await getJob(jobId);
    const progress = getProgress(updatedJob.current_step, updatedJob.status);

    return res.status(200).json({
      success: true,
      jobId,
      step: stepName,
      stepLabel: getStepLabel(stepName),
      status: updatedJob.status,
      nextStep: updatedJob.status === 'complete' ? null : updatedJob.current_step,
      progress,
      tokensUsed,
      data: stepName === 'design' ? { htmlLength: data.html?.length || 0 } : data // Don't return full HTML in response
    });

  } catch (error) {
    console.error(`Step ${stepName} failed:`, error);
    await failJob(jobId, error.message);
    return res.status(500).json({
      success: false,
      jobId,
      step: stepName,
      error: error.message
    });
  }
}

// ============================================================
// SCRAPE VERIFIED CLAIMS from a client's website
// ============================================================

async function handleScrapeClaims(req, res) {
  const { clientId, url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // Step 1: Scrape the website
    const siteData = await scrapeWebsite(url);

    // Step 2: Use Claude to extract verified claims, testimonials, and statistics
    const systemPrompt = `You are an expert researcher who extracts verified, factual claims from websites. Your job is to analyze website content and identify three categories of verifiable information:

1. **CLAIMS** — Factual statements about the product, company, or ingredients that can be verified (e.g., "Made with 100% organic ingredients", "Founded in 2015", "FDA-approved facility")
2. **TESTIMONIALS** — Customer reviews, success stories, or endorsements with specific details (e.g., "After 3 weeks, my energy levels doubled — Sarah M., Melbourne")
3. **STATISTICS** — Numerical data, study results, or measurable outcomes (e.g., "95% of customers report improved sleep within 2 weeks", "Contains 40mg of active compound per serving")

IMPORTANT RULES:
- Only extract information that is ACTUALLY STATED on the website — never infer or fabricate
- Include the source (which page or section the claim comes from)
- Be conservative: if a claim seems vague or unverifiable, skip it
- Preserve the exact wording where possible
- Focus on claims that would be powerful in advertising (social proof, credibility, differentiators)`;

    const userPrompt = `Analyze this website content and extract all verified claims, testimonials, and statistics.

Website URL: ${url}
Website Title: ${siteData.title || 'Unknown'}

## Scraped Content
${siteData.textContent?.slice(0, 15000) || 'No content scraped'}

${siteData.metaDescription ? `Meta Description: ${siteData.metaDescription}` : ''}

## Output Format
Return a JSON array of claims:
{
  "claims": [
    {
      "text": "The exact claim or testimonial text",
      "category": "CLAIM" | "TESTIMONIAL" | "STATISTIC",
      "source": "URL or page section where this was found",
      "confidence": "HIGH" | "MEDIUM" — how verifiable/specific is this claim?
    }
  ]
}

Extract as many legitimate claims as you can find. Focus on high-confidence, specific, factual statements that would be powerful in advertising copy.`;

    const result = await callClaude(systemPrompt, userPrompt);
    const parsed = parseJSON(result.text);
    const claims = parsed.claims || [];

    // Step 3: Save claims to client record
    if (clientId && claims.length > 0) {
      const client = await getClient(clientId);
      if (client) {
        const existingClaims = client.claims || [];
        const newClaims = claims.map(c => ({
          ...c,
          id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          created_at: new Date().toISOString(),
          scraped: true
        }));
        await updateClient(clientId, { claims: [...existingClaims, ...newClaims] });
      }
    }

    return res.json({
      success: true,
      claims,
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    console.error('Scrape claims error:', error);
    return res.status(500).json({ error: error.message });
  }
}
