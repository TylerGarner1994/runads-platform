import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

/**
 * Research Step - Deep business research
 * Scrapes multiple pages and extracts comprehensive business information
 */
export async function runResearchStep({ job, stepOutputs, additionalInput, jobId }) {
  // Debug logging to trace URL passing
  console.log('Research step received:', {
    jobId,
    jobWebsiteUrl: job?.website_url,
    additionalInputUrl: additionalInput?.url,
    stepOutputsConfig: stepOutputs?._config,
    stepOutputsKeys: Object.keys(stepOutputs || {}),
    stepOutputsType: typeof stepOutputs,
    stepOutputsStringified: JSON.stringify(stepOutputs)?.substring(0, 500)
  });

  const { website_url, target_audience, offer_details } = { ...job, ...additionalInput };

  // Look for URL in multiple places - with detailed logging
  let url = website_url || additionalInput?.url || stepOutputs?._config?.website_url || job?.website_url;

  console.log('URL resolution:', {
    fromJobSpread: website_url,
    fromAdditionalInput: additionalInput?.url,
    fromStepOutputsConfig: stepOutputs?._config?.website_url,
    fromJobDirect: job?.website_url,
    resolved: url
  });

  // Try to extract URL from offer_details if it contains one
  if (!url && offer_details) {
    const urlMatch = offer_details.match(/https?:\/\/[^\s,]+/);
    if (urlMatch) {
      url = urlMatch[0];
      console.log('Extracted URL from offer_details:', url);
    }
  }

  if (!url) {
    // Detailed error with context
    throw new Error(`Website URL is required for research step. Debug: stepOutputs=${JSON.stringify(stepOutputs)?.substring(0, 200)}, job.website_url=${job?.website_url}`);
  }
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Step 1: Fetch the main page and discover additional pages
  const pagesToScrape = [url];
  const scrapedContent = {};

  // Fetch main page first
  try {
    const mainContent = await fetchAndExtractContent(url);
    scrapedContent[url] = mainContent;

    // Extract links to about, products, testimonials pages
    const additionalPages = extractRelevantLinks(mainContent.html, url);
    pagesToScrape.push(...additionalPages.slice(0, 4)); // Max 5 total pages
  } catch (error) {
    console.error('Error fetching main page:', error.message);
  }

  // Fetch additional pages
  for (const pageUrl of pagesToScrape.slice(1)) {
    try {
      const content = await fetchAndExtractContent(pageUrl);
      scrapedContent[pageUrl] = content;
    } catch (error) {
      console.error(`Error fetching ${pageUrl}:`, error.message);
    }
  }

  // Step 2: Send to Gemini for structured extraction
  const combinedText = Object.entries(scrapedContent)
    .map(([pageUrl, content]) => `=== PAGE: ${pageUrl} ===\n${content.text}`)
    .join('\n\n');

  const geminiPrompt = `Analyze this business website content and extract structured information.

WEBSITE CONTENT:
${combinedText.substring(0, 50000)}

${target_audience ? `TARGET AUDIENCE HINT: ${target_audience}` : ''}
${offer_details ? `OFFER DETAILS HINT: ${offer_details}` : ''}

Extract and return a JSON object with this structure:
{
  "company_name": "string",
  "industry": "string (e.g., health, beauty, finance, tech, ecommerce)",
  "tagline": "string or null",
  "value_propositions": ["list of key value props"],
  "products": [
    {
      "name": "string",
      "description": "string",
      "price": "string or null",
      "key_features": ["list"],
      "benefits": ["list"]
    }
  ],
  "target_audiences": [
    {
      "segment": "string",
      "pain_points": ["list"],
      "desires": ["list"]
    }
  ],
  "testimonials": [
    {
      "quote": "exact quote",
      "author": "name",
      "role_or_context": "string or null",
      "source_url": "url where found"
    }
  ],
  "statistics": [
    {
      "claim": "the statistic or number",
      "context": "what it refers to",
      "source_url": "url where found"
    }
  ],
  "trust_signals": ["awards, certifications, media mentions, etc."],
  "brand_voice": "description of writing style and tone",
  "unique_differentiators": ["what sets them apart"]
}

Return ONLY valid JSON.`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: geminiPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096
        }
      })
    }
  );

  const geminiData = await geminiResponse.json();
  const extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse the JSON response
  let businessResearch;
  try {
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    businessResearch = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (parseError) {
    console.error('Error parsing Gemini response:', parseError);
    businessResearch = { raw_response: extractedText };
  }

  // Step 3: Store the research in the database
  const now = new Date().toISOString();

  if (job.client_id) {
    // Update existing client
    await sql`
      UPDATE clients
      SET
        business_research = ${JSON.stringify(businessResearch)}::jsonb,
        source_content = ${JSON.stringify(scrapedContent)}::jsonb,
        research_status = 'completed',
        last_researched_at = ${now},
        updated_at = ${now}
      WHERE id = ${job.client_id}
    `;
  } else if (additionalInput.create_client !== false) {
    // Create new client
    const clientId = uuidv4();
    await sql`
      INSERT INTO clients (id, name, website_url, industry, business_research, source_content, research_status, last_researched_at, created_at, updated_at)
      VALUES (
        ${clientId},
        ${businessResearch.company_name || 'New Client'},
        ${url},
        ${businessResearch.industry || null},
        ${JSON.stringify(businessResearch)}::jsonb,
        ${JSON.stringify(scrapedContent)}::jsonb,
        'completed',
        ${now},
        ${now},
        ${now}
      )
    `;

    // Update job with client_id
    await sql`UPDATE page_generation_jobs SET client_id = ${clientId} WHERE id = ${jobId}`;
  }

  // Step 4: Extract and store verified facts
  if (job.client_id || additionalInput.create_client !== false) {
    const clientId = job.client_id || (await sql`SELECT id FROM clients WHERE website_url = ${url} ORDER BY created_at DESC LIMIT 1`).rows[0]?.id;

    if (clientId) {
      // Store testimonials as verified claims
      for (const testimonial of (businessResearch.testimonials || [])) {
        const claimId = uuidv4();
        await sql`
          INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
          VALUES (
            ${claimId},
            ${clientId},
            ${testimonial.quote},
            'testimonial',
            ${testimonial.source_url || url},
            ${JSON.stringify(testimonial)},
            'verified',
            0.9,
            ${now},
            ${now}
          )
        `;
      }

      // Store statistics as verified claims
      for (const stat of (businessResearch.statistics || [])) {
        const claimId = uuidv4();
        await sql`
          INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
          VALUES (
            ${claimId},
            ${clientId},
            ${stat.claim},
            'statistic',
            ${stat.source_url || url},
            ${JSON.stringify(stat)},
            'verified',
            0.8,
            ${now},
            ${now}
          )
        `;
      }
    }
  }

  return {
    data: {
      business_research: businessResearch,
      pages_scraped: Object.keys(scrapedContent).length,
      testimonials_found: businessResearch.testimonials?.length || 0,
      statistics_found: businessResearch.statistics?.length || 0
    },
    tokens_used: geminiData.usageMetadata?.totalTokenCount || 2000
  };
}

async function fetchAndExtractContent(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RunAdsBot/1.0; +https://runads-platform.vercel.app)'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract text content
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 30000);

    return { html, text };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function extractRelevantLinks(html, baseUrl) {
  const links = [];
  const baseUrlObj = new URL(baseUrl);

  // Match href attributes
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];

    // Skip external links, anchors, and non-html links
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') ||
        href.includes('.pdf') || href.includes('.jpg') || href.includes('.png')) {
      continue;
    }

    try {
      const fullUrl = new URL(href, baseUrl);

      // Only same-domain links
      if (fullUrl.hostname !== baseUrlObj.hostname) {
        continue;
      }

      const path = fullUrl.pathname.toLowerCase();

      // Look for relevant pages
      if (path.includes('about') || path.includes('product') || path.includes('service') ||
          path.includes('testimonial') || path.includes('review') || path.includes('pricing') ||
          path.includes('feature') || path.includes('benefit') || path.includes('story') ||
          path.includes('team') || path.includes('mission') || path.includes('why')) {
        links.push(fullUrl.toString());
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // Deduplicate and limit
  return [...new Set(links)].slice(0, 4);
}
