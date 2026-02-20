import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query; // client_id

  if (!id) {
    return res.status(400).json({ success: false, error: 'Client ID is required' });
  }

  try {
    // Get client
    const clientResult = await sql`SELECT * FROM clients WHERE id = ${id}`;
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    if (!client.website_url) {
      return res.status(400).json({ success: false, error: 'Client has no website URL configured' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not configured' });
    }

    // Fetch and scrape website - normalize URL
    let url = client.website_url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const scrapedContent = {};

    // Fetch main page
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RunAdsBot/1.0; +https://runads-platform.vercel.app)'
        }
      });
      const html = await response.text();
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 30000);

      scrapedContent[url] = { html, text };
    } catch (error) {
      console.error('Error fetching website:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch website: ' + error.message });
    }

    // Use Gemini for extraction
    const combinedText = Object.entries(scrapedContent)
      .map(([pageUrl, content]) => `=== PAGE: ${pageUrl} ===\n${content.text}`)
      .join('\n\n');

    const geminiPrompt = `Analyze this business website content and extract structured information.

WEBSITE CONTENT:
${combinedText.substring(0, 50000)}

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

    // Update client with research
    const now = new Date().toISOString();
    await sql`
      UPDATE clients
      SET
        business_research = ${JSON.stringify(businessResearch)}::jsonb,
        source_content = ${JSON.stringify(scrapedContent)}::jsonb,
        industry = COALESCE(${businessResearch.industry || null}, industry),
        research_status = 'completed',
        last_researched_at = ${now},
        updated_at = ${now}
      WHERE id = ${id}
    `;

    // Store testimonials and statistics as verified claims
    if (businessResearch.testimonials) {
      for (const testimonial of businessResearch.testimonials) {
        const claimId = uuidv4();
        await sql`
          INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
          VALUES (
            ${claimId},
            ${id},
            ${testimonial.quote},
            'testimonial',
            ${testimonial.source_url || url},
            ${JSON.stringify(testimonial)},
            'verified',
            0.9,
            ${now},
            ${now}
          )
          ON CONFLICT DO NOTHING
        `;
      }
    }

    if (businessResearch.statistics) {
      for (const stat of businessResearch.statistics) {
        const claimId = uuidv4();
        await sql`
          INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
          VALUES (
            ${claimId},
            ${id},
            ${stat.claim},
            'statistic',
            ${stat.source_url || url},
            ${JSON.stringify(stat)},
            'verified',
            0.8,
            ${now},
            ${now}
          )
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Research completed',
      business_research: businessResearch,
      pages_scraped: Object.keys(scrapedContent).length
    });

  } catch (error) {
    console.error('Research API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
