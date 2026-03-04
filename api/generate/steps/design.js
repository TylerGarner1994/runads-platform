import { sql } from '@vercel/postgres';
import { callClaude } from '../../../lib/claude.js';

/**
 * Design Step - Generate HTML/CSS using brand guide and copy
 * Uses Claude Sonnet with system prompt architecture for premium quality
 * v2.1 - Uses shared Claude utility with retry logic and error handling
 */
export async function runDesignStep({ job, stepOutputs, additionalInput, jobId }) {
  const { page_type, template_id } = job;
  const copy = stepOutputs.copy?.result?.copy || {};
  const brandGuide = stepOutputs.brand?.result?.brand_guide || {};
  const strategy = stepOutputs.strategy?.result?.strategy || {};
  const researchData = stepOutputs.research?.result?.business_research || {};

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

  // Extract scraped images from research data
  const scrapedImages = researchData._scrapedImages || researchData.images || [];
  const productImages = scrapedImages.filter(img => img.category === 'product' || img.category === 'hero' || img.category === 'feature');
  const allImages = scrapedImages.length > 0 ? scrapedImages.slice(0, 10) : [];

  // Build font pairing based on page type
  const fontPairing = getFontPairing(page_type, brandGuide);

  // Build the system prompt (design system + page type blueprint)
  const systemPrompt = getSystemPrompt(page_type, brandGuide, fontPairing);

  // Build the user prompt (dynamic content - copy, research, images)
  const userPrompt = buildUserPrompt({
    page_type,
    copy,
    brandGuide,
    strategy,
    researchData,
    allImages,
    productImages,
    fontPairing,
    templateHtml,
    templateCss
  });

  // Use shared Claude utility with retry logic and error handling
  // maxTokens 16000 keeps generation within Vercel's 300s function limit
  // (a complete landing page is typically 10-15K tokens of HTML)
  const response = await callClaude({
    systemPrompt,
    userPrompt,
    model: 'claude-sonnet-4-6',
    maxTokens: 16000,
    retries: 1
  });

  // Check for truncation - if stop_reason is 'max_tokens', the output was cut off
  if (response.stopReason === 'max_tokens') {
    console.warn('[Design Step] WARNING: Output was truncated at max_tokens limit. Page may be incomplete.');
  }

  console.log('[Design Step] Stop reason:', response.stopReason, '| Tokens used:', response.tokensUsed);

  // Validate we got actual HTML content
  if (!response.text || response.text.length < 100) {
    throw new Error(`Design step returned empty or insufficient HTML (${response.text?.length || 0} chars). The Claude API may have returned an error or empty response.`);
  }

  let html = response.text;

  // Clean up the HTML (remove markdown code blocks if present)
  const htmlMatch = html.match(/```html\n([\s\S]*?)\n```/) || html.match(/```\n([\s\S]*?)\n```/);
  if (htmlMatch) {
    html = htmlMatch[1];
  }
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

  // Replace placeholder images with real scraped images if available
  if (allImages.length > 0) {
    html = replacePlaceholderImages(html, allImages, productImages);
  }

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

  const tokensUsed = response.tokensUsed;

  return {
    data: {
      html,
      html_length: html.length,
      has_form: html.includes('<form'),
      has_tracking: html.includes('{{PAGE_ID}}'),
      images_injected: allImages.length
    },
    tokens_used: tokensUsed
  };
}

// ============================================================
// FONT PAIRINGS BY PAGE TYPE
// ============================================================
function getFontPairing(pageType, brandGuide) {
  // If brand guide specifies fonts, use those
  if (brandGuide.typography?.heading_font && !brandGuide.typography.heading_font.includes('system-ui')) {
    return {
      heading: brandGuide.typography.heading_font,
      body: brandGuide.typography.body_font || "'Inter', sans-serif",
      googleImport: '' // Already loaded or system font
    };
  }

  const pairings = {
    advertorial: {
      heading: "'Playfair Display', Georgia, serif",
      body: "'Source Sans Pro', -apple-system, sans-serif",
      googleImport: '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+Pro:wght@300;400;600;700&display=swap");'
    },
    listicle: {
      heading: "'Poppins', sans-serif",
      body: "'Inter', -apple-system, sans-serif",
      googleImport: '@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap");'
    },
    quiz: {
      heading: "'Poppins', sans-serif",
      body: "'Inter', -apple-system, sans-serif",
      googleImport: '@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap");'
    },
    vip: {
      heading: "'Playfair Display', Georgia, serif",
      body: "'Lato', -apple-system, sans-serif",
      googleImport: '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Lato:wght@300;400;700;900&display=swap");'
    },
    calculator: {
      heading: "'Poppins', sans-serif",
      body: "'Inter', -apple-system, sans-serif",
      googleImport: '@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap");'
    }
  };

  return pairings[pageType] || pairings.advertorial;
}

