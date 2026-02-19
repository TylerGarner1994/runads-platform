// RunAds - AI Landing Page Generator (Vercel Serverless Function)
// Full 4-phase workflow: Research â Psychology Copy â Expert Review â Output

export const config = { maxDuration: 300 };

// ============================================================
// EXPERT PANEL DEFINITIONS
// ============================================================
const EXPERT_PANEL = [
  { name: 'David Ogilvy', specialty: 'Classic Copywriting', focus: 'headlines, long-form persuasion, brand voice, elegance of expression' },
  { name: 'Claude Hopkins', specialty: 'Scientific Advertising', focus: 'specificity, offers, testing mentality, reason-why copy, coupon techniques' },
  { name: 'Gary Halbert', specialty: 'Direct Response', focus: 'hooks, curiosity loops, emotional triggers, urgency, the "A-pile" test' },
  { name: 'Joanna Wiebe', specialty: 'Conversion Copywriting', focus: 'voice of customer, clarity, CTA optimization, message-market match' },
  { name: 'Peep Laja', specialty: 'CRO Expert', focus: 'friction points, trust signals, page flow, conversion path optimization' },
  { name: 'Robert Cialdini', specialty: 'Persuasion Psychology', focus: 'reciprocity, commitment, social proof, authority, liking, scarcity, unity' },
  { name: 'Daniel Kahneman', specialty: 'Behavioral Economics', focus: 'System 1/2 balance, cognitive biases, decision architecture, loss aversion' },
  { name: 'Richard Bandler', specialty: 'NLP', focus: 'presuppositions, embedded commands, sensory language, future pacing, anchoring' },
  { name: 'Oli Gardner', specialty: 'Landing Page Design', focus: 'attention ratio, visual hierarchy, mobile UX, directional cues, form design' },
  { name: 'Oren Klaff', specialty: 'Pitch Expert', focus: 'frame control, status alignment, intrigue, tension, hot cognitions, novelty' }
];

const SCORING_DIMENSIONS = [
  { name: 'Headline Impact', weight: 15, question: 'Does it stop scrolling and create curiosity?' },
  { name: 'Value Proposition Clarity', weight: 15, question: 'Crystal clear offer within 5 seconds?' },
  { name: 'Emotional Resonance', weight: 15, question: 'Does it connect with target pain/desire?' },
  { name: 'Credibility & Trust', weight: 15, question: 'Sufficient proof elements present?' },
  { name: 'Visual Design', weight: 10, question: 'Beautiful, on-brand, professional?' },
  { name: 'Copy Quality', weight: 10, question: 'Tight, persuasive, scannable writing?' },
  { name: 'CTA Optimization', weight: 10, question: 'Compelling, visible, friction-free CTAs?' },
  { name: 'Mobile Experience', weight: 5, question: 'Works perfectly on mobile?' },
  { name: 'Psychology Application', weight: 5, question: 'Principles applied correctly?' }
];

// ============================================================
// HOOK&RAMEWORKS
// ============================================================
const HOOK_FRAMEWORKS = {
  'problem-agitate-solution': 'Name the specific pain point â Amplify the emotional cost â Present the solution as the natural resolution',
  'curiosity-gap': 'Tease an intriguing outcome or discovery without revealing the method â Create an information gap the reader must close',
  'contrarian': 'Challenge conventional wisdom or common advice â Position against the mainstream â Reveal a counterintuitive truth',
  'social-proof': 'Lead with crowd behavior or specific numbers â Create FOMO through exclusivity â Show what insiders already know',
  'direct-benefit': 'State the primary value proposition clearly and directly â Use specific numbers and timeframes â Remove ambiguity',
  'story-hook': 'Open with a compelling micro-narrative â Create emotional investment â Transition to the offer naturally',
  'question-hook': 'Ask a provocative question that challenges assumptions â Create cognitive engagement â Guide toward your answer',
  'statistic-lead': 'Open with a surprising or alarming data point â Create urgency through numbers â Position solution against the statistic',
  'before-after': 'Paint vivid contrast between current pain and desired outcome â Use specific details â Make the transformation tangible',
  'fomo': 'Create urgency through genuine scarcity or exclusivity â Use specific limits, dates, or spots â Make the cost of inaction clear'
};

