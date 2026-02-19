import { sql } from '@vercel/postgres';

/**
 * Design Step - Generate HTML/CSS using brand guide and copy
 * Uses Claude Sonnet with system prompt architecture for premium quality
 * v2.0 - Matches competitor quality with system prompts, 16K tokens, real images
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

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const claudeData = await claudeResponse.json();
  let html = claudeData.content?.[0]?.text || '';

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

  const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

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
    advertorial: `You are an expert landing page designer and direct-response copywriter. Create a complete, production-ready advertorial landing page.

${baseDesignSystem}

## ADVERTORIAL-SPECIFIC DESIGN

Reference design: Premium editorial/news publication style (like NY Times health section or Forbes sponsored content)

### Visual Style
- Clean, editorial aesthetic with generous whitespace
- Serif font for body text for credibility and readability
- Sans-serif for headlines
- Dark backgrounds for key sections (hero, product reveal, final CTA)
- Accent color for highlights, CTAs, and important stats
- Professional, almost clinical feel with premium polish

### Page Structure (MUST follow this exact 9-section flow)
1. **Hero Section** - Problem-focused headline with credibility hook. Include byline (author name, credentials), reading time, date. Dark or dramatic background with overlay.
2. **Patient/Customer Story** - Open with a relatable story (name, age, specific struggle). Use drop-cap for first letter. Narrative paragraph format.
3. **The Problem** - Establish why existing solutions fail. Use statistics (verified only). Include a highlight box or pullquote with key stat.
4. **The Discovery** - Expert credibility + scientific mechanism. Introduce the expert/researcher. Build authority.
5. **The Solution** - Natural product introduction with image. Feature grid showing key benefits. Product card with dark background.
6. **How It Works** - 3-step or 3-part mechanism breakdown. Numbered steps with icons. Clean, scannable layout.
7. **Proof Section** - Multiple testimonials in grid (3 minimum). Before/after or transformation elements. Star ratings. Specific results in quotes.
8. **Risk Reversal** - Guarantee badge/section. FAQ accordion (4-6 questions). Address common objections.
9. **Final CTA** - Urgency + discount/offer. Large CTA button. Money-back guarantee reminder. "Act now" framing without being pushy.

### Must Include
- Sticky CTA bar that appears on scroll (JavaScript)
- Reading progress bar at top (JavaScript)
- Byline with credible author name and title
- Multiple CTAs throughout (minimum 3)
- Social proof stats in hero area (e.g., "75,000+ customers")
- Drop-cap on first paragraph of story section
- Pull quotes styled with large quote marks
- Medical/expert disclaimer if health-related
- Native ad disclosure at top
- Form with email capture`,

    listicle: `You are an expert landing page designer and native advertising specialist. Create a complete, production-ready listicle/native advertorial page.

${baseDesignSystem}

## LISTICLE-SPECIFIC DESIGN

Reference design: Consumer advice article with embedded native ad (like BuzzFeed or NerdWallet style)

### Visual Style
- News/magazine publication look
- Clean header with publication-style branding
- Brand color accent for header bar
- White background with generous whitespace
- Card-style sections for each tip
- Comparison tables and savings callouts with green accents

### Page Structure (MUST follow this flow)
1. **Header Bar** - Publication-style with logo and tagline
2. **Hero Section** - Listicle headline ("X Ways to..." or "X Things...")
3. **Introduction** - Set up the value, mention local relevance if applicable
4. **Tips 1-2** - Genuine, valuable advice (NOT the product)
5. **Tip 3** - THE NATIVE AD - Naturally introduce the product as a "discovery" with comparison showing advantage
6. **Tips 4-6** - More genuine advice
7. **Mid-Content CTA** - Subtle reminder of the product
8. **Remaining Tips** - Complete the list with real value (minimum 6-8 total tips)
9. **Conclusion** - Wrap up with final CTA

### Must Include
- Numbered list format with visual number badges
- Card-based layout for each tip section
- Comparison visual for the native ad section
- Savings/benefit callouts with green accent color
- Social proof (star rating, customer count)
- At least 6 genuine tips (not all about the product)
- Email capture form
- Trust badges`,

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
