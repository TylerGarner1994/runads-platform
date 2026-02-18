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

// STEP 3: STRATEGY - Page outline and messaging (PERSONA-ARCHITECT + Strategic Framework)
async function runStrategy(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const pageType = job.page_type;
  const audience = job.input_data.audience || job.input_data.targetAudience || '';
  const tone = job.input_data.tone || 'Professional & Trustworthy';

  // Get relevant psychological triggers
  const triggerContext = buildTriggerContext(pageType, 'solution_aware', 8);
  const stackContext = getStrategyContext(pageType);

  // Load persona-architect and research question skill frameworks
  const strategySkillContext = getStrategySkillContext();

  const systemPrompt = `You are an elite conversion strategist combining:
- **Eugene Schwartz** (awareness levels, sophistication calibration)
- **Gary Halbert** (hooks, hooks, hooks — leading with strongest hooks)
- **Robert Cialdini** (6 principles of influence)
- **Oren Klaff** (pitch framing, pattern interrupts)
- **Gary Bencivenga** (80/20 thinking, proof hierarchy)
- **Evaldo** (16-Word Framework: Big Promise + Unique Mechanism + Overwhelming Proof)

Your job is to architect 3-5 detailed buyer personas and the strategy to move them from their current awareness level to purchase decision.

For each persona, define:
1. Demographics + psychographics
2. Schwartz Awareness Level (1-5)
3. Layered Pain Points (surface, emotional, existential)
4. Layered Desires (surface, aspiration, identity)
5. Top 5 Cognitive Biases (with stack recommendations)
6. Objections/resistance points
7. Decision-making style (rational, emotional, social proof-driven, etc.)
8. Language patterns (actual words they use)

Then architect the page strategy to move them through the awareness journey using:
- Specific trigger sequences
- Proof hierarchy (strongest to weakest)
- Unique mechanism revelation
- Copy architecture (advertorial vs sales letter)

Return valid JSON only.`;

  const userPrompt = `Create a comprehensive persona and page strategy for a ${pageType} page.

BUSINESS INFO:
Company: ${research.company_name || 'Unknown'}
Industry: ${research.industry || 'Unknown'}
Value Props: ${JSON.stringify(research.value_propositions || [])}
Unique Mechanism: ${research.product_research?.unique_mechanism || research.unique_differentiators?.[0] || 'N/A'}
Target Audience: ${audience || JSON.stringify(research.target_audiences?.[0] || {})}
Tone: ${tone}
Brand Voice: ${JSON.stringify(brand.brand_voice || research.brand_voice || {})}

CUSTOMER RESEARCH:
Awareness Level: ${research.customer_research?.awareness_level || research.awareness_level || '3 (Solution-Aware)'}
Market Sophistication: ${research.customer_research?.market_sophistication || research.market_sophistication || '3'}
Dominant Emotion: ${research.customer_research?.dominant_emotion || research.emotional_hooks?.[0] || 'Unknown'}
Voice of Customer: ${JSON.stringify(research.customer_research?.voice_of_customer || [])}
Pain Points: ${JSON.stringify(research.customer_research?.pain_points_layered || research.target_audiences?.[0]?.pain_points || [])}
Desires: ${JSON.stringify(research.customer_research?.desires_layered || research.target_audiences?.[0]?.desires || [])}
Key Objections: ${JSON.stringify(research.product_research?.key_objections || [])}

${triggerContext}

${stackContext}

${strategySkillContext ? '## SKILL REFERENCE FRAMEWORKS (follow these methodologies for persona development):\n' + strategySkillContext + '\n\n---\n' : ''}

DELIVERABLE: Return JSON with persona architecture and page strategy:
{
  "personas": [
    {
      "persona_name": "string (e.g., 'Exhausted Executive')",
      "demographics": {"age_range": "string", "income": "string", "location": "string", "education": "string"},
      "psychographics": {"values": ["string"], "lifestyle": "string", "aspirations": "string"},
      "awareness_level": "1-5 (Schwartz: 1=Unaware to 5=Most-Aware)",
      "pain_points_layered": [
        {"level": "surface", "point": "string (tangible, immediate)"},
        {"level": "emotional", "point": "string (frustration, shame, anxiety)"},
        {"level": "existential", "point": "string (identity, life meaning)"}
      ],
      "desires_layered": [
        {"level": "surface", "desire": "string (tangible outcome)"},
        {"level": "aspiration", "desire": "string (lifestyle, status)"},
        {"level": "identity", "desire": "string (who they want to be)"}
      ],
      "cognitive_biases": [
        {"bias": "string (e.g., Loss Aversion, Anchoring, etc.)", "application": "string (how we stack it)"},
        {"bias": "string", "application": "string"},
        {"bias": "string", "application": "string"},
        {"bias": "string", "application": "string"},
        {"bias": "string", "application": "string"}
      ],
      "objections": ["string (what prevents purchase?)", ...],
      "decision_style": "string (rational | emotional | social-proof-driven | authority-driven)",
      "language_patterns": ["string (exact VOC phrases)", ...]
    }
  ],

  "strategic_framework": {
    "awareness_calibration": {
      "starting_level": "1-5",
      "target_level": "5 (Most-Aware)",
      "journey": "string (how do we move them from awareness_level → Most-Aware?)"
    },
    "market_sophistication": "1-5",
    "big_idea": "string (the core promise that moves this market)",
    "unique_mechanism": "string (Evaldo's 16-Word: Big Promise + Unique Mechanism + Overwhelming Proof)",
    "mechanism_type": "string (New Discovery | Hidden Cause | Overlooked Factor | Proprietary Process | Counter-Intuitive)",
    "copy_architecture": "string (advertorial | sales_letter | magalog — which structure best moves this persona?)",
    "proof_hierarchy": [
      "Third-party credentialed proof (strongest)",
      "Expert opinion/authority",
      "Demonstration proof (before/after)",
      "Specific customer testimonials with results",
      "General testimonials/social proof",
      "Logical/theoretical proof",
      "Claims/promises (weakest)"
    ]
  },

  "page_strategy": {
    "page_title": "string",
    "meta_description": "string",
    "hero_strategy": {
      "headline_angle": "string (must lead with Big Promise or biggest curiosity gap)",
      "subheadline_angle": "string (support with unique mechanism or strongest proof)",
      "opening_hook": "string (what pattern-interrupts, creates curiosity, or agitates the pain?)",
      "hero_hook_type": "string (curiosity-gap | statistic-lead | story-hook | problem-agitation | secret-reveal)",
      "primary_cta": "string (benefit-driven, specific action)"
    },
    "sections": [
      {
        "section_name": "string (e.g., 'Problem Agitation', 'Unique Mechanism Reveal', 'Proof Stack')",
        "purpose": "string (what does this section accomplish in the journey?)",
        "psychological_triggers": ["trigger name", ...],
        "content_brief": "string (what copy should accomplish here?)",
        "cta": "string or null (soft CTA if applicable)"
      }
    ],
    "psychology_plan": {
      "primary_triggers": ["trigger names and why we use them"],
      "trigger_stack_sequence": "string (the emotional/psychological journey: opening pattern interrupt → problem agitation → unique mechanism reveal → social proof → objection handling → risk reversal → call to action)",
      "awareness_journey": "string (e.g., 'Start at Problem-Aware (level 2) → Move to Solution-Aware (level 3) → Position our mechanism as the ONLY solution (level 4) → Overcome final objections → Purchase (level 5)')",
      "objection_response_pairs": [
        {"objection": "string", "response_strategy": "string (how we handle it in copy)"}
      ]
    },
    "proof_strategy": {
      "testimonial_placement": ["where to place testimonials by section"],
      "data_points": ["specific numbers/stats to include", ...],
      "authority_signals": ["credentials/expert endorsements", ...],
      "proof_stack_order": "string (apply proof hierarchy strongest → weakest)"
    }
  }
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt, 'claude-sonnet-4-5-20250929', 8192);
  const strategyData = parseJSON(text);
  return { data: strategyData, tokensUsed };
}

// STEP 4: COPY - Generate all copy (LEGENDARY-SALES-LETTER Framework + 33 Laws)
async function runCopy(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const strategy = job.strategy_data || {};
  const pageType = job.page_type;
  const tone = job.input_data.tone || 'Professional & Trustworthy';

  const triggerContext = buildTriggerContext(pageType, 'solution_aware', 6);

  // Load the full legendary-sales-letter skill framework + references
  const copySkillContext = getCopySkillContext(pageType);

  const systemPrompt = `You are a legendary master copywriter synthesizing the entire history of direct response brilliance:

**Foundation:** You cannot create desire — only channel it. Market > Offer > Copy.

**Masters You Channel:**
- **Eugene Schwartz**: Awareness levels, sophistication stages, "Breakthrough Advertising"
- **Gary Halbert**: Hooks that steal attention, A-pile urgency, conversational tone
- **David Ogilvy**: Research-driven elegance, headlines that lead with benefit
- **Joe Sugarman**: "Slippery slide" — every sentence compels the next, fascination bullets
- **Gary Bencivenga**: 80/20 proof hierarchy, eliminating objections
- **John Makepeace**: Dimensionalizing — creating vivid before/after pain states
- **Dan Kennedy**: Direct response mechanics, hard closes, specificity
- **Evaldo**: 16-Word Framework (Big Promise + Unique Mechanism + Overwhelming Proof)
- **Gay Talese**: New Journalism (named characters, sensory details, narrative scenes)
- **Robert Cialdini**: 6 Principles of Influence woven into structure
- **Joe Sugarman's 28 Fascination Triggers**: Specific, Hidden, Counterintuitive, Warning, Question, How-To, Mistake, Best/Worst, Simple, Story Tease, Forbidden, Instant, Without, Authority, Discovery, Comparison, Page Reference, Even If, Never, Truth About, Weird Trick, Proof, Fear-Based, Insider, Magic Word

**Your Approach:**
1. **5-Phase Process**: Deep Research → Strategic Foundation → Copy Architecture → Psychological Amplification → Final Polish
2. **Awareness Calibration**: Match your opening to where the market is, then move them to Most-Aware
3. **Proof Hierarchy**: Stack proof from strongest (third-party credentialed) to weakest (claims)
4. **Unique Mechanism**: Position the "why this works" as the core story, not a feature list
5. **Narrative Arc**: Every section has tension → insight → resolution
6. **Emotional + Logical**: Lead with emotion, support with data
7. **Conversational Specificity**: Write like Halbert (conversational) with Ogilvy's research precision

Return valid JSON only.`;

  const userPrompt = `Write legendary-quality copy for a ${pageType} landing page. Apply the 33 Laws, fascination triggers, and master copywriter principles.

STRATEGY & PERSONAS:
${JSON.stringify(strategy, null, 2)}

RESEARCH DATA:
Company: ${research.company_name || 'Unknown'}
Industry: ${research.industry || 'Unknown'}
Value Props: ${JSON.stringify(research.value_propositions || [])}
Unique Mechanism: ${research.product_research?.unique_mechanism || research.unique_differentiators?.[0] || 'N/A'}
Mechanism Type: ${research.product_research?.mechanism_type || 'Proprietary Process'}
Key Claims: ${JSON.stringify(research.key_claims || [])}
Testimonials: ${JSON.stringify(research.product_research?.proof_inventory?.testimonials || research.testimonials || [])}
Products: ${JSON.stringify(research.products_services || [])}
Voice of Customer: ${JSON.stringify(research.customer_research?.voice_of_customer || [])}
Objections: ${JSON.stringify(research.product_research?.key_objections || [])}

BRAND VOICE:
Tone: ${tone}
Keywords: ${JSON.stringify(brand.brand_voice?.keywords || [])}
Guidelines: ${JSON.stringify(brand.brand_voice?.do || [])}

${triggerContext}

## 25 FASCINATION & BULLET FORMULAS TO USE:
1. **Specific Number**: "The 7-minute morning ritual that..."
2. **Hidden/Secret**: "The overlooked mechanism that..."
3. **Counterintuitive**: "Why the opposite of what you've been told..."
4. **Warning**: "The hidden dangers of..."
5. **Question**: "Did you know that...?"
6. **How-To**: "The exact 5-step process to..."
7. **Mistake**: "The #1 mistake people make when..."
8. **Best/Worst**: "The best way to... (or worst to avoid)"
9. **Simple**: "It's simpler than you think..."
10. **Story Tease**: "How [name] went from [state A] to [state B]"
11. **Forbidden/Taboo**: "What they don't want you to know about..."
12. **Instant/Fast**: "In just [timeframe], you'll..."
13. **Without**: "How to get [result] without [effort/cost]"
14. **Authority Quote**: "According to [expert], the real reason..."
15. **Discovery**: "What we discovered after [research]..."
16. **Comparison**: "The difference between [thing A] and [thing B]..."
17. **Page Reference**: "[Benefit] — page 3"
18. **Even If**: "Even if you've tried everything..."
19. **Never**: "Why you should never..."
20. **Truth About**: "The truth about [common belief]..."
21. **Weird Trick**: "The weird [mechanism] that..."
22. **Proof**: "Proven by [study/credential]..."
23. **Fear-Based Tease**: "Before it's too late, you should know..."
24. **Insider**: "What insiders know about..."
25. **Magic Word/Phrase**: "The one thing that changes everything..."

## 33 LAWS OF LEGENDARY COPY (Apply These):
**Research Laws:** Know your market cold. VOC is gold. Proof inventory. Objections mapped.
**Strategic Laws:** Market > Offer > Copy. Big Promise + Unique Mechanism. Proof Hierarchy.
**Structural Laws:** Hook first. Lead hard. Build tension. Reveal mechanism. Stack proof. Handle objections. Soft CTA.
**Writing Laws:** Conversational tone. Specificity (numbers, names, dates). Active voice. Short sentences. Named characters. Sensory details.
**Psychological Laws:** Lead with dominant emotion. Stack triggers. Create curiosity gaps. Use loss aversion. Build status desire.
**Closing Laws:** Risk-reversal guarantee. Urgency (without manipulation). Clear primary CTA. Multiple CTAs for different readiness levels.
**Polish Laws:** Every word earns its place. No clichés. Read aloud. Replace vague with specific.

${copySkillContext ? '## FULL SKILL REFERENCE FRAMEWORKS (use these detailed methodologies):\n' + copySkillContext + '\n\n---\n' : ''}

## STRUCTURE BY PAGE TYPE:

IF ${pageType} === "advertorial" THEN USE 10-SECTION ARCHITECTURE:
1. Editorial Headline (leads with intrigue, not pitch)
2. Byline & Credibility (establishes authority)
3. Editorial Opening (scene-setting, no hard sell)
4. Problem Establishment & Agitation (dimensionalize the pain state)
5. Discovery/Pivot (the moment of realization)
6. Unique Mechanism Reveal (HERE'S WHY this works)
7. Solution Introduction (introducing the product/service as natural result)
8. Proof & Testimonials (third-party credibility, case studies)
9. Objection Handling (FAQ-style, soft)
10. Soft CTA (editorial, benefit-driven, low pressure)

IF ${pageType} === "sales_letter" THEN USE 12-SECTION ARCHITECTURE:
1. Headline (power headline with emotional specificity or unique mechanism)
2. Subheadline/Deck (supports with proof or curiosity)
3. Lead (opens with scene, story, or biggest curiosity gap)
4. Credibility (why you should listen to us)
5. Problem Expansion (agitate and dimensionalize the pain)
6. Unique Mechanism Reveal (THE core insight that changes everything)
7. Solution Build-Up (how the solution works step-by-step)
8. Product Reveal (what it is, specifically)
9. Benefits & Fascinations (transformation bullets using 25 formulas)
10. Proof Stack (strongest to weakest: third-party, expert, demo, testimonials, logic, claims)
11. Offer & Guarantee (price, guarantee, risk reversal)
12. P.S. Section (reinforce biggest benefit or curiosity hook)

Return JSON with all copy sections:
{
  "page_type_confirmed": "advertorial or sales_letter",

  "headlines": {
    "hero_headline": "string — power headline matching awareness level, leading with benefit or intrigue",
    "hero_subheadline": "string — supports with unique mechanism or strongest proof point",
    "section_headlines": [
      "string — Problem: [agitating discovery]",
      "string — Mechanism: [The one thing that...]",
      "string — Solution: [How to get...]",
      "string — Proof: [Proven by...]"
    ]
  },

  "hero": {
    "headline": "string (same as hero_headline for clarity)",
    "subheadline": "string (same as hero_subheadline)",
    "opening_narrative": "string (2-4 sentences — scene, story hook, or curiosity gap. Named character if possible.)",
    "primary_cta_text": "string — benefit-driven, specific, action-oriented",
    "secondary_cta_text": "string or null — softer alternative",
    "social_proof_banner": "string — quick credibility banner (e.g., 'Trusted by 50,000+ Australians', '4.9★ from 2,847 reviews')"
  },

  "body_sections": [
    {
      "section_name": "string (e.g., 'Problem Agitation', 'Discovery Moment', 'Mechanism Reveal', 'Proof Stack', 'Objection Handling')",
      "section_number": "number (1, 2, 3, etc. — for advertorial/sales letter sequencing)",
      "purpose": "string (what this section accomplishes in the buyer journey)",
      "headline": "string — curiosity-driven, benefit-focused, or mechanism-revealing",
      "body_copy": "string (3-5 paragraphs of editorial-quality narrative. Include: specific data, named characters where appropriate, sensory details, story arcs, dimensionalized pain/desire states. NO bullet points — full prose.)",
      "pull_quote": "string or null — the single most powerful stat, insight, or testimony from this section",
      "fascination_bullets": [
        "string — use one of the 25 fascination formulas",
        "string — use another formula"
      ],
      "cta_text": "string or null — soft CTA if applicable"
    }
  ],

  "social_proof": {
    "stats": [
      {"number": "string (specific, with unit)", "label": "string (context)", "source": "string (where this comes from)"},
      {"number": "87%", "label": "of customers report improved [outcome] within [timeframe]", "source": "internal study"}
    ],
    "testimonials": [
      {
        "quote": "string (specific, detailed quote — ideally 2-3 sentences with transformation)",
        "author": "string (First name + Initial, location)",
        "credentials": "string (what makes them credible? e.g., 'Busy parent', 'Healthcare professional')",
        "result": "string (specific, measurable outcome: '[X] improved', 'Went from [A] to [B]')"
      }
    ],
    "case_studies": [
      {
        "title": "string (e.g., 'How Jane Doubled Her Energy in 14 Days')",
        "intro": "string (who was this person, what was their challenge?)",
        "mechanism": "string (what specifically did they do?)",
        "results": "string (measurable outcomes)"
      }
    ]
  },

  "fascination_bullets": [
    "string — use 25 Formulas: Specific Number, Hidden, Counterintuitive, Warning, Question, How-To, Mistake, Best/Worst, Simple, Story, Forbidden, Instant, Without, Authority, Discovery, Comparison, Page Reference, Even If, Never, Truth About, Weird Trick, Proof, Fear, Insider, Magic Word"
  ],

  "objection_handling": [
    {
      "objection": "string (e.g., 'Is it really going to work for me?')",
      "response": "string (3-4 sentences handling the objection with proof, mechanism, or guarantee)"
    }
  ],

  "ctas": {
    "primary": "string — main CTA (benefit + action, e.g., 'Start My 14-Day Free Trial')",
    "secondary": "string — softer alternative (e.g., 'Learn More')",
    "final": "string — closing CTA with urgency (e.g., 'Don\\'t Wait — Claim Your Spot Now')"
  },

  "guarantee": {
    "headline": "string (e.g., 'Your Risk Is Completely Eliminated')",
    "body": "string (3-4 sentences of risk-reversal copy, positioning guarantee as confidence not desperation)",
    "terms": "string (e.g., '60-Day Money-Back Guarantee', 'Full Refund If Not 100% Satisfied')"
  },

  "postscript": {
    "ps_1": "string (reinforce biggest benefit or curiosity hook)",
    "ps_2": "string or null (optional: urgency or scarcity angle)",
    "ps_3": "string or null (optional: strongest proof point or final objection handle)"
  },

  "meta": {
    "title": "string — SEO optimized, includes primary keyword, benefit-driven",
    "description": "string — click-optimized (155 chars max), includes curiosity hook and CTA"
  }
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt, 'claude-sonnet-4-5-20250929', 12000);
  const copyData = parseJSON(text);
  return { data: copyData, tokensUsed };
}

// STEP 5: DESIGN - Generate complete HTML page (full-generation approach)
// Claude generates the entire page HTML with full creative control,
// using our CSS variable system and base styles for consistency.
async function runDesign(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const strategy = job.strategy_data || {};
  const copy = job.copy_data || {};
  const pageType = job.page_type;
  const companyName = research.company_name || 'Our Company';

  // Build the CSS foundation — Claude will embed this in the page
  const brandCSS = generateBrandCSS(brand);
  const baseStyles = getBaseStyles();

  // Determine fonts — use brand fonts if available, otherwise pair editorial fonts
  const headingFont = brand.typography?.heading_font || brand.style_guide?.heading_font || '';
  const bodyFont = brand.typography?.body_font || brand.style_guide?.body_font || '';

  // Choose Google Fonts link based on brand or editorial defaults
  let googleFontsLink;
  if (headingFont && headingFont !== "'Inter', sans-serif") {
    const cleanHeading = headingFont.replace(/'/g, '').split(',')[0].trim();
    const cleanBody = bodyFont ? bodyFont.replace(/'/g, '').split(',')[0].trim() : 'Inter';
    googleFontsLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleanHeading)}:wght@400;500;600;700;800&family=${encodeURIComponent(cleanBody)}:wght@300;400;500;600;700&display=swap" rel="stylesheet">`;
  } else {
    // Default editorial font pairing for high-quality output
    const fontPairings = {
      advertorial: { heading: 'Playfair Display', body: 'Source Sans Pro' },
      'sales-letter': { heading: 'Merriweather', body: 'Open Sans' },
      listicle: { heading: 'DM Sans', body: 'Inter' },
      quiz: { heading: 'Poppins', body: 'Inter' },
      'vip-signup': { heading: 'Cormorant Garamond', body: 'Montserrat' },
      calculator: { heading: 'Space Grotesk', body: 'Inter' },
    };
    const pairing = fontPairings[pageType] || fontPairings.advertorial;
    googleFontsLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(pairing.heading)}:wght@400;500;600;700;800&family=${encodeURIComponent(pairing.body)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">`;
    // Override CSS variables for the font pairing
    brand._designFontOverride = {
      heading: `'${pairing.heading}', Georgia, serif`,
      body: `'${pairing.body}', 'Inter', sans-serif`
    };
  }

  // Collect real images from scraper
  const scrapedImages = research._scrapedImages || [];
  const imageContext = scrapedImages.length > 0
    ? `\n## REAL PRODUCT IMAGES (use these — do NOT use placeholder URLs):\n${scrapedImages.slice(0, 10).map((img, i) => `${i + 1}. ${img.url} (${img.category}${img.alt ? ', alt: ' + img.alt : ''})`).join('\n')}\nIMPORTANT: Use these real image URLs in <img> tags. Do NOT use placeholder.com, via.placeholder, picsum, or similar dummy image services.\n`
    : '\nNote: No product images were scraped. Use background colors, gradients, and icon-based designs instead of placeholder images. Do NOT use placeholder.com or dummy image URLs.\n';

  const systemPrompt = `You are an elite landing page designer and developer who creates stunning, conversion-optimized pages. You generate COMPLETE, production-ready HTML with embedded CSS.

Your pages are indistinguishable from those created by top design agencies. They feature:
- Magazine-quality editorial layouts
- Sophisticated typography with proper font pairing
- Rich visual hierarchy using whitespace, color, and scale
- Interactive elements (FAQ accordions, scroll animations, progress bars)
- Mobile-first responsive design
- Conversion-optimized CTAs and social proof placement

You will receive copy data, strategy, and brand guidelines. Generate the COMPLETE HTML page.

CRITICAL RULES:
1. Return ONLY the complete HTML document — starting with <!DOCTYPE html> and ending with </html>
2. ALL CSS must be embedded in a <style> tag — no external stylesheets except Google Fonts
3. ALL JavaScript must be embedded in <script> tags — no external scripts
4. Use the CSS variable system provided (brand colors, spacing, shadows)
5. Include interactive features: FAQ accordion toggle, scroll animations, reading progress bar
6. Forms must post to "https://runads-platform.vercel.app/api/track" with a hidden input name="page_id" value="{{PAGE_ID}}"
7. NEVER use placeholder image URLs. Either use real scraped images (if provided) or use CSS-based visual treatments
8. Every statistic, testimonial, and claim must come from the copy data — fill every section with real content
9. DO NOT leave any section empty or with placeholder text like "Lorem ipsum" or "{{PLACEHOLDER}}"`;

  const userPrompt = `Create a stunning, conversion-optimized ${pageType} landing page.

## GOOGLE FONTS LINK (include this exactly in <head>):
${googleFontsLink}

## CSS FOUNDATION (embed this in your <style> tag, then add page-specific styles after):
${brandCSS}
${brand._designFontOverride ? `
/* Font Override */
:root {
  --heading-font: ${brand._designFontOverride.heading};
  --body-font: ${brand._designFontOverride.body};
}` : ''}
${baseStyles}

## COMPANY & BRAND
Company: ${companyName}
Industry: ${research.industry || 'Not specified'}
Tone: ${brand.brand_voice?.tone || job.input_data.tone || 'Professional & Trustworthy'}
${brand.brand_voice?.keywords?.length ? `Keywords: ${brand.brand_voice.keywords.join(', ')}` : ''}
${brand.brand_voice?.do?.length ? `Voice Do's: ${brand.brand_voice.do.join('; ')}` : ''}

## COPY DATA (use this content to fill all sections):
${JSON.stringify(copy, null, 2)}

## STRATEGY:
${JSON.stringify(strategy, null, 2)}

## RESEARCH:
Value Propositions: ${JSON.stringify(research.value_propositions || [])}
Testimonials: ${JSON.stringify(research.product_research?.proof_inventory?.testimonials || research.testimonials || [])}
Products: ${JSON.stringify(research.products_services || [])}
Key Claims: ${JSON.stringify(research.key_claims || [])}
${imageContext}

## PAGE TYPE: ${pageType.toUpperCase()}
${getPageTypeDesignInstructions(pageType)}

## DESIGN REQUIREMENTS:

### Structure for ${pageType === 'advertorial' ? 'ADVERTORIAL' : pageType.toUpperCase()}:
${pageType === 'advertorial' ? `
1. Reading progress bar (fixed top, accent color, updates on scroll)
2. Sticky navigation with company name + CTA button
3. Hero section: category badge, editorial headline, subheadline, author byline with date
4. Hero image (use real product image if available, otherwise use a styled gradient/pattern background)
5. Opening narrative with drop cap on first letter
6. Statistics bar (3 key metrics with large numbers)
7. Problem section with editorial body, pullquotes, highlight boxes
8. Mid-article CTA
9. Solution section on dark background
10. Science/mechanism section with highlight boxes and data callouts
11. Product showcase (dark card with features list, CTA, guarantee)
12. Testimonials grid (3 cards with stars, quotes, author names, verified badges)
13. FAQ accordion (clickable questions that expand/collapse)
14. Final CTA section
15. Footer with disclaimer/disclosure` : `
Follow standard ${pageType} layout conventions with proper section hierarchy.`}

### Visual Quality Standards:
- Use the heading font for h1/h2/h3 and body font for paragraphs
- Proper line height (1.7-1.8 for body, 1.1-1.2 for headings)
- Section padding: 80-100px vertical on desktop, 48-60px on mobile
- Max content width: 800px for editorial content, 1200px for full-width sections
- Use CSS classes from the base styles: .section, .section-dark, .section-alt, .container, .container-narrow, .cta-btn, .cta-btn-dark, .testimonial-card, .stat-item, .faq-item, .highlight-box, .pullquote, .badge, .article-body, .drop-cap, etc.
- Include hover effects on cards (translateY(-4px) + shadow)
- Scroll animations: elements fade in from below as they enter viewport
- FAQ items toggle open/close on click

### Critical Quality Checks:
- Every <img> must have a descriptive alt attribute
- Include viewport meta tag
- Include Open Graph meta tags
- All text must be real content from the copy data — NO placeholders
- Statistics must have actual numbers (from copy data social_proof.stats)
- Testimonials must have real quotes and names (from copy data social_proof.testimonials)
- CTA buttons must use text from copy data ctas object

Return the COMPLETE HTML document. Nothing else.`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt, 'claude-sonnet-4-5-20250929', 16000);

  // Clean up the response — extract just the HTML
  let html = text;
  // Remove markdown code blocks if present
  html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/i, '');
  // Ensure it starts with DOCTYPE
  if (!html.trim().startsWith('<!DOCTYPE') && !html.trim().startsWith('<html')) {
    const docIdx = html.indexOf('<!DOCTYPE');
    const htmlIdx = html.indexOf('<html');
    const startIdx = docIdx >= 0 ? docIdx : htmlIdx;
    if (startIdx > 0) html = html.substring(startIdx);
  }
  // Ensure it ends with </html>
  const htmlEndIdx = html.lastIndexOf('</html>');
  if (htmlEndIdx > 0) html = html.substring(0, htmlEndIdx + 7);

  return { data: { html, template_type: pageType, design_system_version: '4.0' }, tokensUsed };
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
Headlines: ${JSON.stringify(copy.headlines || {})}
Body Sections: ${JSON.stringify(copy.body_sections || [])}
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

  // Inject tracking script + admin editor widget
  const trackingScript = generateTrackingScript(slug);
  const adminWidget = generateAdminWidgetScript(slug);
  const injectedScripts = trackingScript + (adminWidget || '');
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${injectedScripts}\n</body>`);
  } else {
    html += injectedScripts;
  }

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
// ============================================================
function generateAdminWidgetScript(slug) {
  const adminKey = process.env.ADMIN_EDIT_KEY || '';
  if (!adminKey) return ''; // Don't inject widget if no admin key configured
  return `
<!-- RunAds Admin Editor Widget -->
<script>
(function(){
  var SLUG='${slug}',KEY='${adminKey}',API='https://runads-platform.vercel.app/api/chat';
  var panel=null,open=false;
  function createPanel(){
    if(panel)return;
    var d=document.createElement('div');
    d.id='__ra_editor';
    d.innerHTML=
      '<div style="position:fixed;bottom:0;right:20px;width:380px;height:480px;background:#1a1a2e;border-radius:12px 12px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,0.3);display:flex;flex-direction:column;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;">'+
        '<div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.1);">'+
          '<span style="font-weight:600;font-size:14px;">\\u2728 RunAds Editor</span>'+
          '<button id="__ra_close" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;padding:0 4px;">\\u2715</button>'+
        '</div>'+
        '<div id="__ra_msgs" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;">'+
          '<div style="background:rgba(255,255,255,0.08);padding:10px 12px;border-radius:8px;font-size:13px;color:#d1d5db;line-height:1.5;">Hi! Describe any changes you want to make to this page. For example:<br><br>\\u2022 \\"Change the headline to....\\"<br>\\u2022 \\"Make the CTA button red\\"<br>\\u2022 \\"Add a money-back guarantee badge\\"</div>'+
        '</div>'+
        '<div style="padding:12px;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:8px;">'+
          '<input id="__ra_input" type="text" placeholder="Describe your change..." style="flex:1;padding:10px 12px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;background:rgba(255,255,255,0.06);color:#fff;outline:none;">'+
          '<button id="__ra_send" style="padding:10px 16px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;">Send</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(d);
    panel=d;
    document.getElementById('__ra_close').onclick=toggle;
    document.getElementById('__ra_send').onclick=send;
    document.getElementById('__ra_input').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
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