// ============================================================
// PSYCHOLOGY FRAMEWORK
// ============================================================
const PSYCHOLOGY_FRAMEWORK = `
## System 1 Triggers (Emotional/Intuitive - Fast Brain)
- Visual hierarchy: Hero image, color contrast, strategic whitespace
- Social proof: Testimonials with specifics, customer logos, exact user counts
- Authority: Expert endorsements, credentials, media logos, data citations
- Scarcity: Limited spots, countdown timers, inventory indicators
- Urgency: Hard deadlines, expiring bonuses, price increase warnings
- Reciprocity: Free value upfront, unexpected bonuses, generous guarantees
- Liking: Relatable founder stories, behind-the-scenes, brand personality

## System 2 Triggers (Rational/Analytical - Slow Brain)
- ROI calculation: "Pays for itself in X days" with math shown
- Feature comparison: vs. alternatives and vs. status quo (doing nothing)
- Risk reversal: Money-back guarantees, free trials, "keep everything" offers
- Specificity: Exact numbers, precise timeframes, detailed deliverables
- Logic flow: Problem â Agitate â Solution â Proof â CTA
- Objection handling: FAQ sections, preemptive rebuttals inline

## Neuromarketing Principles
- Pattern interrupts within first 3 seconds (visual or copy)
- Faces and eye direction pointing toward CTA
- Rule of three for benefits/features
- Concrete vs. abstract language (always concrete)
- Loss aversion framing (what they'll miss, not just what they'll gain)
- Price anchoring (show higher price first, then actual)
- Default options and clear recommendations

## NLP Patterns (Use Naturally)
- Presuppositions: "When you start seeing results..."
- Embedded commands: "Imagine yourself already achieving..."
- Future pacing: "Picture yourself 30 days from now..."
- Sensory language: "Feel the confidence... see the results..."
- Cause-effect: "Because you're reading this, you already know..."
- Modal operators: "You can... You will... You deserve..."
`;

// ============================================================
// MAIN HANDLER
// ============================================================
// GitHub storage helpers (for saving generated pages)
const GITHUB_API = 'https://api.github.com';

async function getGitHubFile(path) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (resp.status === 404) return { data: null, sha: null };
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  const file = await resp.json();
  const content = JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8'));
  return { data: content, sha: file.sha };
}