// ============================================================
// SYSTEM PROMPTS - THE KEY TO QUALITY
// ============================================================
function getSystemPrompt(pageType, brandGuide, fontPairing) {
  const colors = brandGuide.colors || {};

  const baseDesignSystem = `
## DESIGN SYSTEM REQUIREMENTS

You are creating landing pages that match the quality of premium, high-converting pages used by top direct-response marketers. Every page must be visually stunning and production-ready.

### Typography
- Use Google Fonts: ${fontPairing.heading} for headings, ${fontPairing.body} for body
- Headings: Bold (700-800 weight), large sizes with clamp() for responsiveness
- Body: 16-18px, line-height 1.6-1.8, color ${colors.text || '#333'}
- Generous letter-spacing on small caps/labels
- Use clamp() for fluid typography: clamp(2rem, 5vw, 3.5rem) for h1

### Google Fonts Import
${fontPairing.googleImport || '@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap");'}

### Brand Colors
- Primary: ${colors.primary || '#2563eb'}
- Secondary: ${colors.secondary || '#1e40af'}
- Accent: ${colors.accent || '#f59e0b'}
- Background: ${colors.background || '#ffffff'}
- Text: ${colors.text || '#1f2937'}
- Text Muted: ${colors.text_muted || '#6b7280'}

### Spacing & Layout
- Mobile-first responsive design
- Max-width containers (720px for articles, 1200px for wider layouts)
- Section padding: 60-100px vertical, 20-24px horizontal on mobile
- Use CSS clamp() for fluid typography
- Generous whitespace between sections

### Color Patterns
- High contrast for readability
- Accent colors used sparingly for CTAs and highlights
- Use rgba() for subtle backgrounds and overlays
- Dark sections (background: #121212 or #1a1a2e) to break up content and add visual interest
- Alternating light/dark sections for visual rhythm

### Interactive Elements
- Buttons: Large (padding 16-20px 32-40px), rounded (8-12px or pill-shaped), with hover states
- Hover transforms: translateY(-2px) with box-shadow increase
- Smooth transitions: 0.3s ease or cubic-bezier(0.4, 0, 0.2, 1)
- Cards with subtle shadows that lift on hover

### Social Proof Patterns
- Specific numbers ("75,000+ customers" not "thousands")
- Star ratings with filled yellow stars (Unicode ★)
- Testimonials with names, titles/roles
- Trust badges and guarantees with icons
- Stats displayed prominently with large numbers and small labels

### Mobile Responsiveness
- @media (max-width: 768px) breakpoints
- Stack layouts vertically on mobile
- Reduce padding and font sizes appropriately
- Touch-friendly button sizes (min 44px height)
- Grid columns collapse to single column on mobile

### Image Handling
- Use provided product/brand images when available
- For decorative/background images, use gradient overlays instead of stock photos
- All images must have alt text
- Use object-fit: cover for consistent sizing
- Border-radius on images for modern look

### CSS Best Practices
- All CSS must be in a single <style> tag (no external stylesheets except Google Fonts)
- Use CSS custom properties (--variables) for colors and spacing
- Include smooth scroll: html { scroll-behavior: smooth; }
- Include box-sizing: border-box reset
- Include -webkit-font-smoothing: antialiased
`;

  const pagePrompts = {
    advertorial: `You are an expert landing page designer trained in direct-response conversion design. You understand the psychology behind every layout decision. Create a complete, production-ready advertorial landing page.

${baseDesignSystem}

## ADVERTORIAL-SPECIFIC DESIGN

Reference design: Premium editorial/news publication style (NY Times health section, Forbes sponsored content). The reader should feel they're reading a legitimate article.

### Design Psychology Principles
- Each section builds on the previous, creating a "slippery slide" (Sugarman) - the reader can't stop
- Visual hierarchy guides the eye from problem to discovery to solution to proof to CTA
- Dark sections create emotional weight (problem, product reveal, final CTA)
- Light sections create relief and trust (discovery, testimonials, how-it-works)
- Alternating section tones create visual rhythm that maintains engagement
- White space = credibility. Dense layouts = spam. Use generous spacing.

### Visual Style
- Clean, editorial aesthetic with generous whitespace
- Serif font for body text for credibility and readability (trust signal)
- Sans-serif for headlines and UI elements (modern, authoritative)
- Dark backgrounds for emotionally heavy sections (hero, product reveal, final CTA)
- Light/white backgrounds for trust-building sections (proof, how-it-works)
- Accent color ONLY for CTAs and key highlights - don't overuse
- Professional, almost clinical feel with premium polish
- Pull quotes with oversized quotation marks for credibility anchoring
- Highlighted stat boxes that break up long-form text

### Page Structure (MUST follow this exact 10-section advertorial architecture)

1. **Publication Header + Hero Section**
   - Publication-style topbar with brand/publication name
   - Problem-focused headline that reads like editorial (NOT an ad headline)
   - Byline: "By Dr./Editor [Name], [Credential]" with date and reading time
   - Dark or dramatic background with gradient overlay
   - Social proof counter in hero ("147,832 people have read this report")
   - Native ad disclosure label ("ADVERTISEMENT" or "SPONSORED CONTENT") - small, subtle

2. **The Opening Story / Editorial Lead** (The Hook - Schwartz's first 50 words)
   - Open with a relatable character story (name, age, city, specific struggle)
   - Drop-cap on first letter (editorial styling)
   - Narrative paragraph format, journalistic voice
   - Make reader identify: "that's me" moment
   - Purpose: Emotional engagement + relevance establishment

3. **Problem Establishment & Agitation** (Build the pain)
   - "They told you" structure showing failed conventional approaches
   - Highlighted stat box or pullquote with key verified statistic
   - Consequences of not solving: health, financial, relationship, etc.
   - Visual: Warning-style callout boxes, red/amber accent highlights
   - Purpose: Make the problem feel urgent and unbearable BEFORE any solution

4. **The Discovery / Pivot** (The "aha moment")
   - Transition: "Then, researchers at [institution] discovered..."
   - Expert introduction with credential badges (university logos, publication logos)
   - Authority positioning through institutional credibility
   - Curiosity gap: hint at what was found without revealing the product
   - Visual: Clean, authoritative layout with research-style formatting

5. **The Unique Mechanism** (Why this is different)
   - Name the branded mechanism prominently
   - Simple explanation using analogy or straightforward language
   - Infographic-style visual showing how the mechanism works
   - "No wonder everything else failed" moment
   - Make them feel SMART for understanding this, not stupid for not knowing
   - Visual: Diagram/flowchart styling, numbered explanation boxes

6. **The Solution Introduction** (Product reveal)
   - Natural bridge from mechanism to product
   - Product image prominently displayed with dark background card
   - Feature grid showing 4-6 key benefits with icons
   - "Developed by [credentials] based on [mechanism]"
   - Initial proof element (most impressive stat or endorsement)
   - Visual: Premium product card layout, elevated shadow, brand colors

7. **How It Works** (3-step simplicity)
   - Numbered steps with large step numbers and icons
   - Clean, scannable grid layout
   - Each step: icon + headline + 2-3 sentence explanation
   - Make the process feel simple and achievable
   - Visual: Step-by-step cards or timeline layout

8. **Proof & Testimonials** (Stack the evidence)
   - 3-4 detailed testimonials in grid with star ratings
   - Specific results in quotes (numbers, timeframes)
   - Different avatar types (address different objections)
   - Before/after or transformation elements where applicable
   - Visual: Testimonial cards with photo placeholders, star ratings, verified badges

9. **Risk Reversal / FAQ** (Remove final objections)
   - Guarantee badge/section with shield icon
   - FAQ accordion (4-6 questions) addressing top objections
   - "What if it doesn't work?" answered directly
   - Visual: FAQ accordion with expand/collapse, guarantee seal

10. **Final CTA** (The close)
    - Urgency element (real, not manufactured)
    - Large, prominent CTA button with hover effect
    - Value stack summary
    - Money-back guarantee reminder
    - P.S. style final appeal (second-most-read element per Halbert)
    - Visual: Dark background, large button, trust badges row beneath

### Must Include (Technical)
- Sticky CTA bar that appears on scroll past hero (JavaScript)
- Reading progress bar at top of page (JavaScript)
- Smooth scroll to CTA on button click
- Multiple CTAs throughout (minimum 3: after discovery, after proof, final)
- Drop-cap on first paragraph of story section
- Pull quotes styled with large decorative quote marks
- Medical/expert disclaimer if health-related
- Native ad disclosure at top ("SPONSORED" or "ADVERTISEMENT")
- Email capture form with action to tracking endpoint
- Hover effects on all interactive elements
- CSS animations for section entry (fade-in on scroll)`,

    listicle: `You are an expert landing page designer and native advertising specialist. Create a complete, production-ready listicle/native advertorial page.

${baseDesignSystem}

## LISTICLE-SPECIFIC DESIGN

Reference design: Consumer advice article with embedded native ad (like BuzzFeed, NerdWallet, or Healthline style)

### Design Psychology
- Each numbered tip creates a "commitment loop" (Sugarman consistency trigger) - reader who starts wants to finish all tips
- The product tip (#3) is placed after enough value has been given to trigger reciprocity (Cialdini)
- Visual differentiation of the product tip must be subtle - a slightly different background, NOT a screaming ad
- Number badges create scanability and a sense of completeness (desire to collect all tips)
- Comparison table triggers anchoring effect - show alternatives first at higher price/lower value

### Visual Style
- News/magazine publication feel - branded header bar
- Brand color accent for publication header and tip number badges
- White/light background for all advice sections
- Card-style sections for each tip with subtle shadow
- Product tip (#3) gets slightly elevated card with brand accent border (not obviously different)
- Comparison tables with green "savings" accents and red "overpriced" accents
- Inline testimonials after product section (not separated)

### Page Structure (MUST follow this flow)
1. **Publication Header Bar** - Brand-colored topbar with publication name and tagline
2. **Hero Section** - Listicle headline using fascination format ("X Proven Ways...", "X Things Most People Don't Know...")
   - Byline with author, date, reading time
   - Social proof ("Based on 2,000+ customer reviews" or similar)
3. **Introduction** (150-250 words) - Set up the value, mention why this topic matters now
4. **Tips 1-2** - Genuine, valuable advice with fascination headlines
   - Each tip: large number badge + compelling headline + 100-200 words of actionable content
   - Tip headlines use bullet formulas: counterintuitive, how-to, hidden secret, warning
5. **Tip 3 - THE NATIVE AD SECTION** - The most important section
   - Headline uses discovery/comparison formula
   - Product introduced as "the one most people miss" or "the insider pick"
   - Comparison table/visual showing product advantage over alternatives
   - Embedded testimonial with star rating
   - Subtle CTA button (not aggressive)
   - Slightly elevated card design (brand accent border top)
6. **Tips 4-7** - More genuine advice (quick wins + deeper insights)
7. **Mid-Content CTA Banner** - Subtle horizontal banner reminding of Tip 3's discovery
   - "Recommended by our editorial team" style
8. **Final Tip** - The conclusion tip, wrapping with value
9. **Conclusion Section** - Summary + final strong CTA with urgency
   - Email capture form
   - Trust badges row (money-back, free shipping, verified reviews)

### Must Include
- Large, styled number badges for each tip (circles or rounded squares with tip number)
- Card-based layout with consistent padding/margin for each tip
- Comparison visual for the native ad section (side-by-side or table)
- Green accent for positive callouts (savings, benefits, check marks)
- Star ratings and customer count in product section
- At minimum 7 genuine tips (only tip #3 is the product)
- Email capture form near bottom
- Trust/guarantee badges
- Reading time in hero
- Publication-style footer`,

    quiz: `You are an expert landing page designer and quiz funnel specialist. Create a complete, production-ready interactive quiz page with JavaScript.

${baseDesignSystem}

## QUIZ-SPECIFIC DESIGN

Reference design: Personalized product recommendation quiz

### Visual Style
- Friendly, approachable aesthetic
- Soft, inviting colors with brand accents
- Large, tappable option buttons with icons/emojis
- Progress bar at top
- Card-style question containers with subtle shadows
- Celebration animation on results

### Page Structure
1. **Welcome Screen** - Engaging headline, "Takes 60 seconds", social proof, big "Start Quiz" button
2. **Quiz Container** (JavaScript-driven) - Questions 1-7 with styled option buttons
3. **Email Capture** - Before showing results
4. **Results Screen** - Personalized recommendations based on answers
5. **Post-Results CTA** - Product recommendations with purchase button

### JavaScript Requirements
- Track answers in array/object
- Show/hide question screens (no page reloads)
- Progress bar updates with each question
- Name personalization in results
- Email validation before showing results
- Smooth CSS transitions between screens (opacity + transform)
- Back button option

### Must Include
- 6-8 questions
- Progress indicator (Question X of Y)
- Large tappable buttons (not radio inputs)
- Email capture with privacy assurance
- Personalized results using quiz answers
- Product recommendation CTA`,

    vip: `You are an expert landing page designer and email capture specialist. Create a complete, production-ready VIP/waitlist signup page.

${baseDesignSystem}

## VIP PAGE-SPECIFIC DESIGN

### Visual Style
- Premium, exclusive feel with elegant typography
- Subtle gradients and sophisticated shadows
- Aspirational imagery and styling
- Badge/tag styling for "VIP" and "Exclusive"
- Gold or brand accent color for premium feel

### Page Structure
1. **Header** - Clean brand logo
2. **Hero Section** - "Exclusive Invitation" tag, compelling headline, member count, email capture form
3. **Benefits Grid** - 6 VIP perks with icons
4. **Preview Section** - Upcoming drops or products with "VIP Access Only" tags
5. **Testimonial** - Strong testimonial from existing member
6. **Final CTA** - Repeat email capture with urgency

### Must Include
- Member count display
- Multiple email capture forms (hero + bottom)
- 6 clear VIP benefits with icons
- Privacy/unsubscribe assurance
- FOMO language ("Our best items sell out in hours")`,

    calculator: `You are an expert landing page designer and conversion specialist. Create a complete, production-ready savings calculator landing page with JavaScript.

${baseDesignSystem}

## CALCULATOR-SPECIFIC DESIGN

### Visual Style
- Bold, high-contrast design
- Challenger brand positioning
- Brand color for hero
- Green for savings/positive numbers
- Interactive sliders and inputs
- Real-time updating numbers

### Page Structure
1. **Hero Section** - Bold headline about saving money, direct value prop
2. **Calculator Section** - Interactive inputs with real-time calculations, side-by-side comparison
3. **Proof Grid** - Key metrics, trust badges
4. **How It Works** - Simple 3-step process
5. **Final CTA** - App download or signup with bonus incentive

### JavaScript Requirements
- Range slider inputs with real-time updates
- Calculate savings based on inputs
- Display monthly and annual savings
- Animate number changes
- Format currency values

### Must Include
- Interactive calculator with sliders
- Real-time savings display
- Competitor comparison
- Trust metrics
- Mobile-friendly touch inputs`
  };

  return pagePrompts[pageType] || pagePrompts.advertorial;
}

