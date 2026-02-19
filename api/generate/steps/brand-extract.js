import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

/**
 * Brand Extraction Step - Extract brand styles from website
 * Uses CSS parsing and Claude for accurate brand extraction
 */
export async function runBrandStep({ job, stepOutputs, additionalInput, jobId }) {
  const { website_url, client_id } = { ...job, ...additionalInput };
  const researchData = stepOutputs.research?.result?.business_research || {};

  if (!website_url && !additionalInput.url) {
    throw new Error('Website URL is required for brand extraction');
  }

  const url = website_url || additionalInput.url || stepOutputs?._config?.website_url;
  const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (!claudeApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured. Available env vars: ' + Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY') || k.includes('CLAUDE') || k.includes('ANTHROP')).join(', '));
  }

  // Step 1: Fetch website and extract CSS
  let cssData = {};
  let pageHtml = '';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RunAdsBot/1.0)'
      }
    });
    pageHtml = await response.text();

    // Extract inline styles and CSS variables
    cssData = extractCSSFromHtml(pageHtml);
  } catch (error) {
    console.error('Error fetching website for brand extraction:', error.message);
  }

  // Step 2: Use Claude to analyze and structure brand guide
  const brandPrompt = `Analyze this website's HTML and CSS to create a precise brand style guide.

EXTRACTED CSS DATA:
${JSON.stringify(cssData, null, 2)}

HTML SAMPLE (first 15000 chars):
${pageHtml.substring(0, 15000)}

BUSINESS CONTEXT:
Company: ${researchData.company_name || 'Unknown'}
Industry: ${researchData.industry || 'Unknown'}
Brand Voice: ${researchData.brand_voice || 'Unknown'}

Create a comprehensive brand style guide in this exact JSON format:
{
  "colors": {
    "primary": "#hexcode - the main brand color used for CTAs, headings",
    "secondary": "#hexcode - supporting color",
    "accent": "#hexcode - highlight/attention color",
    "background": "#hexcode - main background (usually white or near-white)",
    "text": "#hexcode - body text color (usually dark gray or black)",
    "text_muted": "#hexcode - secondary text color",
    "success": "#hexcode - positive/success color",
    "error": "#hexcode - error/warning color"
  },
  "typography": {
    "heading_font": "font-family string with fallbacks",
    "body_font": "font-family string with fallbacks",
    "font_weights": {
      "normal": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    },
    "font_sizes": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px",
      "5xl": "48px"
    },
    "line_heights": {
      "tight": "1.25",
      "normal": "1.5",
      "relaxed": "1.75"
    }
  },
  "spacing": {
    "border_radius": "4px, 8px, 12px, or rounded-full depending on brand",
    "spacing_unit": "4px (base unit for padding/margin)",
    "max_width": "1200px or 1400px typically",
    "section_padding": "60px or 80px typically"
  },
  "buttons": {
    "primary": {
      "background": "#hexcode",
      "text": "#hexcode",
      "border_radius": "value",
      "padding": "value",
      "font_weight": "value",
      "text_transform": "none/uppercase"
    },
    "secondary": {
      "background": "#hexcode or transparent",
      "text": "#hexcode",
      "border": "value or none",
      "border_radius": "value"
    }
  },
  "cards": {
    "background": "#hexcode",
    "border": "value or none",
    "border_radius": "value",
    "shadow": "CSS box-shadow value or none"
  },
  "brand_voice": {
    "tone": "professional/casual/friendly/authoritative/etc",
    "style": "description of writing style",
    "keywords": ["words that match the brand personality"]
  }
}

Be PRECISE with hex codes - extract them from the actual CSS when possible.
If you can't determine a value, use industry-standard defaults.
Return ONLY valid JSON.`;

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: brandPrompt }
      ]
    })
  });

  const claudeData = await claudeResponse.json();
  const responseText = claudeData.content?.[0]?.text || '';

  // Parse brand guide
  let brandGuide;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    brandGuide = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (parseError) {
    console.error('Error parsing brand guide:', parseError);
    brandGuide = getDefaultBrandGuide();
  }

  // Step 3: Store brand guide in database
  const now = new Date().toISOString();
  const brandGuideId = uuidv4();

  if (client_id) {
    // Check if brand guide exists
    const existingGuide = await sql`SELECT id FROM brand_style_guides WHERE client_id = ${client_id}`;

    if (existingGuide.rows.length > 0) {
      // Update existing
      await sql`
        UPDATE brand_style_guides
        SET
          primary_color = ${brandGuide.colors?.primary || null},
          secondary_color = ${brandGuide.colors?.secondary || null},
          accent_color = ${brandGuide.colors?.accent || null},
          background_color = ${brandGuide.colors?.background || null},
          text_color = ${brandGuide.colors?.text || null},
          heading_font = ${brandGuide.typography?.heading_font || null},
          body_font = ${brandGuide.typography?.body_font || null},
          font_weights = ${JSON.stringify(brandGuide.typography?.font_weights || {})}::jsonb,
          font_sizes = ${JSON.stringify(brandGuide.typography?.font_sizes || {})}::jsonb,
          border_radius = ${brandGuide.spacing?.border_radius || null},
          spacing_unit = ${brandGuide.spacing?.spacing_unit || null},
          max_width = ${brandGuide.spacing?.max_width || null},
          button_style = ${JSON.stringify(brandGuide.buttons || {})}::jsonb,
          card_style = ${JSON.stringify(brandGuide.cards || {})}::jsonb,
          brand_voice = ${brandGuide.brand_voice?.tone || null},
          tone_keywords = ${JSON.stringify(brandGuide.brand_voice?.keywords || [])}::jsonb,
          raw_css = ${JSON.stringify(cssData)},
          updated_at = ${now}
        WHERE client_id = ${client_id}
      `;
    } else {
      // Insert new
      await sql`
        INSERT INTO brand_style_guides (
          id, client_id, primary_color, secondary_color, accent_color, background_color, text_color,
          heading_font, body_font, font_weights, font_sizes, border_radius, spacing_unit, max_width,
          button_style, card_style, brand_voice, tone_keywords, raw_css, created_at, updated_at
        )
        VALUES (
          ${brandGuideId}, ${client_id},
          ${brandGuide.colors?.primary || null},
          ${brandGuide.colors?.secondary || null},
          ${brandGuide.colors?.accent || null},
          ${brandGuide.colors?.background || null},
          ${brandGuide.colors?.text || null},
          ${brandGuide.typography?.heading_font || null},
          ${brandGuide.typography?.body_font || null},
          ${JSON.stringify(brandGuide.typography?.font_weights || {})}::jsonb,
          ${JSON.stringify(brandGuide.typography?.font_sizes || {})}::jsonb,
          ${brandGuide.spacing?.border_radius || null},
          ${brandGuide.spacing?.spacing_unit || null},
          ${brandGuide.spacing?.max_width || null},
          ${JSON.stringify(brandGuide.buttons || {})}::jsonb,
          ${JSON.stringify(brandGuide.cards || {})}::jsonb,
          ${brandGuide.brand_voice?.tone || null},
          ${JSON.stringify(brandGuide.brand_voice?.keywords || [])}::jsonb,
          ${JSON.stringify(cssData)},
          ${now}, ${now}
        )
      `;
    }
  }

  const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

  return {
    data: {
      brand_guide: brandGuide,
      css_variables_found: Object.keys(cssData.variables || {}).length,
      colors_extracted: Object.keys(brandGuide.colors || {}).length
    },
    tokens_used: tokensUsed
  };
}

