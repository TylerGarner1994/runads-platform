// RunAds - 7-Step Generation Pipeline API
// Routes: POST /api/pipeline (dispatches based on action parameter)
// Actions: start, status, research, brand, strategy, copy, design, factcheck, assembly

export const config = { maxDuration: 300 };

import { createJob, getJob, startJobStep, updateJobStep, failJob, getProgress, getStepLabel, PIPELINE_STEPS } from '../lib/job-manager.js';
import { scrapeWebsite, extractBrandAssets } from '../lib/website-scraper.js';
import { buildTriggerContext, getStrategyContext, TRIGGERS } from '../lib/psychological-triggers.js';
import { getPageTemplate, generateBrandCSS, populateTemplate, getComponent } from '../lib/design-system.js';

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

  const systemPrompt = `You are a master copywriter combining the skills of Gary Halbert (direct response hooks), Joanna Wiebe (conversion copy), David Ogilvy (persuasive elegance), and Eugene Schwartz (breakthrough advertising). Write compelling copy that sells. Return valid JSON only.`;

  const userPrompt = `Write all copy for a ${pageType} landing page based on this strategy.

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

${triggerContext}

Return JSON with all copy variations:
{
  "headlines": {
    "hero_headline": "string",
    "hero_subheadline": "string",
    "section_headlines": ["string", ...]
  },
  "hero": {
    "above_fold_text": "string",
    "primary_cta_text": "string",
    "secondary_cta_text": "string or null"
  },
  "body_sections": [
    {
      "section_name": "string",
      "headline": "string",
      "body_copy": "string (full copy for this section)",
      "cta_text": "string or null"
    }
  ],
  "social_proof": {
    "stats": [{"number": "string", "label": "string"}],
    "testimonials": [{"quote": "string", "author": "string", "result": "string"}]
  },
  "ctas": {
    "primary": "string",
    "secondary": "string",
    "final": "string"
  },
  "meta": {
    "title": "string",
    "description": "string"
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

  const systemPrompt = `You are an elite landing page content specialist. You will receive an HTML template with {{PLACEHOLDER}} slots. Your job is to fill those slots with compelling content using the copy data provided. Return a JSON object mapping each placeholder name to its HTML content. Only return valid JSON.`;

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

  // Add pre-built component sections
  const componentMap = {
    STATS_SECTION: statsSection,
    MID_CTA_SECTION: midCtaSection,
    FINAL_CTA_SECTION: finalCtaSection,
    TESTIMONIALS_SECTION: testimonialsSection,
    FAQ_SECTION: faqSection,
    BENEFITS_SECTION: benefitsSection,
    RESULTS_SECTION: statsSection, // Reuse stats for results display
  };

  // First inject components
  html = populateTemplate(html, componentMap);
  // Then inject Claude-generated content
  html = populateTemplate(html, contentMap);
  // Fill any remaining placeholders with empty strings
  html = html.replace(/\{\{[A-Z_]+\}\}/g, '');

  return { data: { html, template_type: pageType, design_system_version: '2.0' }, tokensUsed };
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

  // Inject tracking script
  const trackingScript = generateTrackingScript(slug);
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${trackingScript}\n</body>`);
  } else {
    html += trackingScript;
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
    url: slug,
    generation_job_id: job.id,
    factcheck_score: factcheck.overall_score || null
  };

  // Save to GitHub pages.json
  try {
    const { data: pages, sha } = await getGitHubFile('data/pages.json');
    const pageList = pages || [];
    pageList.push(page);
    await saveGitHubFile('data/pages.json', pageList, sha, `Add page: ${pageName}`);
  } catch (e) {
    console.error('Failed to save page to GitHub:', e.message);
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
// PAGE TYPE DESIGN INSTRUCTIONS
// ============================================================
function getPageTypeDesignInstructions(pageType) {
  const instructions = {
    advertorial: `
PAGE TYPE: ADVERTORIAL
Design as a long-form editorial/native advertising piece:
- Header with "Consumer Investigation", "Health Report", or "Special Report" tag
- Author byline with date and reading time
- Newspaper/editorial typography style
- Progress reading bar at top
- Body formatted like a news article with embedded images
- Pull quotes and highlight boxes for key statistics
- Multiple "Continue Reading" and CTA sections
- FAQ accordion at bottom
- Footer with disclosure text`,

    listicle: `
PAGE TYPE: LISTICLE
Design as a numbered list format:
- Bold hero section with large typography
- "SPONSORED" or "ADVERTISEMENT" badge
- Numbered list items (5-10) with alternating layouts
- Each item has: number, headline, description, supporting image area
- Stat cards between sections
- Comparison table (vs competitors or vs doing nothing)
- Strong CTAs after every 2-3 items
- Social proof bar (customer count, rating, trust badges)`,

    quiz: `
PAGE TYPE: QUIZ FUNNEL
Design as an interactive multi-step quiz:
- Welcome/hero section with quiz CTA button
- Social proof stats bar (e.g., "23,847 people have taken this quiz")
- Testimonials grid
- Multi-step quiz with progress indicator
- 5-8 quiz questions with multiple choice answers
- Interstitial stat/info cards between questions
- Results page with personalized recommendation
- Lead capture form before showing results
- CTA to recommended product/service`,

    'vip-signup': `
PAGE TYPE: VIP SIGNUP
Design as an exclusive invitation page:
- Exclusive/VIP invitation badge or seal
- Hero with product imagery and exclusivity messaging
- Lead capture form (name + email, minimal friction)
- Member count social proof ("Join 2,847 members")
- Benefits list with checkmarks
- Scarcity messaging (limited spots)
- Countdown timer (optional)
- Trust badges and guarantees
- Clean, premium design aesthetic`,

    calculator: `
PAGE TYPE: CALCULATOR
Design as an interactive savings/ROI calculator:
- Bold, attention-grabbing hero headline
- Interactive calculator with sliders and input fields
- Real-time results display as user adjusts inputs
- Before/after or current-vs-improved comparison
- Visual charts or graphs showing potential savings
- CTA to get full results or personalized plan
- Social proof and testimonials below calculator
- Detailed breakdown section
- FAQ section`,

    'sales-letter': `
PAGE TYPE: SALES LETTER
Design as a long-form direct response sales letter:
- Minimal design focused purely on readability
- Serif font (Merriweather/Georgia) for body, sans-serif for headings
- Single column, max 680px width, left-aligned text
- 60-70 characters per line for optimal reading
- Section breaks using spacing/lines (no colored boxes)
- Multiple CTAs placed every 300-400 words of copy
- Underline emphasis for key phrases (CSS text-decoration, not highlighting)
- P.S. and P.P.S. sections at the end
- Signature block with credentials
- No images except possibly one hero
- Paper-like color scheme (off-white #fffdf8 background)
- Guarantee box (green border, light green background)
- Footer with disclosure text
- Every paragraph should be short (1-3 sentences max)`,

    'sms-tips': `
PAGE TYPE: SMS TIPS LEAD MAGNET
Design as an SMS marketing series landing page:
- Urgency banner at top (enrollment closing/limited spots)
- Split-screen hero: text left, phone mockup right
- Phone mockup shows actual SMS message previews (bubble style)
- Day-by-day preview cards showing what they'll get (grid of 6-8 days)
- Benefits list with checkmarks
- Subscriber count social proof
- SMS opt-in form (name + phone + email)
- Testimonials from existing subscribers
- Compact SMS message formatting (short lines, natural breaks)
- Mobile-first responsive (phone mockup stacks above text on mobile)
- Clear compliance text for SMS messaging (message rates, STOP to cancel)`
  };

  return instructions[pageType] || instructions.advertorial;
}

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
