// RunAds - 7-Step Generation Pipeline API
// Routes: POST /api/pipeline (dispatches based on action parameter)
// Actions: start, status, research, brand, strategy, copy, design, factcheck, assembly

export const config = { maxDuration: 300 };

import { createJob, getJob, startJobStep, updateJobStep, failJob, getProgress, getStepLabel, PIPELINE_STEPS } from '../lib/job-manager.js';
import { scrapeWebsite, extractBrandAssets, extractImages, fetchPage } from '../lib/website-scraper.js';
import { buildTriggerContext, getStrategyContext, TRIGGERS } from '../lib/psychological-triggers.js';
import { getPageTemplate, generateBrandCSS, populateTemplate, getComponent, getPageTypeDesignInstructions } from '../lib/design-system.js';
import { savePage as savePageToStorage, getClient, updateClient } from '../lib/storage.js';
import { deployPage as deployToGitHubPages, getPagesUrl } from '../lib/github.js';

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
async function runResearch(job) {
  const url = job.input_data.url || job.input_data.productUrl;
  const productName = job.input_data.productName;

  let websiteData = {};
  if (url) {
    try {
      websiteData = await scrapeWebsite(url);
    } catch (e) {
      websiteData = { error: e.message, url };
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

  const userPrompt = `Conduct PhD-level market research on this business. Extract competitive intelligence, customer insights, market dynamics, and proof elements.

${url ? 'Website URL: ' + url : ''}
${productName ? '\nProduct/Service: ' + productName : ''}
${websiteData.meta ? '\nPage Title: ' + websiteData.meta.title + '\nMeta Description: ' + websiteData.meta.description : ''}
${websiteData.text ? '\nWebsite Content (excerpt):\n' + websiteData.text.substring(0, 12000) : ''}
${websiteData.products?.length ? '\nProducts found: ' + websiteData.products.map(p => p.name).join(', ') : ''}
${websiteData.testimonials?.length ? '\nTestimonials found: ' + websiteData.testimonials.length : ''}

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

  return { data: researchData, tokensUsed };
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

  const systemPrompt = `You are an expert brand designer and visual identity specialist. Extract and define a complete brand guide from the provided information. Return valid JSON only.`;

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

// STEP 5: DESIGN - Build complete HTML using Design System templates
async function runDesign(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const strategy = job.strategy_data || {};
  const copy = job.copy_data || {};
  const pageType = job.page_type;

  // Step 1: Get HTML skeleton template from design system
  const template = getPageTemplate(pageType, brand);

  // Step 2: Build component sections (stats, testimonials, CTAs, FAQs)
  const statsSection = getComponent('stat-bar', { stats: copy.social_proof?.stats });
  const testimonialsSection = getComponent('testimonial-grid', {
    testimonials: copy.social_proof?.testimonials?.map(t => ({
      quote: t.quote, author: t.author, role: t.result || '', stars: 5
    })),
    headline: 'What Our Customers Say'
  });
  const midCtaSection = getComponent('cta-block', {
    headline: copy.ctas?.secondary || 'Ready to Get Started?',
    subheadline: copy.hero?.above_fold_text || '',
    cta_text: copy.ctas?.primary || 'Get Started',
    dark: false
  });
  const finalCtaSection = getComponent('cta-block', {
    headline: copy.ctas?.final || 'Don\'t Wait - Start Today',
    subheadline: '',
    cta_text: copy.ctas?.primary || 'Get Started Now',
    dark: true
  });
  const faqSection = getComponent('faq-accordion', {
    items: (copy.body_sections || []).filter(s =>
      s.section_name?.toLowerCase().includes('faq') || s.section_name?.toLowerCase().includes('question')
    ).map(s => ({ question: s.headline, answer: s.body_copy })),
    headline: 'Frequently Asked Questions'
  });
  const benefitsSection = getComponent('benefits-list', {
    benefits: (copy.body_sections || []).filter(s =>
      s.section_name?.toLowerCase().includes('benefit') || s.section_name?.toLowerCase().includes('feature')
    ).map(s => ({ title: s.headline, desc: s.body_copy?.substring(0, 200) })),
    headline: strategy.sections?.find(s => s.section_name?.toLowerCase().includes('benefit'))?.content_brief || 'Why Choose Us'
  });

  // Step 3: Ask Claude to populate the template with content (NOT generate structure)
  const companyName = research.company_name || 'Our Company';

  const systemPrompt = `You are an elite landing page content specialist creating Unicorn Marketers-quality pages. You will receive an HTML template with {{PLACEHOLDER}} slots. Your job is to fill those slots with compelling, editorial-quality content using the copy data provided.

KEY QUALITY GUIDELINES:
- Write in a professional editorial tone — this should read like a high-end magazine article, NOT like an ad
- Use rich HTML components in body sections: pullquotes (<div class="pullquote"><p>quote</p><cite>— Source</cite></div>), highlight boxes (<div class="highlight-box"><p>key insight</p></div>), and quote blocks (<div class="quote-block"><p class="quote-text">"quote"</p><p class="quote-author">— Name</p></div>)
- Include specific, data-driven statistics with real numbers (not generic claims)
- HERO_BODY should start with a compelling hook — the template uses a drop cap on the first letter
- Every section should have 3-5 paragraphs of substantive, story-driven copy
- Testimonials should include first name, last initial, and a specific result
- Never leave any placeholder unfilled — generate credible content for every slot

Return a JSON object mapping each placeholder name to its HTML content. Only return valid JSON.`;

  const userPrompt = `Fill the content slots in this ${pageType} page template.

TEMPLATE SLOTS TO FILL:
${template.slots.join(', ')}

COPY DATA:
${JSON.stringify(copy, null, 2)}

STRATEGY:
${JSON.stringify(strategy, null, 2)}

BRAND:
Company: ${companyName}
Industry: ${research.industry || ''}
Tone: ${brand.brand_voice?.tone || job.input_data.tone || 'Professional'}

${(research._scrapedImages || []).length > 0 ? `AVAILABLE PRODUCT IMAGES FROM CLIENT WEBSITE (use these instead of placeholders):
${(research._scrapedImages || []).slice(0, 8).map((img, i) => `${i + 1}. ${img.url} (${img.category}${img.alt ? ', alt: ' + img.alt : ''})`).join('\n')}
IMPORTANT: Use these real image URLs in <img> tags wherever an image is needed. Do NOT use placeholder.com or similar dummy images.` : ''}

${getPageTypeDesignInstructions(pageType)}

Return a JSON object with ALL placeholders filled. For body/section placeholders, use <p> tags for paragraphs. For list items, use appropriate HTML. Example:
{
  "META_TITLE": "Page Title Here",
  "META_DESCRIPTION": "Description here",
  "COMPANY_NAME": "${companyName}",
  "HEADLINE": "Your Compelling Headline",
  "SUBHEADLINE": "Supporting text here",
  "BADGE_TEXT": "SPECIAL REPORT",
  "NAV_CTA": "Get Started",
  "CTA_TEXT": "Start Now",
  "HERO_BODY": "<p>Opening paragraph...</p><p>Second paragraph...</p>",
  ...etc for ALL slots
}

IMPORTANT: Every {{PLACEHOLDER}} in the template must have a corresponding key in your JSON response. Use the copy data to fill each slot with persuasive, on-brand content. For sections not directly covered by copy data, generate appropriate content based on the strategy.`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt, 'claude-sonnet-4-5-20250929', 8192);
  const contentMap = parseJSON(text);

  // Step 4: Populate the template with Claude's content
  let html = template.html;

  // Build product showcase for advertorial pages
  const productSection = pageType === 'advertorial' ? getComponent('product-showcase', {
    label: research.industry || 'Featured Product',
    headline: research.company_name || copy.meta?.title || 'Our Product',
    description: copy.hero?.above_fold_text || '',
    features: (research.value_propositions || []).slice(0, 4),
    cta_text: copy.ctas?.primary || 'Try It Now',
    guarantee_text: '60-Day Money Back Guarantee'
  }) : '';

  // Add pre-built component sections
  const componentMap = {
    STATS_SECTION: statsSection,
    MID_CTA_SECTION: midCtaSection,
    FINAL_CTA_SECTION: finalCtaSection,
    TESTIMONIALS_SECTION: testimonialsSection,
    FAQ_SECTION: faqSection,
    BENEFITS_SECTION: benefitsSection,
    RESULTS_SECTION: statsSection,
    PRODUCT_SECTION: productSection,
  };

  // First inject components
  html = populateTemplate(html, componentMap);
  // Then inject Claude-generated content
  html = populateTemplate(html, contentMap);
  // Fill any remaining placeholders with empty strings
  html = html.replace(/\{\{[A-Z_]+\}\}/g, '');

  return { data: { html, template_type: pageType, design_system_version: '3.0' }, tokensUsed };
}

// STEP 6: FACTCHECK - Verify claims
async function runFactcheck(job) {
  const research = job.research_data || {};
  const copy = job.copy_data || {};
  const html = job.design_data?.html || '';

  const systemPrompt = `You are a rigorous fact-checker and compliance reviewer. Analyze the landing page copy for accuracy, verify claims against source data, and flag any potentially misleading statements. Return valid JSON only.`;

  const userPrompt = `Fact-check this landing page content.

ORIGINAL RESEARCH DATA:
Key Claims: ${JSON.stringify(research.key_claims || [])}
Testimonials: ${JSON.stringify(research.testimonials || [])}
Products: ${JSON.stringify(research.products_services || [])}

COPY TO VERIFY:
Headlines: ${JSON.stringify(copy.headlines || {})}
Body Sections: ${JSON.stringify(copy.body_sections || [])}
Social Proof Stats: ${JSON.stringify(copy.social_proof?.stats || [])}

Return JSON:
{
  "verified_claims": [{"claim": "string", "status": "verified|unverified|needs_source", "source": "string or null", "note": "string"}],
  "flagged_issues": [{"issue": "string", "severity": "low|medium|high", "suggestion": "string"}],
  "compliance_notes": ["string"],
  "overall_score": 0-100,
  "recommendation": "approve|revise|reject"
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt, 'claude-haiku-4-5-20251001', 4096);
  const factcheckData = parseJSON(text);
  return { data: factcheckData, tokensUsed };
}

// STEP 7: ASSEMBLY - Final QA and page creation
async function runAssembly(job) {
  let html = job.design_data?.html || '';
  const research = job.research_data || {};
  const copy = job.copy_data || {};
  const factcheck = job.factcheck_data || {};
  const pageType = job.page_type;
  const companyName = research.company_name || 'Landing Page';

  // ── Inject real product images from website scrape ──
  const scrapedImages = research._scrapedImages || [];
  if (scrapedImages.length > 0) {
    // Categorize available images
    const productImages = scrapedImages.filter(i => i.category === 'product');
    const heroImages = scrapedImages.filter(i => i.category === 'hero');
    const galleryImages = scrapedImages.filter(i => i.category === 'gallery');
    const featureImages = scrapedImages.filter(i => i.category === 'feature');
    const allUsable = [...productImages, ...heroImages, ...galleryImages, ...featureImages, ...scrapedImages.filter(i => i.category === 'general')];

    // Replace placeholder image patterns with real images
    // Common patterns: placeholder.com, via.placeholder, placehold.it, unsplash source, picsum
    const placeholderPattern = /https?:\/\/(via\.placeholder\.com|placehold\.it|placeholder\.com|source\.unsplash\.com|picsum\.photos|dummyimage\.com)[^\s"')]+/gi;
    let imgIndex = 0;
    html = html.replace(placeholderPattern, () => {
      if (imgIndex < allUsable.length) {
        return allUsable[imgIndex++].url;
      }
      return allUsable.length > 0 ? allUsable[0].url : '';
    });

    // Also replace data-placeholder-image attributes (custom pattern for our templates)
    html = html.replace(/data-placeholder-image="([^"]*)"/gi, (match, type) => {
      let img;
      if (type === 'product' && productImages.length > 0) img = productImages[0];
      else if (type === 'hero' && heroImages.length > 0) img = heroImages[0];
      else if (allUsable.length > 0) img = allUsable[0];
      return img ? `src="${img.url}" alt="${img.alt || companyName}"` : match;
    });

    // Replace generic "product-image" class img src with product images
    const productImgPattern = /(<img[^>]*class="[^"]*product[^"]*"[^>]*src=")([^"]+)(")/gi;
    let pIdx = 0;
    html = html.replace(productImgPattern, (match, before, src, after) => {
      if (pIdx < productImages.length) {
        return before + productImages[pIdx++].url + after;
      } else if (allUsable.length > 0) {
        return before + allUsable[0].url + after;
      }
      return match;
    });

    // Inject an image gallery section if we have 3+ product/gallery images and there's a {{PRODUCT_IMAGES}} slot
    if (allUsable.length >= 3 && html.includes('{{PRODUCT_IMAGES}}')) {
      const galleryHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;padding:24px 0;">
        ${allUsable.slice(0, 6).map(img => `<img src="${img.url}" alt="${img.alt || companyName}" style="width:100%;border-radius:12px;object-fit:cover;aspect-ratio:1;" loading="lazy">`).join('\n        ')}
      </div>`;
      html = html.replace('{{PRODUCT_IMAGES}}', galleryHtml);
    }
    html = html.replace('{{PRODUCT_IMAGES}}', '');
  }

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