function extractCSSFromHtml(html) {
  const result = {
    variables: {},
    colors: [],
    fonts: [],
    inlineStyles: []
  };

  // Extract CSS variables from :root or html
  const cssVarRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+)/g;
  let match;
  while ((match = cssVarRegex.exec(html)) !== null) {
    result.variables[match[1]] = match[2].trim();
  }

  // Extract color values
  const colorRegex = /#[0-9a-fA-F]{3,8}\b|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;
  const colors = html.match(colorRegex) || [];
  result.colors = [...new Set(colors)].slice(0, 50);

  // Extract font-family declarations
  const fontRegex = /font-family\s*:\s*([^;}"]+)/gi;
  while ((match = fontRegex.exec(html)) !== null) {
    result.fonts.push(match[1].trim());
  }
  result.fonts = [...new Set(result.fonts)].slice(0, 10);

  return result;
}

function getDefaultBrandGuide() {
  return {
    colors: {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937',
      text_muted: '#6b7280'
    },
    typography: {
      heading_font: 'system-ui, -apple-system, sans-serif',
      body_font: 'system-ui, -apple-system, sans-serif',
      font_weights: { normal: '400', medium: '500', semibold: '600', bold: '700' },
      font_sizes: { base: '16px', lg: '18px', xl: '20px', '2xl': '24px', '3xl': '30px' }
    },
    spacing: {
      border_radius: '8px',
      spacing_unit: '4px',
      max_width: '1200px'
    },
    buttons: {
      primary: { background: '#2563eb', text: '#ffffff', border_radius: '8px' }
    },
    brand_voice: {
      tone: 'professional',
      keywords: ['trusted', 'quality', 'reliable']
    }
  };
}