async function saveGitHubFile(path, content, sha, message) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const body = { message: message || 'Update data', content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) { const err = await resp.json(); throw new Error(`GitHub save error: ${err.message}`); }
  return await resp.json();
}

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // Accept both frontend field names (type, url, audience) and backend names (page_type, product_url, target_audience)
  const page_type = req.body.page_type || req.body.type || 'advertorial';
  const product_url = req.body.product_url || req.body.url;
  const target_audience = req.body.target_audience || req.body.audience || '';
  const tone = req.body.tone || 'Professional & Trustworthy';
  const client_data = req.body.client_data || null;
  const clientId = req.body.clientId || req.body.client_id || null;
  const hook_framework = req.body.hook_framework || null;
  const additional_context = req.body.additional_context || null;

  if (!product_url) {
    return res.status(400).json({ error: 'A product URL or description is required (pass as "url" or "product_url")' });
  }

  try {
    // ============================================================
    // PHASE 1: Generate the landing page
    // ============================================================
    const brandContext = client_data ? `
## Brand Context
- Colors: Primary ${client_data.primary_color || '#2563eb'}, Secondary ${client_data.secondary_color || '#1e40af'}, Accent ${client_data.accent_color || '#f59e0b'}
- Fonts: Heading "${client_data.heading_font || 'Inter'}", Body "${client_data.body_font || 'Inter'}"
- Voice: ${client_data.brand_voice || 'Professional and trustworthy'}
- Testimonials: ${JSON.stringify(client_data.testimonials || [])}
- Verified Claims: ${JSON.stringify(client_data.claims || [])}
- Products: ${JSON.stringify(client_data.products || [])}
` : '';

    const hookContext = hook_framework && HOOK_FRAMEWORKS[hook_framework]
      ? `\n## Hook Framework: ${hook_framework}\n${HOOK_FRAMEWORKS[hook_framework]}\n`
      : '';

    const generatePrompt = `You are a world-class landing page creator whnüàocombines direct response copywriting mastery with modern web development skills.

Create a complete, production-ready ${page_type} landing page for:
**Product/Offer:** ${product_url}
**Target Audience:** ${target_audience || 'General audience interested in this product/service'}
**Tone:** ${tone || 'Professional & Trustworthy'}
${hookContext}
${brandContext}
${additional_context ? `\n## Additional Context\n${additional_context}` : ''}

${PSYCHOLOGY_FRAMEWORK}

## TechNical Requirements
1. Complete, self-contained HTML with inline CSS and JS
2. Mobile-first responsive design (test at 375px, 768px, 1024px)
3. Google Fonts loaded via <link> tag
4. CSS custom properties (:root) for easy color theming
5. Smooth scroll behavior and subtle animations (Intersection Observer)
6. All images use placeholder URLs (https://placehold.co/WIDTHxHEIGHT)
7. Proper meta tags (title, description, viewport, OG tags)
8. Accessible (semantic HTML, alt tags, ARIA labels on interactive elements)

## Page Type: ${page_type}
${getPageTypeInstructions(page_type)}

CRITICAL: Return ONLY the complete HTML. No explanations, no markdown code blocks. Start with <!DOCTYPE html> and end with </html>.`;

    const genResponse = await callClaude(apiKey, generatePrompt, 'claude-sonnet-4-6');
    let html = cleanHtmlResponse(genResponse.content[0].text);

    // ============================================================
    // PHASE 2: Expert Review & Scoring
    // ============================================================
    const reviewPrompt = `You are evaluating a landing page as a panel of 10 marketing experts.

Here is the HTML of the landing page:
${html.substring(0, 60000)}

## Expert Panel
${EXPERT_PANEL.map(e => `- **${e.name}** (${e.specialty}): Evaluates ${e.focus}`).join('\n')}

## Scoring Dimensions
${SCORING_DIMENSIONS.map(d => `- ${d.name} (${d.weight}%): ${d.question}`).join('\n')}

For each expert, provide:
1. A score (0-100) for each dimension
2. One specific, actionable improvement suggestion

Then calculate the weighted average score.

If the average is below 90, provide specific HTML modifications to improve the weakest dimensions.

Respond in this exact JSON format:
{
  "experts": [
    {
      "name": "Expert Name",
      "scores": { "Headline Impact": 85, "Value Proposition Clarity": 90, ... },
      "suggestion": "Specific improvement..."
    }
  C	X\
vrage_score": 87.5,
  "needs_revision": true,
  "revision_instructions": "Specific changes to make..."
}`;

    const reviewResponse = await callClaude(apiKey, reviewPrompt, 'claude-haiku-4-5-20251001');
    let reviewData;
    try {
      const reviewText = reviewResponse.content[0].text;
      const jsonMatch = reviewText.match(/\{'[\s\S]*\}/);
      reviewData = jsonMatch ? JSON.parse(jsonMatch[0]) : { average_score: 90, needs_revision: false };
    } catch (e) {
      reviewData = { average_score: 90, needs_revision: false, experts: [] };
    }

    // ============================================================
    // PHASE 3: Revision if needed (one pass)
    // ============================================================
    if (reviewData.needs_revision && reviewData.revision_instructions) {
      const revisionPrompt = `You are improving a landing page based on expert feedback.

Current HTML:
${html.substring(0, 60000)}

Expert panel scored this ${reviewData.average_score}/100. Here are the required improvements:
${reviewData.revision_instructions}

Apply ALL suggested improvements while maintaining the existing design and tracking code.
Return ONLY the complete modified HTML. Start with <!DOCTYPE html>.`;

      const revResponse = await callClaude(apiKey, revisionPrompt, 'claude-sonnet-4-6');
      html = cleanHtmlResponse(revResponse.content[0].text);
    }

    // ============================================================
    // PHASE 4: Save page to storage
    // ============================================================
    const totalTokens = (genResponse.usage?.input_tokens || 0) + (genResponse.usage?.output_tokens || 0) +
                        (reviewResponse.usage?.input_tokens || 0) + (reviewResponse.usage?.output_tokens || 0);

    let savedPage = null;
    try {
      const DATA_PATH = 'data/pages.json';
      const { data, sha } = await getGitHubFile(DATA_PATH);
      const pages = data || [];
      const id = generateId();
      const pageName = `${page_type.charAt(0).toUpperCase() + page_type.slice(1)} - ${product_url.substring(0, 50)}`;
      const pageSlug = pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
      const now = new Date().toISOString();
      savedPage = {
        id,
        name: pageName,
        slug: pageSlug,
        html_content: html,
        client_id: clientId,
        client_name: '',
        page_type: page_type,
        template_type: null,
        status: 'draft',
        meta_title: pageName,
        meta_description: `${page_type} page for ${product_url.substring(0, 100)}`,
        views: 0,
        leads: 0,
        custom_domain: null,
        expert_scores: reviewData,
        created_at: now,
        updated_at: now,
        deployed_at: null
      };
      pages.unshift(savedPage);
      await saveGitHubFile(DATA_PATH, pages, sha, `Generate ${page_type}: ${pageName.substring(0, 50)}`);
    } catch (saveErr) {
      console.error('Failed to save page:', saveErr);
      // Still return the generated HTML even if save fails
    }

    // ============================================================
    // Return result
    // ============================================================
    res.json({
      html,
      expert_scores: reviewData,
      tokens_used: totalTokens,
      estimated_cost: (totalTokens * 0.000003).toFixed(4),
      message: `Page generated with score: ${reviewData.average_score}/100`,
      page: savedPage ? { id: savedPage.id, slug: savedPage.slug, name: savedPage.name } : null
    });

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ============================================================
// HELPERS
// ============================================================

async function callClaude(apiKey, prompt, model = 'claude-sonnet-4-6') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Claude API error: ${JSON.stringify(err)}`);
  }

  return response.json();
}

