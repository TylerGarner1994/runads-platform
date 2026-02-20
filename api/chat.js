// RunAds - AI Chat Editor (Vercel Serverless Function)
// Smart diff-based editing: Claude returns search/replace pairs instead of full HTML
// Falls back to full regeneration only for major structural changes
// Supports two modes:
//   1. Live page widget: sends { slug, message, adminKey }
//   2. Dashboard editor: sends { message, html, pageId }

export const config = { maxDuration: 300 };

import { getPageBySlug, getPage, updatePage } from '../lib/storage.js';

// ─── Quick edits that don't need AI at all ───
function tryQuickEdit(html, message) {
  const msg = message.toLowerCase().trim();

  // Pattern: "change all CTA links to <url>" or "update all button links to <url>"
  const linkMatch = message.match(/(?:change|update|set|make)\s+(?:all\s+)?(?:cta|button)\s+(?:links?|hrefs?|urls?)\s+to\s+(https?:\/\/[^\s"']+)/i);
  if (linkMatch) {
    const newUrl = linkMatch[1];
    // Find all <a> tags that look like CTA buttons (have button-like classes/styles)
    const modified = html.replace(
      /(<a\s[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*href=")[^"]*(")/gi,
      `$1${newUrl}$2`
    ).replace(
      /(<a\s[^>]*href=")[^"]*("[^>]*class="[^"]*(?:btn|button|cta)[^"]*")/gi,
      `$1${newUrl}$2`
    ).replace(
      /(<a\s[^>]*style="[^"]*(?:background|border-radius|padding)[^"]*"[^>]*href=")[^"]*(")/gi,
      `$1${newUrl}$2`
    ).replace(
      /(<a\s[^>]*href=")[^"]*("[^>]*style="[^"]*(?:background|border-radius|padding)[^"]*")/gi,
      `$1${newUrl}$2`
    );
    if (modified !== html) {
      const count = (html.length - modified.length === 0) ?
        (html.match(/href="/g) || []).length : 'multiple';
      return { html: modified, response: `Updated CTA button links to ${newUrl}` };
    }
  }

  // Pattern: "replace <old text> with <new text>"
  const replaceMatch = message.match(/(?:replace|change)\s+"([^"]+)"\s+(?:with|to)\s+"([^"]+)"/i);
  if (replaceMatch) {
    const [, oldText, newText] = replaceMatch;
    if (html.includes(oldText)) {
      const modified = html.split(oldText).join(newText);
      const count = html.split(oldText).length - 1;
      return { html: modified, response: `Replaced "${oldText}" with "${newText}" (${count} occurrence${count > 1 ? 's' : ''})` };
    }
  }

  // Pattern: "change the title/headline to <text>"
  const titleMatch = message.match(/(?:change|update|set)\s+(?:the\s+)?(?:page\s+)?title\s+to\s+"?([^"]+)"?$/i);
  if (titleMatch) {
    const newTitle = titleMatch[1].trim();
    const modified = html.replace(/<title>[^<]*<\/title>/, `<title>${newTitle}</title>`);
    if (modified !== html) {
      return { html: modified, response: `Updated page title to "${newTitle}"` };
    }
  }

  return null; // Can't handle with quick edit
}

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

  // Determine mode: live widget (slug-based) vs dashboard (html/pageId-based)
  let currentHtml = html;
  let page = null;
  let shouldSave = false;

  if (slug) {
    const editKey = process.env.ADMIN_EDIT_KEY;
    if (editKey && adminKey !== editKey) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    page = await getPageBySlug(slug);
    if (!page || !page.html_content) {
      return res.status(404).json({ error: 'Page not found' });
    }
    currentHtml = page.html_content;
    shouldSave = true;
  } else if (pageId && !currentHtml) {
    page = await getPage(pageId);
    if (!page || !page.html_content) {
      return res.status(404).json({ error: 'Page not found' });
    }
    currentHtml = page.html_content;
    shouldSave = true;
  } else if (pageId && currentHtml) {
    shouldSave = true;
  } else if (!currentHtml) {
    return res.status(400).json({ error: 'Either slug, pageId, or html is required' });
  }

  // ─── Try quick edit first (no AI, instant, free) ───
  const quickResult = tryQuickEdit(currentHtml, message);
  if (quickResult) {
    const saveId = page ? page.id : (shouldSave && pageId ? pageId : null);
    let saved = false;
    if (saveId) {
      try {
        await updatePage(saveId, { html_content: quickResult.html });
        saved = true;
      } catch (saveErr) {
        console.error('Failed to save quick edit:', saveErr);
        return res.status(500).json({ error: 'Edit succeeded but failed to save: ' + saveErr.message });
      }
    }
    return res.json({
      success: true,
      html: quickResult.html,
      tokens: 0,
      saved,
      mode: 'quick',
      message: quickResult.response,
      response: saved
        ? `${quickResult.response} — saved!`
        : `${quickResult.response} (click Save to persist)`
    });
  }

  // ─── Use AI with diff-based approach (much cheaper than full regen) ───
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Claude API key not configured' });
  }

  // Truncate HTML context if too large
  let htmlContext = currentHtml;
  const MAX_HTML = 80000;
  if (currentHtml.length > MAX_HTML) {
    const half = Math.floor(MAX_HTML / 2);
    htmlContext = currentHtml.substring(0, half) + '\n\n<!-- ... middle truncated for size ... -->\n\n' + currentHtml.substring(currentHtml.length - half);
  }

  try {
    // Ask Claude for search/replace pairs instead of full HTML
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: `You are an expert web developer. You edit HTML landing pages by returning precise search-and-replace operations.

RESPOND WITH ONLY A JSON OBJECT in this exact format:
{
  "changes": [
    {
      "search": "<exact HTML string to find>",
      "replace": "<exact HTML string to replace with>"
    }
  ],
  "summary": "Brief description of what was changed"
}

RULES:
1. The "search" value must be an EXACT substring of the current HTML — copy it character-for-character
2. Each search string must be unique enough to match only once (include surrounding context if needed)
3. Keep changes minimal — only modify what's needed
4. Preserve all scripts, tracking pixels, and meta tags
5. Maintain responsive design and existing styles
6. Return valid JSON only — no markdown, no code blocks, no explanation outside the JSON
7. For link changes, include the full <a> tag in search/replace
8. For text changes, include the parent element
9. For style changes, include enough context to uniquely identify the element
10. If the change requires adding entirely new sections, use a search string that identifies WHERE to insert and include the surrounding context plus the new content in replace`,
        messages: [{
          role: 'user',
          content: `Here is the current HTML:\n\n${htmlContext}\n\nUser request: ${message}`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: 'Claude API error', details: errText });
    }

    const data = await response.json();
    let responseText = data.content[0].text;

    // Clean up if Claude wrapped in code blocks
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    responseText = responseText.trim();

    let modifiedHtml = currentHtml;
    let changesApplied = 0;
    let summary = '';

    try {
      const diffResult = JSON.parse(responseText);
      summary = diffResult.summary || 'Changes applied';

      if (diffResult.changes && Array.isArray(diffResult.changes)) {
        for (const change of diffResult.changes) {
          if (change.search && typeof change.replace === 'string') {
            if (modifiedHtml.includes(change.search)) {
              modifiedHtml = modifiedHtml.replace(change.search, change.replace);
              changesApplied++;
            } else {
              console.warn('Search string not found in HTML:', change.search.substring(0, 100));
            }
          }
        }
      }
    } catch (parseErr) {
      // If Claude didn't return valid JSON, it probably returned full HTML
      // Fall back to using it as full HTML replacement
      console.warn('Diff parse failed, checking if full HTML was returned');
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        modifiedHtml = responseText;
        changesApplied = 1;
        summary = 'Full page update applied';
      } else {
        return res.status(500).json({
          error: 'Failed to parse AI response. Try rephrasing your request.',
          details: parseErr.message
        });
      }
    }

    if (changesApplied === 0) {
      return res.json({
        success: false,
        html: currentHtml,
        tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        saved: false,
        mode: 'diff',
        message: 'No changes could be applied. The AI could not find the right elements to modify. Try being more specific.',
        response: 'No changes were applied. Try rephrasing your request with more detail.'
      });
    }

    // Save
    const saveId = page ? page.id : (shouldSave && pageId ? pageId : null);
    let saved = false;
    if (saveId) {
      try {
        await updatePage(saveId, { html_content: modifiedHtml });
        saved = true;
      } catch (saveErr) {
        console.error('Failed to save:', saveErr);
        return res.status(500).json({ error: 'Edit succeeded but failed to save: ' + saveErr.message });
      }
    }

    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    res.json({
      success: true,
      html: modifiedHtml,
      tokens,
      saved,
      mode: 'diff',
      changesApplied,
      message: summary,
      response: saved
        ? `${summary} (${changesApplied} change${changesApplied > 1 ? 's' : ''} applied & saved — used ${tokens} tokens)`
        : `${summary} (${changesApplied} change${changesApplied > 1 ? 's' : ''} applied — click Save to persist)`
    });

  } catch (err) {
    console.error('Chat API error:', err);
    res.status(500).json({ error: err.message });
  }
}
