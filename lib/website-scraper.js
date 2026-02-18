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

// Extract product/hero images from HTML
function extractImages(html, baseUrl) {
  const images = [];
  const seen = new Set();

  // Normalize base URL for resolving relative paths
  let base = baseUrl;
  try {
    const u = new URL(baseUrl);
    base = u.origin;
  } catch (e) {}

  function resolveUrl(src) {
    if (!src || src.startsWith('data:')) return null;
    if (src.startsWith('//')) return 'https:' + src;
    if (src.startsWith('http')) return src;
    if (src.startsWith('/')) return base + src;
    return base + '/' + src;
  }

  function isUsableImage(src, width, height, alt, classes) {
    if (!src) return false;
    // Skip tiny images (icons, tracking pixels, spacers)
    if (width && parseInt(width) < 80) return false;
    if (height && parseInt(height) < 80) return false;
    // Skip common non-product patterns
    const skipPatterns = /favicon|icon|logo-small|sprite|pixel|tracking|badge|rating|star|arrow|chevron|social|facebook|twitter|linkedin|instagram|youtube|pinterest|loading|spinner|placeholder\.svg/i;
    if (skipPatterns.test(src)) return false;
    // Skip base64 tiny images
    if (src.startsWith('data:') && src.length < 500) return false;
    return true;
  }

  // Extract <img> tags
  const imgPattern = /<img[^>]*>/gi;
  let match;
  while ((match = imgPattern.exec(html)) !== null && images.length < 30) {
    const tag = match[0];
    const src = (tag.match(/src=["']([^"']+)["']/i) || [])[1];
    const alt = (tag.match(/alt=["']([^"']+)["']/i) || [])[1] || '';
    const width = (tag.match(/width=["']?(\d+)/i) || [])[1];
    const height = (tag.match(/height=["']?(\d+)/i) || [])[1];
    const classes = (tag.match(/class=["']([^"']+)["']/i) || [])[1] || '';
    const srcset = (tag.match(/srcset=["']([^"']+)["']/i) || [])[1] || '';
    // Also check data-src for lazy-loaded images
    const dataSrc = (tag.match(/data-src=["']([^"']+)["']/i) || [])[1];

    const imgSrc = resolveUrl(src || dataSrc);
    if (imgSrc && !seen.has(imgSrc) && isUsableImage(imgSrc, width, height, alt, classes)) {
      seen.add(imgSrc);

      // Categorize the image
      let category = 'general';
      const contextClasses = classes.toLowerCase() + ' ' + alt.toLowerCase();
      if (/product|item|sku|merchandise/i.test(contextClasses)) category = 'product';
      else if (/hero|banner|header|jumbotron|masthead/i.test(contextClasses)) category = 'hero';
      else if (/testimonial|review|customer|portrait|avatar|team|staff/i.test(contextClasses)) category = 'person';
      else if (/background|bg-|parallax/i.test(contextClasses)) category = 'background';
      else if (/gallery|carousel|slide/i.test(contextClasses)) category = 'gallery';
      else if (/ingredient|feature|benefit|icon-large/i.test(contextClasses)) category = 'feature';

      images.push({
        url: imgSrc,
        alt,
        category,
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        hasSrcset: !!srcset
      });
    }
  }

  // Extract background images from inline styles
  const bgPattern = /background(?:-image)?\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((match = bgPattern.exec(html)) !== null && images.length < 30) {
    const imgSrc = resolveUrl(match[1]);
    if (imgSrc && !seen.has(imgSrc) && isUsableImage(imgSrc, null, null, '', '')) {
      seen.add(imgSrc);
      images.push({ url: imgSrc, alt: '', category: 'background', width: null, height: null, hasSrcset: false });
    }
  }

  // Extract OG/meta images
  const ogImage = (html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [])[1];
  if (ogImage) {
    const imgSrc = resolveUrl(ogImage);
    if (imgSrc && !seen.has(imgSrc)) {
      seen.add(imgSrc);
      images.unshift({ url: imgSrc, alt: 'OG Image', category: 'hero', width: null, height: null, hasSrcset: false });
    }
  }

  // Sort: product first, then hero, then gallery, then others
  const priority = { product: 0, hero: 1, gallery: 2, feature: 3, person: 4, general: 5, background: 6 };
  images.sort((a, b) => (priority[a.category] || 5) - (priority[b.category] || 5));

  return images;
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
  const images = extractImages(html, url);

  return {
    url,
    meta,
    text,
    textContent: text, // alias for compatibility with claims scraper
    title: meta.title,
    metaDescription: meta.description,
    colors,
    fonts,
    testimonials,
    products,
    images,
    rawHtmlLength: html.length,
    scrapedAt: new Date().toISOString()
  };
}

// Extract internal links from HTML, prioritizing high-value pages
function extractInternalLinks(html, baseUrl) {
  const links = new Set();
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }

  // Priority keywords for sub-pages (ordered by research value)
  const priorityKeywords = [
    'about', 'product', 'service', 'testimonial', 'review',
    'pricing', 'feature', 'benefit', 'story', 'team',
    'mission', 'why', 'how-it-works', 'results', 'case-stud',
    'faq', 'ingredient', 'science', 'research', 'proof'
  ];

  // Extract all href values
  const hrefPattern = /href=["']([^"'#]+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    let href = match[1].trim();

    // Skip non-page links
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    if (href.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|mp4|mp3|webp)$/i)) continue;

    // Resolve relative URLs
    try {
      const resolved = new URL(href, baseUrl);
      // Only follow same-domain links
      if (resolved.hostname === base.hostname) {
        links.add(resolved.href);
      }
    } catch {
      // Skip invalid URLs
    }
  }

  // Score and sort by priority
  const scored = [...links].map(link => {
    const lower = link.toLowerCase();
    let score = 0;
    for (let i = 0; i < priorityKeywords.length; i++) {
      if (lower.includes(priorityKeywords[i])) {
        score = priorityKeywords.length - i; // Higher score for earlier keywords
        break;
      }
    }
    return { url: link, score };
  });

  // Sort by score descending, then return top results
  scored.sort((a, b) => b.score - a.score);

  // Return only high-value pages (score > 0), up to 6 candidates
  return scored.filter(s => s.score > 0).slice(0, 6).map(s => s.url);
}

// Multi-page scrape: fetches main page + up to 4 high-value sub-pages
// Combines all extracted data into a unified result
async function scrapeMultiPage(url, maxSubPages = 4) {
  if (!url) throw new Error('URL is required');
  if (!url.startsWith('http')) url = 'https://' + url;

  // Step 1: Fetch and analyze the main page
  const mainHtml = await fetchPage(url);
  const mainMeta = extractMeta(mainHtml);
  const mainText = extractTextBasic(mainHtml);
  const colors = extractColors(mainHtml);
  const fonts = extractFonts(mainHtml);
  const mainTestimonials = extractTestimonials(mainHtml);
  const mainProducts = extractProducts(mainHtml);
  const images = extractImages(mainHtml, url);

  // Step 2: Find high-value internal links
  const subPageUrls = extractInternalLinks(mainHtml, url);
  const pagesToScrape = subPageUrls.slice(0, maxSubPages);

  // Step 3: Fetch sub-pages in parallel (with error tolerance)
  const allTexts = [mainText];
  const allTestimonials = [...mainTestimonials];
  const allProducts = [...mainProducts];
  const subPageResults = [];

  if (pagesToScrape.length > 0) {
    const subPagePromises = pagesToScrape.map(async (subUrl) => {
      try {
        const subHtml = await fetchPage(subUrl);
        const subText = extractTextBasic(subHtml);
        const subTestimonials = extractTestimonials(subHtml);
        const subProducts = extractProducts(subHtml);
        const subImages = extractImages(subHtml, subUrl);

        return {
          url: subUrl,
          text: subText,
          testimonials: subTestimonials,
          products: subProducts,
          images: subImages,
          success: true
        };
      } catch (e) {
        return { url: subUrl, error: e.message, success: false };
      }
    });

    const results = await Promise.allSettled(subPagePromises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        const page = result.value;
        allTexts.push(page.text);
        allTestimonials.push(...page.testimonials);
        allProducts.push(...page.products);
        // Add unique images from sub-pages
        const existingUrls = new Set(images.map(i => i.url));
        for (const img of page.images) {
          if (!existingUrls.has(img.url)) {
            images.push(img);
            existingUrls.add(img.url);
          }
        }
        subPageResults.push({ url: page.url, textLength: page.text.length });
      }
    }
  }

  // Step 4: Combine all text content (limit to ~30K chars total for AI context)
  const combinedText = allTexts.join('\n\n---PAGE BREAK---\n\n').substring(0, 30000);

  // Deduplicate testimonials
  const seenQuotes = new Set();
  const uniqueTestimonials = allTestimonials.filter(t => {
    const key = t.quote.substring(0, 50).toLowerCase();
    if (seenQuotes.has(key)) return false;
    seenQuotes.add(key);
    return true;
  });

  // Deduplicate products
  const seenProducts = new Set();
  const uniqueProducts = allProducts.filter(p => {
    const key = p.name.toLowerCase();
    if (seenProducts.has(key)) return false;
    seenProducts.add(key);
    return true;
  });

  return {
    url,
    meta: mainMeta,
    text: combinedText,
    textContent: combinedText,
    title: mainMeta.title,
    metaDescription: mainMeta.description,
    colors,
    fonts,
    testimonials: uniqueTestimonials,
    products: uniqueProducts,
    images: images.slice(0, 30),
    rawHtmlLength: mainHtml.length,
    pagesScraped: 1 + subPageResults.length,
    subPages: subPageResults,
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
  extractImages,
  extractInternalLinks,
  scrapeWebsite,
  scrapeMultiPage,
  extractBrandAssets
};