function cleanHtmlResponse(text) {
  let html = text.trim();
  if (html.startsWith('```html')) html = html.replace(/^```html\n?/, '').replace(/\n?```$/, '');
  else if (html.startsWith('```')) html = html.replace(/^```\n?/, '').replace(/\n?```$/, '');
  return html;
}

function getPageTypeInstructions(type) {
  const instructions = {
    advertorial: `Create an editorial-style long-form sales page that reads like a news article or magazine piece.
Include: Journalistic headline, author byline with date, editorial body with subheadings, embedded testimonials, comparison section, stat callouts, expert quotes, FAQ accordion, and multiple CTAs woven naturally through the content. Use a progress bar showing reading progress.`,

    listicle: `Create a native-ad style "tips" article (e.g., "7 Reasons Why..." or "5 Things You Need to Know About...").
Include: Numbered items with alternating layouts (text-left/image-right), social proof badges, quote blocks between items, stat cards, testimonial section, and a strong final CTA. Use an urgency banner at top.`,

    quiz: `Create an interactive quiz funnel that guides users to personalized results.
Include: Welcome screen with social proof, 5-7 multiple choice questions, interstitial stat cards between questions (after Q1, Q3, Q5) that auto-dismiss after 2s, a loading/calculating results screen, and a personalized results page with CTA. Track quiz state with JavaScript.`,

    vip: `Create an exclusive VIP/waitlist signup page that conveys exclusivity and scarcity.
Include: Hero with exclusive badge, limited spots indicator, benefit cards, social proof from current members, simple email signup form, countdown timer (if deadline exists), and FAQ section.`,

    calculator: `Create an interactive calculator (savings, ROI, or comparison) that demonstrates value.
Include: Input fields with sliders, real-time calculation display, visual comparison (before/after), shareable results, email capture for full report, and CTA to take action on results.`
  };
  return instructions[type] || instructions.advertorial;
}
