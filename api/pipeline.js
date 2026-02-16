// RunAds - 7-Step Generation Pipeline API
// Routes: POST /api/pipeline (dispatches based on action parameter)
// Actions: start, status, research, brand, strategy, copy, design, factcheck, assembly

export const config = { maxDuration: 300 };

import { createJob, getJob, startJobStep, updateJobStep, failJob, getProgress, getStepLabel, PIPELINE_STEPS } from '../lib/job-manager.js';
import { scrapeWebsite, extractBrandAssets } from '../lib/website-scraper.js';
import { buildTriggerContext, getStrategyContext, TRIGGERS } from '../lib/psychological-triggers.js';
import { getPageTemplate, generateBrandCSS, populateTemplate, getComponent, getPageTypeDesignInstructions } from '../lib/design-system.js';
import { savePage as savePageToStorage, getClient, updateClient } from '../lib/storage.js';

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

// STEP 1: RESEARCH - Deep website analysis
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

  const systemPrompt = `You are a world-class market researcher and business analyst. Analyze the provided website/product information and extract comprehensive business intelligence. Return valid JSON only.`;

  const userPrompt = `Analyze this business and extract detailed research data.

${url ? `Website URL: ${url}` : ''}
${productName ? `Product/Service: ${productName}` : ''}
${websiteData.meta ? `Page Title: ${websiteData.meta.title}\nMeta Description: ${websiteData.meta.description}` : ''}
${websiteData.text ? `\nWebsite Content (excerpt):\n${websiteData.text.substring(0, 8000)}` : ''}
${websiteData.products?.length ? `\nProducts found: ${websiteData.products.map(p => p.name).join(', ')}` : ''}
${websiteData.testimonials?.length ? `\nTestimonials found: ${websiteData.testimonials.length}` : ''}

Return a JSON object with these fields:
{
  "company_name": "string",
  "industry": "string",
  "tagline": "string",
  "value_propositions": ["string", ...],
  "unique_differentiators": ["string", ...],
  "products_services": [{"name": "string", "description": "string", "price": "string or null"}],
  "target_audiences": [{"name": "string", "demographics": "string", "pain_points": ["string"], "desires": ["string"]}],
  "testimonials": [{"quote": "string", "author": "string"}],
  "brand_voice": {"tone": "string", "keywords": ["string"]},
  "competitors": ["string"],
  "key_claims": ["string"],
  "emotional_hooks": ["string"]
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt);
  const researchData = parseJSON(text);
  researchData._websiteMeta = websiteData.meta || {};
  researchData._scrapedColors = websiteData.colors || [];
  researchData._scrapedFonts = websiteData.fonts || [];

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

// STEP 3: STRATEGY - Page outline and messaging
async function runStrategy(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const pageType = job.page_type;
  const audience = job.input_data.audience || job.input_data.targetAudience || '';
  const tone = job.input_data.tone || 'Professional & Trustworthy';

  // Get relevant psychological triggers
  const triggerContext = buildTriggerContext(pageType, 'solution_aware', 8);
  const stackContext = getStrategyContext(pageType);

  const systemPrompt = `You are a world-class conversion strategist and direct response marketing expert. You combine the principles of Eugene Schwartz (awareness levels), Gary Halbert (hooks), Robert Cialdini (influence), and Oren Klaff (pitch framing). Create a detailed page strategy. Return valid JSON only.`;

  const userPrompt = `Create a comprehensive page strategy for a ${pageType} page.

BUSINESS INFO:
Company: ${research.company_name || 'Unknown'}
Industry: ${research.industry || 'Unknown'}
Value Props: ${JSON.stringify(research.value_propositions || [])}
Target Audience: ${audience || JSON.stringify(research.target_audiences?.[0] || {})}
Tone: ${tone}
Brand Voice: ${JSON.stringify(brand.brand_voice || research.brand_voice || {})}

${triggerContext}

${stackContext}

DELIVERABLE: Create a detailed strategy for a ${pageType} page. Return JSON:
{
  "page_title": "string",
  "meta_description": "string",
  "hero_strategy": {
    "headline_angle": "string",
    "subheadline_angle": "string",
    "hero_hook_type": "string (e.g., curiosity-gap, statistic-lead, etc.)",
    "primary_cta": "string"
  },
  "sections": [
    {
      "section_name": "string",
      "purpose": "string",
      "psychological_triggers": ["trigger name", ...],
      "content_brief": "string describing what this section should contain",
      "cta": "string or null"
    }
  ],
  "psychology_plan": {
    "primary_triggers": ["trigger ids and names"],
    "stacking_sequence": "string describing the emotional journey",
    "awareness_journey": "string (what awareness level we start at → where we take them)",
    "objection_handling": ["objection → response pairs"]
  },
  "social_proof_plan": {
    "testimonial_placement": ["where to place testimonials"],
    "data_points": ["specific stats/numbers to include"],
    "authority_signals": ["credentials/endorsements to feature"]
  }
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt);
  const strategyData = parseJSON(text);
  return { data: strategyData, tokensUsed };
}

