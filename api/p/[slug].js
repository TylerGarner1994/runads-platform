import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { slug } = req.query;

  try {
    // Fetch the landing page from database
    const { rows } = await sql`
      SELECT * FROM landing_pages WHERE slug = ${slug} AND status = 'live'
    `;

    if (rows.length === 0) {
      // Page not found - return a nice 404
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Page Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #f8fafb 0%, #e8f4f8 100%);
              color: #2D3436;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 {
              font-size: 4rem;
              color: #3B9FD8;
              margin-bottom: 0.5rem;
            }
            h2 {
              font-size: 1.5rem;
              font-weight: 500;
              margin-bottom: 1rem;
              color: #636E72;
            }
            p {
              color: #636E72;
              margin-bottom: 2rem;
            }
            a {
              display: inline-block;
              padding: 12px 24px;
              background: #3B9FD8;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              transition: background 0.2s;
            }
            a:hover {
              background: #2878A8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404</h1>
            <h2>Page Not Found</h2>
            <p>The landing page you're looking for doesn't exist or hasn't been published yet.</p>
            <a href="https://runads-platform.vercel.app">Go to RunAds</a>
          </div>
        </body>
        </html>
      `);
    }

    const page = rows[0];

    // Track page view
    try {
      const sessionId = req.cookies?.session_id || Math.random().toString(36).substring(2);
      const userAgent = req.headers['user-agent'] || '';
      const referrer = req.headers['referer'] || '';
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '';

      // Parse UTM parameters
      const url = new URL(req.url, `https://${req.headers.host}`);
      const utmSource = url.searchParams.get('utm_source');
      const utmMedium = url.searchParams.get('utm_medium');
      const utmCampaign = url.searchParams.get('utm_campaign');
      const utmTerm = url.searchParams.get('utm_term');
      const utmContent = url.searchParams.get('utm_content');

      // Determine device type
      const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
      const isTablet = /tablet|ipad/i.test(userAgent);
      const deviceType = isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop');

      await sql`
        INSERT INTO page_views (page_id, session_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, ip_address, user_agent, referrer, device_type)
        VALUES (${page.id}, ${sessionId}, ${utmSource}, ${utmMedium}, ${utmCampaign}, ${utmTerm}, ${utmContent}, ${ip}, ${userAgent}, ${referrer}, ${deviceType})
      `;
    } catch (trackError) {
      console.error('Failed to track page view:', trackError);
      // Don't fail the request if tracking fails
    }

    // Set response headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

    // Clean HTML — strip any editor artifacts that may have been saved accidentally
    let html = page.html_content;
    // Remove contenteditable editing scripts
    html = html.replace(/<script>[\s\S]*?document\.addEventListener\('DOMContentLoaded'[\s\S]*?contentEditable[\s\S]*?<\/script>/gi, '');
    // Remove contenteditable hover/focus styles
    html = html.replace(/<style>\s*\[contenteditable\][\s\S]*?<\/style>/gi, '');
    // Remove contenteditable attributes
    html = html.replace(/\s*contenteditable="true"/gi, '');
    // Remove inline outline styles added by editor focus/blur handlers
    html = html.replace(/\s*style="outline:\s*(?:none|2px solid[^"]*);?\s*(?:outline-offset:\s*2px;?)?\s*"/gi, '');

    // Inject meta tags if page has them and they're not in HTML
    if (page.meta_title && !html.includes('<title>')) {
      html = html.replace('<head>', `<head>\n  <title>${page.meta_title}</title>`);
    }
    if (page.meta_description && !html.includes('meta name="description"')) {
      html = html.replace('<head>', `<head>\n  <meta name="description" content="${page.meta_description}">`);
    }

    return res.status(200).send(html);
  } catch (error) {
    console.error('Error serving landing page:', error);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafb;
          }
          .container { text-align: center; padding: 2rem; }
          h1 { color: #E17055; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Something went wrong</h1>
          <p>Please try again later.</p>
        </div>
      </body>
      </html>
    `);
  }
}
