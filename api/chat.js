// RunAds - AI Chat Editor (Vercel Serverless Function)
// Claude-powered conversational HTML editing with live save
// Supports two modes:
//   1. Live page widget: sends { slug, message, adminKey }
//   2. Dashboard editor: sends { message, html, pageId }

export const config = { maxDuration: 300 };

import { getPageBySlug, getPage, updatePage } from '../lib/storage.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, slug, html, pageId, adminKey } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Claude API key not configured' });
  }

  // Determine mode: live widget (slug-based) vs dashboard (html-based)
  let currentHtml = html;
  let page = null;

  if (slug) {
    // Live widget mode — validate admin key
    const editKey = process.env.ADMIN_EDIT_KEY;
    if (editKey && adminKey !== editKey) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    // Fetch current page HTML from storage
    page = await getPageBySlug(slug);
    if (!page || !page.html_content) {
      return res.status(404).json({ error: 'Page not found' });
    }
    currentHtml = page.html_content;
  } else if (!currentHtml) {
    return res.status(400).json({ error: 'Either slug or html is required' });
  }

  // Truncate HTML if too large (keep first and last sections for context)
  let htmlContext = currentHtml;
  const MAX_HTML = 80000;
  if (currentHtml.length > MAX_HTML) {
    const half = Math.floor(MAX_HTML / 2);
    htmlContext = currentHtml.substring(0, half) + '\n\n<!-- ... middle truncated for size ... -->\n\n' + currentHtml.substring(currentHtml.length - half);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: `You are an expert web developer and conversion rate optimizer. You modify HTML landing pages based on user requests.

RULES:
1. Return ONLY the modified HTML - no explanations, no markdown code blocks, no commentary
2. Preserve ALL existing <script> tags, especially tracking/analytics scripts and the admin widget script
3. Preserve ALL <meta> tags and <link> tags
4. Keep the page responsive and mobile-friendly
5. Maintain the existing design language (colors, fonts, spacing)
6. If adding new sections, match the existing style
7. Focus on conversion optimization in all changes
8. Use inline styles or existing CSS classes - do not add external CSS files
9. Return the COMPLETE HTML document from <!DOCTYPE html> to </html>

When making copy changes, apply these principles:
- Use benefit-driven language
- Maintain urgency and scarcity where present
- Keep headlines punchy and specific
- Ensure CTAs are action-oriented`,
        messages: [{
          role: 'user',
          content: `Here is the current HTML of the landing page:\n\n${htmlContext}\n\nUser request: ${message}\n\nReturn the complete modified HTML.`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: 'Claude API error', details: errText });
    }

    const data = await response.json();
    const modifiedHtml = data.content[0].text;

    // Clean up if Claude wrapped in code blocks
    let cleanHtml = modifiedHtml;
    if (cleanHtml.startsWith('```html')) {
      cleanHtml = cleanHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '');
    } else if (cleanHtml.startsWith('```')) {
      cleanHtml = cleanHtml.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    cleanHtml = cleanHtml.trim();

    // Auto-save: if we loaded from slug, write back to Postgres
    if (page) {
      try {
        await updatePage(page.id, { html_content: cleanHtml });
      } catch (saveErr) {
        console.error('Failed to save page update:', saveErr);
        return res.status(500).json({ error: 'Claude edit succeeded but failed to save: ' + saveErr.message });
      }
    }

    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    res.json({
      success: true,
      html: cleanHtml,
      tokens,
      saved: !!page,
      response: page
        ? `Done! Your change has been saved. The page will reload to show it.`
        : 'Page updated successfully'
    });

  } catch (err) {
    console.error('Chat API error:', err);
    res.status(500).json({ error: err.message });
  }
}
