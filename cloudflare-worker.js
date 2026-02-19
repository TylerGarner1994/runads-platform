/**
 * Cloudflare Worker for RunAds Platform
 * Routes custom domains to the correct landing page on GitHub Pages
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://dash.cloudflare.com
 * 2. Add your domain (runads.com.au) to Cloudflare
 * 3. Go to Workers & Pages -> Create Worker
 * 4. Paste this code
 * 5. Go to Workers -> your-worker -> Triggers -> Add Route
 * 6. Add routes like: *.pages.runads.com.au/* or specific domains
 *
 * TWO MODES:
 * - Static: Hardcode domain mappings in DOMAIN_MAP below
 * - Dynamic: Fetch mappings from your API (requires API_BASE_URL)
 */

// ============================================================
// CONFIGURATION
// ============================================================

// Your GitHub Pages base URL
const GITHUB_PAGES_BASE = 'https://TylerGarner1994.github.io/runads-platform-live';

// Your API server (for dynamic domain lookups) - optional
// Set to null to use static DOMAIN_MAP only
const API_BASE_URL = null; // e.g., 'https://api.runads.com.au'

// Static domain mapping (domain -> page slug)
// Add your custom domains here
const DOMAIN_MAP = {
  // Client custom domains
  // 'promo.clientsite.com': 'client-promo-page',
  // 'landing.acmecorp.com': 'acme-summer-sale',

  // Your own branded domains
  // 'offer.runads.com.au': 'runads-special-offer',
};

// Subdomain pattern for automatic routing
// Format: {slug}.pages.runads.com.au -> routes to /{slug}/
const SUBDOMAIN_PATTERNS = [
  /^([a-z0-9-]+)\.pages\.runads\.com\.au$/,
  // Add more patterns if needed
];

// ============================================================
// WORKER LOGIC
// ============================================================

async function handleRequest(request) {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;

  let slug = null;

  // 1. Check static domain map first
  if (DOMAIN_MAP[hostname]) {
    slug = DOMAIN_MAP[hostname];
  }

  // 2. Check subdomain patterns
  if (!slug) {
    for (const pattern of SUBDOMAIN_PATTERNS) {
      const match = hostname.match(pattern);
      if (match) {
        slug = match[1];
        break;
      }
    }
  }

  // 3. Try dynamic API lookup (if configured)
  if (!slug && API_BASE_URL) {
    try {
      const lookupResponse = await fetch(`${API_BASE_URL}/api/domains/lookup/${encodeURIComponent(hostname)}`);
      if (lookupResponse.ok) {
        const data = await lookupResponse.json();
        slug = data.slug;
      }
    } catch (e) {
      // API lookup failed, continue without
    }
  }

  // No mapping found
  if (!slug) {
    return new Response(notFoundHTML(hostname), {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Build the target URL on GitHub Pages
  let targetPath = pathname;
  if (pathname === '/' || pathname === '') {
    targetPath = '/index.html';
  }

  const targetUrl = `${GITHUB_PAGES_BASE}/${slug}${targetPath}`;

  // Fetch from GitHub Pages
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Worker',
      'Accept': request.headers.get('Accept') || '*/*',
    }
  });

  // If not found on GitHub Pages
  if (!response.ok) {
    return new Response(notFoundHTML(hostname), {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Clone response and add security headers
  const newHeaders = new Headers(response.headers);

  // Security headers
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('X-Powered-By', 'RunAds Platform');

  // Remove GitHub-specific headers
  newHeaders.delete('X-GitHub-Request-Id');
  newHeaders.delete('X-Served-By');
  newHeaders.delete('X-Cache');
  newHeaders.delete('X-Cache-Hits');

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders
  });
}

// Nice 404 page
function notFoundHTML(hostname) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Page Not Found</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { font-size: 4rem; margin: 0; }
    p { font-size: 1.25rem; opacity: 0.9; }
    code {
      background: rgba(255,255,255,0.2);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>No landing page configured for <code>${hostname}</code></p>
    <p style="opacity: 0.7; font-size: 0.875rem; margin-top: 2rem;">
      Powered by RunAds Platform
    </p>
  </div>
</body>
</html>`;
}

// Main event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