// ============================================================
// USER PROMPT BUILDER
// ============================================================
function buildUserPrompt({ page_type, copy, brandGuide, strategy, researchData, allImages, productImages, fontPairing, templateHtml, templateCss }) {
  let prompt = `Create a stunning, conversion-optimized ${page_type} landing page using the content below.

## PAGE COPY (Use this exact copy in the page)
${JSON.stringify(copy, null, 2)}

## STRATEGY CONTEXT
Page goal: ${strategy.page_goal || 'conversion'}
Target persona: ${JSON.stringify(strategy.target_persona || {})}
CTA Strategy: ${JSON.stringify(strategy.cta_strategy || {})}
Tone: ${strategy.tone_guidelines?.voice || brandGuide.brand_voice?.tone || 'professional'}

## COMPANY INFORMATION
Name: ${researchData.company_name || 'Brand'}
Industry: ${researchData.industry || 'General'}
Products: ${JSON.stringify((researchData.products || []).slice(0, 3))}
Value Props: ${JSON.stringify(researchData.value_propositions || [])}
`;

  // Add image URLs if available
  if (allImages.length > 0) {
    prompt += `\n## REAL PRODUCT/BRAND IMAGES (Use these actual URLs in the page)
${allImages.map((img, i) => `${i + 1}. ${img.url || img.src || img} ${img.category ? `(${img.category})` : ''} ${img.alt ? `- ${img.alt}` : ''}`).join('\n')}

IMPORTANT: Use these real image URLs in <img> tags throughout the page. Do NOT use placeholder URLs from unsplash, placeholder.com, via.placeholder.com, or picsum.photos. Use these actual product images.
`;
  }

  // Add brand color context
  if (brandGuide.colors) {
    prompt += `\n## BRAND COLORS (Apply these throughout)
Primary: ${brandGuide.colors.primary || '#2563eb'}
Secondary: ${brandGuide.colors.secondary || '#1e40af'}
Accent: ${brandGuide.colors.accent || '#f59e0b'}
Background: ${brandGuide.colors.background || '#ffffff'}
Text: ${brandGuide.colors.text || '#1f2937'}
`;
  }

  // Add template context if available
  if (templateHtml) {
    prompt += `\n## BASE TEMPLATE (Adapt this structure)\n${templateHtml.substring(0, 3000)}`;
  }
  if (templateCss) {
    prompt += `\n## BASE CSS (Extend this)\n${templateCss.substring(0, 2000)}`;
  }

  // Add font import instruction
  prompt += `\n## FONT IMPORT
Include this in your <style> tag:
${fontPairing.googleImport}
`;

  prompt += `
## FINAL INSTRUCTIONS
1. Apply EXACT brand colors from above
2. Use the specified Google Fonts with proper weights
3. Include form with action="https://runads-platform.vercel.app/api/track" method="POST"
4. Include hidden input: <input type="hidden" name="page_id" value="{{PAGE_ID}}">
5. MUST include closing </body> and </html> tags
6. NEVER use em dashes anywhere. Use " - " (space-dash-space) instead.
7. Make it visually STUNNING - this should look like a $10,000 custom landing page
8. Include ALL sections described in the page structure - do not skip any
9. Every section should have real, substantial content - no placeholder text
10. Use smooth scroll, hover effects, and modern CSS animations

Generate the COMPLETE HTML page. Return ONLY the HTML code starting with <!DOCTYPE html>. No markdown code blocks or explanations.`;

  return prompt;
}

