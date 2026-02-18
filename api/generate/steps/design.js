import { sql } from '@vercel/postgres';

/**
 * Design Step - Generate HTML/CSS using brand guide and copy
 * Uses Claude Sonnet for high-quality design generation
 */
export async function runDesignStep({ job, stepOutputs, additionalInput, jobId }) {
  const { page_type, template_id } = job;
  const copy = stepOutputs.copy?.result?.copy || {};
  const brandGuide = stepOutputs.brand?.result?.brand_guide || {};
  const strategy = stepOutputs.strategy?.result?.strategy || {};
  const researchData = stepOutputs.research?.result?.business_research || {};

  const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (!claudeApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Get template if specified
  let templateHtml = null;
  let templateCss = null;
  if (template_id) {
    const templateResult = await sql`SELECT html_skeleton, css_base FROM page_templates WHERE id = ${template_id}`;
    if (templateResult.rows[0]) {
      templateHtml = templateResult.rows[0].html_skeleton;
      templateCss = templateResult.rows[0].css_base;
    }
  }

  const designPrompt = `Create a stunning, conversion-optimized ${page_type} landing page using this copy and brand guide.

BRAND STYLE GUIDE:
${JSON.stringify(brandGuide, null, 2)}

PAGE COPY:
${JSON.stringify(copy, null, 2)}

STRATEGY CONTEXT:
Page goal: ${strategy.page_goal || 'conversion'}
Target persona: ${JSON.stringify(strategy.target_persona || {})}
CTA Strategy: ${JSON.stringify(strategy.cta_strategy || {})}

COMPANY: ${researchData.company_name || 'Brand'}

${templateHtml ? `BASE TEMPLATE HTML (adapt this structure):\n${templateHtml}` : ''}
${templateCss ? `BASE TEMPLATE CSS (extend this):\n${templateCss}` : ''}

DESIGN REQUIREMENTS:
1. Apply EXACT brand colors from the style guide
2. Use specified fonts with proper weights
3. Follow spacing guidelines (border-radius, padding, max-width)
4. Button styles must match brand guide exactly
5. Mobile-responsive (use CSS Grid/Flexbox)
6. Modern 2025-2026 design trends
7. Smooth scroll behavior
8. Accessible (proper contrast, alt tags)
9. NEVER use em dashes anywhere in the output. Use " - " (space-dash-space) instead.

${getPageTypeDesignGuidelines(page_type)}

Generate a complete, production-ready HTML page with embedded CSS.

Structure:
- <!DOCTYPE html> with proper meta tags
- <style> block with all CSS (no external stylesheets)
- Semantic HTML structure
- Form with action="https://runads-platform.vercel.app/api/track" method="POST"
- Include hidden input: <input type="hidden" name="page_id" value="{{PAGE_ID}}">
- MUST include closing </body> and </html> tags

Return ONLY the complete HTML code, no markdown code blocks or explanations.`;

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        { role: 'user', content: designPrompt }
      ]
    })
  });

  const claudeData = await claudeResponse.json();
  let html = claudeData.content?.[0]?.text || '';

  // Clean up the HTML (remove markdown code blocks if present)
  html = html
    .replace(/^```html?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Ensure it starts with DOCTYPE
  if (!html.toLowerCase().startsWith('<!doctype')) {
    html = '<!DOCTYPE html>\n' + html;
  }

  // Strip em dashes as safety net
  html = html.replace(/\u2014/g, ' - ');
  html = html.replace(/&mdash;/g, ' - ');

  // Auto-repair truncated HTML if needed
  if (!html.includes('</body>')) {
    const openCounts = {};
    const closeCounts = {};
    for (const tag of ['div', 'section', 'article', 'main', 'aside', 'footer', 'header', 'nav']) {
      const openMatches = html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || [];
      const closeMatches = html.match(new RegExp(`</${tag}>`, 'gi')) || [];
      openCounts[tag] = openMatches.length;
      closeCounts[tag] = closeMatches.length;
    }
    for (const tag of ['div', 'section', 'article', 'main', 'aside', 'footer', 'header', 'nav']) {
      const unclosed = (openCounts[tag] || 0) - (closeCounts[tag] || 0);
      for (let i = 0; i < unclosed; i++) {
        html += `</${tag}>`;
      }
    }
    html += '\n</body>\n</html>';
  }

  const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

  return {
    data: {
      html,
      html_length: html.length,
      has_form: html.includes('<form'),
      has_tracking: html.includes('{{PAGE_ID}}')
    },
    tokens_used: tokensUsed
  };
}

function getPageTypeDesignGuidelines(pageType) {
  const guidelines = {
    advertorial: `
ADVERTORIAL DESIGN GUIDELINES:
- News/editorial layout (clean, readable)
- Large feature image at top
- Narrow content column (max 700px) for readability
- Pull quotes styled prominently
- Expert/author byline with photo
- Share buttons (non-functional, for social proof feel)
- Related articles sidebar (optional)
- Native ad disclosure at top
- Progress bar or scroll indicator
- Sticky CTA that appears after scrolling`,

    listicle: `
LISTICLE DESIGN GUIDELINES:
- Clear numbered sections with visual dividers
- Eye-catching number graphics
- Card-based layout for each item
- Alternating image positions
- Quick-scan headlines
- Inline CTAs after key items
- Mobile: stack vertically
- Progress indicator showing items remaining`,

    quiz: `
QUIZ DESIGN GUIDELINES:
- Full-width question cards
- Large, tappable answer buttons
- Progress bar showing question number
- Smooth transitions between questions
- Results page with visual scoring
- Personalized result styling
- Email capture form before/after results
- Share result buttons
- Single question per screen on mobile`,

    vip: `
VIP PAGE DESIGN GUIDELINES:
- Premium, luxurious feel (subtle gradients, gold accents)
- Large hero with exclusive messaging
- Limited spots counter/indicator
- VIP benefits in elegant grid
- Testimonials from similar customers
- Urgency elements (countdown timer styling)
- Single prominent CTA
- Minimal distractions
- Dark or sophisticated color scheme option`,

    calculator: `
CALCULATOR DESIGN GUIDELINES:
- Clean input form design
- Sliders or number inputs
- Real-time calculation display
- Before/after comparison visual
- Results prominently displayed
- Savings highlighted with color
- CTA based on calculated result
- Mobile-optimized input fields
- Clear reset/recalculate option`
  };

  return guidelines[pageType] || guidelines.advertorial;
}