// STEP 4: COPY - Generate all copy
async function runCopy(job) {
  const research = job.research_data || {};
  const brand = job.brand_data || {};
  const strategy = job.strategy_data || {};
  const pageType = job.page_type;
  const tone = job.input_data.tone || 'Professional & Trustworthy';

  const triggerContext = buildTriggerContext(pageType, 'solution_aware', 6);

  const systemPrompt = `You are a master editorial copywriter and narrative architect. You combine:
- **Gary Halbert's** direct response hooks and "A-pile" urgency
- **Eugene Schwartz's** awareness-level sophistication and "Breakthrough Advertising" frameworks
- **David Ogilvy's** research-driven elegance and factual specificity
- **Joe Sugarman's** "slippery slide" — every line compels the next
- **Gay Talese's** New Journalism narrative immersion (named characters, sensory details, scenes)

Your copy doesn't read like marketing. It reads like a compelling editorial piece that happens to lead to a product. You use:
- **Named characters** with specific, relatable details (not "a busy mom" but "Lisa, a 42-year-old architect who hasn't slept through the night in 3 years")
- **Sensory language** that puts the reader in a scene (sounds, textures, emotions)
- **Data woven into narrative** (not just "clinically proven" but "In a 2024 randomized trial at the University of Melbourne, participants experienced a 47% improvement in deep sleep cycles within 14 days")
- **Drop caps** for section openers to create editorial gravitas
- **Pull quotes** that highlight the most compelling statistics or testimonials
- **Progressive disclosure** — revealing information in a way that builds curiosity and momentum

Return valid JSON only.`;

  const userPrompt = `Write all copy for a ${pageType} landing page based on this strategy. The copy should be editorial-quality narrative, not generic marketing.

STRATEGY:
${JSON.stringify(strategy, null, 2)}

BRAND VOICE:
Tone: ${tone}
Keywords: ${JSON.stringify(brand.brand_voice?.keywords || [])}
Guidelines: ${JSON.stringify(brand.brand_voice?.do || [])}

BUSINESS:
Company: ${research.company_name || 'Unknown'}
Value Props: ${JSON.stringify(research.value_propositions || [])}
Key Claims: ${JSON.stringify(research.key_claims || [])}
Testimonials: ${JSON.stringify(research.testimonials || [])}
Products: ${JSON.stringify(research.products || [])}
Differentiators: ${JSON.stringify(research.differentiators || [])}

${triggerContext}

## EDITORIAL WRITING PRINCIPLES
1. **Open with a scene, not a claim.** "It was 3 AM when Lisa's phone buzzed..." not "Introducing the revolutionary..."
2. **Create a named protagonist** whose journey mirrors the target audience's experience
3. **Cite specific data** — real numbers, named studies, expert quotes. Not "experts say" but "Dr. Sarah Chen, a sleep researcher at Monash University, found that..."
4. **Use the Unique Mechanism reveal** — build tension about WHY existing solutions fail, then reveal the specific mechanism that makes this different
5. **Each section should have a narrative arc** — tension, insight, resolution
6. **Write body copy in full paragraphs** (3-5 sentences each), not bullet points
7. **Include "fascination bullets"** — specific, curiosity-driven benefit statements (e.g., "The 90-second ritual that reverses years of chronic fatigue — page 7")
8. **End with a guarantee that eliminates risk** — frame it as confidence, not desperation

Return JSON with all copy variations:
{
  "headlines": {
    "hero_headline": "string — power headline with emotional specificity",
    "hero_subheadline": "string — supports with mechanism or proof",
    "section_headlines": ["string — each should create curiosity"]
  },
  "hero": {
    "above_fold_text": "string — opening narrative hook (2-3 sentences)",
    "primary_cta_text": "string — benefit-driven CTA",
    "secondary_cta_text": "string or null",
    "social_proof_banner": "string — quick credibility (e.g., 'Trusted by 50,000+ Australians')"
  },
  "body_sections": [
    {
      "section_name": "string",
      "headline": "string — curiosity-driven section headline",
      "body_copy": "string (full editorial-quality copy for this section — 3-5 paragraphs minimum, with narrative flow, named characters where appropriate, and specific data)",
      "pull_quote": "string or null — the most powerful quote/stat from this section",
      "cta_text": "string or null"
    }
  ],
  "social_proof": {
    "stats": [{"number": "string (specific)", "label": "string (with context)"}],
    "testimonials": [{"quote": "string (specific, detailed)", "author": "string (with credentials/location)", "result": "string (measurable outcome)"}]
  },
  "fascination_bullets": [
    "string — specific, curiosity-driven benefit statements"
  ],
  "ctas": {
    "primary": "string — main CTA (benefit + action)",
    "secondary": "string — softer alternative",
    "final": "string — urgency-driven closing CTA"
  },
  "guarantee": {
    "headline": "string",
    "body": "string — risk-reversal copy"
  },
  "meta": {
    "title": "string — SEO optimized",
    "description": "string — click-optimized meta description"
  }
}`;

  const { text, tokensUsed } = await callClaude(systemPrompt, userPrompt);
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

  return {
    data: {
      html,
      pageId,
      pageName,
      slug,
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