// ============================================================
// IMAGE REPLACEMENT UTILITY
// ============================================================
function replacePlaceholderImages(html, allImages, productImages) {
  // Replace common placeholder patterns with real images
  const placeholderPatterns = [
    /https?:\/\/via\.placeholder\.com\/[^\s"']+/gi,
    /https?:\/\/placeholder\.com\/[^\s"']+/gi,
    /https?:\/\/picsum\.photos\/[^\s"']+/gi,
    /https?:\/\/source\.unsplash\.com\/[^\s"']+/gi,
    /https?:\/\/images\.unsplash\.com\/[^\s"']+/gi,
    /https?:\/\/placehold\.co\/[^\s"']+/gi,
    /https?:\/\/dummyimage\.com\/[^\s"']+/gi
  ];

  let imageIndex = 0;
  for (const pattern of placeholderPatterns) {
    html = html.replace(pattern, () => {
      const img = allImages[imageIndex % allImages.length];
      imageIndex++;
      return img.url || img.src || img;
    });
  }

  // Also replace data-placeholder-image attributes
  html = html.replace(/data-placeholder-image="[^"]*"/gi, () => {
    const img = allImages[imageIndex % allImages.length];
    imageIndex++;
    return `src="${img.url || img.src || img}"`;
  });

  return html;
}
