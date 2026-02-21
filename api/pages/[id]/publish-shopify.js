// RunAds - Publish Landing Page to Shopify
// Creates/updates a page in a Shopify store via the REST Admin API
// Requires: SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN in env vars
//
// Setup: In Shopify Admin > Settings > Apps > Develop Apps > Create Custom App
// - Enable "write_content" scope
// - Install the app and copy the access token

export const config = { maxDuration: 30 };

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { id: pageId } = req.query;
  if (!pageId) return res.status(400).json({ success: false, error: 'Page ID is required' });

  const shopifyStore = process.env.SHOPIFY_STORE_URL; // e.g., "your-store.myshopify.com"
  const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopifyStore || !shopifyToken) {
    return res.status(400).json({
      success: false,
      error: 'Shopify not configured. Add SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN in Vercel environment variables.',
      setup_instructions: {
        step1: 'Go to your Shopify Admin > Settings > Apps and sales channels > Develop apps',
        step2: 'Click "Allow custom app development" if needed',
        step3: 'Create a custom app named "RunAds Platform"',
        step4: 'Under Admin API access, enable "write_content" scope',
        step5: 'Install the app and copy the access token',
        step6: 'Add SHOPIFY_STORE_URL (e.g., your-store.myshopify.com) and SHOPIFY_ACCESS_TOKEN to Vercel env vars'
      }
    });
  }

  try {
    // Get the page from our database
    const pageResult = await sql`SELECT * FROM landing_pages WHERE id = ${pageId}`;
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    const page = pageResult.rows[0];

    if (!page.html_content) {
      return res.status(400).json({ success: false, error: 'Page has no HTML content to publish' });
    }

    // Get optional overrides from request body
    const { title, handle, template_suffix, published } = req.body || {};

    // Clean the HTML: strip any contenteditable artifacts
    let cleanHtml = page.html_content;
    cleanHtml = cleanHtml.replace(/<script>[\s\S]*?contentEditable[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style>\s*\[contenteditable\][\s\S]*?<\/style>/gi, '');
    cleanHtml = cleanHtml.replace(/\s*contenteditable="true"/gi, '');
    cleanHtml = cleanHtml.replace(/\s*style="outline:\s*(?:none|2px solid[^"]*);?\s*(?:outline-offset:\s*2px;?)?\s*"/gi, '');

    // Extract just the <body> content if it's a full HTML page
    // Shopify pages expect content, not a full HTML document
    let bodyContent = cleanHtml;
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1].trim();
    }

    // Extract <style> blocks from <head> to prepend to body content
    const headStyles = cleanHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
    const headStyleContent = headStyles.join('\n');

    // If body content doesn't already include the styles, prepend them
    if (headStyleContent && !bodyContent.includes(headStyleContent.substring(0, 50))) {
      bodyContent = headStyleContent + '\n' + bodyContent;
    }

    // Generate handle from slug or title
    const pageHandle = handle || page.slug ||
      (page.title || 'landing-page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if we've already published this page (stored in metadata)
    const shopifyPageId = page.shopify_page_id;

    const shopifyApiUrl = `https://${shopifyStore}/admin/api/2025-01/pages${shopifyPageId ? `/${shopifyPageId}` : ''}.json`;
    const method = shopifyPageId ? 'PUT' : 'POST';

    const shopifyPayload = {
      page: {
        title: title || page.title || 'Landing Page',
        handle: pageHandle,
        body_html: bodyContent,
        published: published !== false, // Default to published
        ...(template_suffix ? { template_suffix } : {})
      }
    };

    console.log(`[Shopify] ${method} page "${shopifyPayload.page.title}" to ${shopifyStore} (handle: ${pageHandle})`);

    const shopifyRes = await fetch(shopifyApiUrl, {
      method,
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shopifyPayload)
    });

    const shopifyData = await shopifyRes.json();

    if (!shopifyRes.ok) {
      console.error('[Shopify] API error:', JSON.stringify(shopifyData));
      return res.status(shopifyRes.status).json({
        success: false,
        error: `Shopify API error: ${shopifyData.errors ? JSON.stringify(shopifyData.errors) : shopifyRes.statusText}`,
        shopify_response: shopifyData
      });
    }

    const createdPage = shopifyData.page;

    // Save the Shopify page ID back to our database for future updates
    const now = new Date().toISOString();
    try {
      await sql`
        UPDATE landing_pages
        SET
          shopify_page_id = ${String(createdPage.id)},
          shopify_url = ${`https://${shopifyStore}/pages/${createdPage.handle}`},
          updated_at = ${now}
        WHERE id = ${pageId}
      `;
    } catch (dbErr) {
      // If columns don't exist yet, just log and continue
      console.warn('[Shopify] Could not save Shopify IDs to DB (columns may not exist yet):', dbErr.message);
    }

    const pageUrl = `https://${shopifyStore}/pages/${createdPage.handle}`;
    console.log(`[Shopify] ${shopifyPageId ? 'Updated' : 'Created'} page: ${pageUrl}`);

    return res.status(200).json({
      success: true,
      message: shopifyPageId ? 'Page updated in Shopify' : 'Page published to Shopify',
      shopify_page: {
        id: createdPage.id,
        title: createdPage.title,
        handle: createdPage.handle,
        url: pageUrl,
        published_at: createdPage.published_at,
        created_at: createdPage.created_at
      }
    });

  } catch (error) {
    console.error('Shopify publish error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
