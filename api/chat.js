// RunAds - AI Chat Editor (Vercel Serverless Function)
// Claude-powered conversational HTML editing

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, html, pageId } = req.body;
  if (!message || !html) {
    return res.status(400).json({ error: 'Message and HTML are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Claude API key not configured' });
  }

  // Truncate HTML if too large (keep first and last sections for context)
  let htmlContext = html;
  const MAX_HTML = 80000;
  if (html.length > MAX_HTML) {
    const half = Math.floor(MAX_HTML / 2);
    htmlContext = html.substring(0, half) + '\n\n<!-- ... middle truncated for size ... -->\n\n' + html.substring(html.length - half);
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        system: `You are an expert web developer and conversion rate optimizer. You modify HTML landing pages based on user requests.

RULES:
1. Return ONLY the modified HTML - no explanations, no markdown code blocks
2. Preserve ALL existing <script> tags, especially tracking/analytics scripts
3. Preserve ALL <meta> tags and <link> tags
4. Keep the page responsive and mobile-friendly
5. Maintain the existing design language (colors, fonts, spacing)
6. If adding new sections, match the existing style
7. Focus on conversion optimization in all changes
8. Use inline styles or existing CSS classes - do not add external CSS files

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
      const errData = await response.json();
      return res.status(500).json({ error: 'Claude API error', details: errData });
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

    res.json({
      html: cleanHtml,
      tokens: data.usage?.input_tokens + data.usage?.output_tokens || 0,
      message: 'Page updated successfully'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
