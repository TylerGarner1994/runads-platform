// RunAds - Website Scraper for Client Research
// Extracts business info, brand assets, testimonials, products from client websites

// Try to use cheerio if available, otherwise use basic HTML parsing
let cheerio;
try {
  cheerio = await import('cheerio');
} catch (e) {
  cheerio = null;
}

// Fetch a webpage with timeout and user-agent
async function fetchPage(url) {
  if (!url) throw new Error('URL is required');
  if (!url.startsWith('http')) url = 'https://' + url;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RunAds/1.0; +https://runads-platform.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(timeout);
  }
}

// Extract visible text from HTML (basic fallback when cheerio unavailable)
function extractTextBasic(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 15000); // Limit to ~15K chars for AI context
}

// Extract meta information from HTML
function extractMeta(html) {
  const meta = {};

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  meta.title = titleMatch ? titleMatch[1].trim() : '';

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
  meta.description = descMatch ? descMatch[1].trim() : '';

  // OG tags
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
  meta.ogTitle = ogTitle ? ogTitle[1].trim() : '';

  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);
  meta.ogDescription = ogDesc ? ogDesc[1].trim() : '';

  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([\s\S]*?)["']/i);
  meta.ogImage = ogImage ? ogImage[1].trim() : '';

  return meta;
}

// Extract CSS colors from inline styles and stylesheets
function extractColors(html) {
  const colors = new Set();

  // Hex colors
  const hexMatches = html.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g) || [];
  hexMatches.forEach(c => colors.add(c.toLowerCase()));

  // RGB colors
  const rgbMatches = html.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/gi) || [];
  rgbMatches.forEach(c => colors.add(c));

  // CSS custom properties (--primary-color, etc.)
  const varMatches = html.match(/--[\w-]+-color\s*:\s*([^;]+)/gi) || [];
  varMatches.forEach(m => {
    const val = m.split(':')[1]?.trim();
    if (val) colors.add(val);
  });

  return [...colors].slice(0, 20); // Limit to 20 most frequent
}

// Extract font families
function extractFonts(html) {
  const fonts = new Set();

  // Font-family declarations
  const fontMatches = html.match(/font-family\s*:\s*([^;}"]+)/gi) || [];
  fontMatches.forEach(m => {
    const val = m.split(':')[1]?.trim();
    if (val) {
      // Get first font in stack
      const primary = val.split(',')[0].trim().replace(/["']/g, '');
      if (primary && !['inherit', 'initial', 'unset', 'serif', 'sans-serif', 'monospace'].includes(primary.toLowerCase())) {
        fonts.add(primary);
      }
    }
  });

  // Google Fonts imports
  const gfMatches = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"&]+)/gi) || [];
  gfMatches.forEach(m => {
    const family = m.split('family=')[1]?.split('&')[0]?.split(':')[0]?.replace(/\+/g, ' ');
    if (family) fonts.add(decodeURIComponent(family));
  });

  return [...fonts].slice(0, 10);
}

// Extract potential testimonials from HTML
function extractTestimonials(html) {
  const testimonials = [];

  // Look for common testimonial patterns
  const quotePatterns = [
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    /<div[^>]*class="[^"]*(?:testimonial|review|quote)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /"([^"]{50,300})"\s*[-–—]\s*([A-Z][a-z]+ [A-Z][a-z]+)/g,
  ];

  quotePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null && testimonials.length < 10) {
      const text = match[1]?.replace(/<[^>]+>/g, '').trim();
      if (text && text.length > 30 && text.length < 500) {
        testimonials.push({ quote: text, source: 'website' });
      }
    }
  });

  return testimonials;
}

// Extract product/service information
function extractProducts(html) {
  const products = [];

  // Look for product cards, pricing sections
  const priceMatches = html.match(/\$\d+[\d,.]*(?:\s*\/\s*\w+)?/g) || [];
  const productNamePatterns = [
    /<h[23][^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/h[23]>/gi,
    /<div[^>]*class="[^"]*(?:product-name|plan-name|pricing-title)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  productNamePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null && products.length < 10) {
      const name = match[1]?.replace(/<[^>]+>/g, '').trim();
      if (name && name.length > 2 && name.length < 100) {
        products.push({ name, source: 'website' });
      }
    }
  });

  return products;
}

// Main function: Scrape a website and return structured data
async function scrapeWebsite(url) {
  const html = await fetchPage(url);
  const meta = extractMeta(html);
  const text = extractTextBasic(html);
  const colors = extractColors(html);
  const fonts = extractFonts(html);
  const testimonials = extractTestimonials(html);
  const products = extractProducts(html);

  return {
    url,
    meta,
    text,
    colors,
    fonts,
    testimonials,
    products,
    rawHtmlLength: html.length,
    scrapedAt: new Date().toISOString()
  };
}

// Extract brand assets specifically (colors, fonts, spacing)
async function extractBrandAssets(url) {
  const html = await fetchPage(url);
  const colors = extractColors(html);
  const fonts = extractFonts(html);

  // Extract spacing/layout values
  const borderRadii = [...new Set((html.match(/border-radius\s*:\s*([^;}"]+)/gi) || []).map(m => m.split(':')[1]?.trim()))];
  const maxWidths = [...new Set((html.match(/max-width\s*:\s*([^;}"]+)/gi) || []).map(m => m.split(':')[1]?.trim()))];

  return {
    colors,
    fonts,
    borderRadii: borderRadii.slice(0, 5),
    maxWidths: maxWidths.slice(0, 5),
    scrapedAt: new Date().toISOString()
  };
}

export {
  fetchPage,
  extractTextBasic,
  extractMeta,
  extractColors,
  extractFonts,
  extractTestimonials,
  extractProducts,
  scrapeWebsite,
  extractBrandAssets
};
