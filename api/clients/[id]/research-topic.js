// RunAds - Targeted Topic Research (Powered by Perplexity)
// Researches a specific topic/question for a client and saves findings as verified claims
// Example: "How many Americans suffer from chronic inflammation?" + "Benefits of turmeric curcumin"

export const config = { maxDuration: 120 };

import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch (e2) {}
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch (e3) {}
    }
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { id: clientId } = req.query;
  if (!clientId) return res.status(400).json({ success: false, error: 'Client ID is required' });

  const { topic, context } = req.body;
  if (!topic) return res.status(400).json({ success: false, error: 'Topic is required. Describe what you want to research.' });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'PERPLEXITY_API_KEY not configured' });

  try {
    // Get client info for context
    const clientResult = await sql`SELECT name, website_url, industry FROM clients WHERE id = ${clientId}`;
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    const client = clientResult.rows[0];

    console.log(`[Research-Topic] Researching "${topic}" for ${client.name}`);

    // Call Perplexity with the specific research topic
    const systemPrompt = `You are a market research analyst specializing in finding verified facts, statistics, and evidence-based claims for advertising and marketing copy.

Your job is to research a specific topic and return factual, citation-backed findings that can be used in landing pages and ad copy.

Always prioritize:
- Official statistics from government agencies, medical journals, and industry reports
- Recent data (within the last 3 years)
- Specific numbers and percentages
- Named sources (studies, organizations, publications)

Return ONLY valid JSON.`;

    const userPrompt = `Research the following topic for "${client.name}" (${client.industry || 'general'} industry):

TOPIC: ${topic}

${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

Find verified facts, statistics, and evidence-based claims related to this topic. Search for:
1. Key statistics and data points (with specific numbers)
2. Scientific studies or research findings
3. Industry reports or expert opinions
4. Trends and market data

Return a JSON object:
{
  "findings": [
    {
      "type": "statistic|study|fact|trend",
      "claim": "The specific fact or statistic (be precise with numbers)",
      "source": "Where this comes from (study name, organization, publication)",
      "source_url": "URL if available",
      "year": "Year of the data",
      "relevance": "How this is relevant to ${client.name}'s marketing",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "2-3 sentence overview of findings",
  "suggested_claims": [
    "Ready-to-use marketing claims based on the research (suitable for ad copy)"
  ],
  "related_topics": ["Other topics worth researching based on these findings"]
}

Find at least 5-8 findings if possible. Be specific with numbers and sources.`;

    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
        temperature: 0.2,
        search_mode: 'web',
        web_search_options: { search_context_size: 'high' },
        return_related_questions: false
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Perplexity API error ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content;
    const citations = data.citations || [];
    const usage = data.usage || {};

    if (!text) throw new Error('Empty response from Perplexity');

    const results = parseJSON(text);
    if (!results) throw new Error('Failed to parse research results');

    // Save findings as verified claims
    const now = new Date().toISOString();
    let claimsCreated = 0;

    for (const finding of (results.findings || [])) {
      if (!finding.claim) continue;
      const claimId = uuidv4();
      const confidenceScore = finding.confidence === 'high' ? 0.95 :
                              finding.confidence === 'medium' ? 0.8 : 0.6;

      try {
        await sql`
          INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
          VALUES (
            ${claimId}, ${clientId},
            ${finding.claim},
            ${finding.type === 'statistic' ? 'statistic' : 'claim'},
            ${finding.source_url || null},
            ${JSON.stringify({
              source: finding.source,
              year: finding.year,
              relevance: finding.relevance,
              type: finding.type,
              research_topic: topic
            })},
            'verified',
            ${confidenceScore},
            ${now}, ${now}
          )
          ON CONFLICT DO NOTHING
        `;
        claimsCreated++;
      } catch (e) {
        console.warn('Failed to insert finding:', e.message);
      }
    }

    // Also save suggested marketing claims
    for (const claim of (results.suggested_claims || [])) {
      if (!claim) continue;
      const claimId = uuidv4();
      try {
        await sql`
          INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
          VALUES (
            ${claimId}, ${clientId},
            ${claim},
            'claim',
            ${null},
            ${JSON.stringify({ type: 'suggested_marketing_claim', research_topic: topic })}::text,
            'verified',
            ${0.85},
            ${now}, ${now}
          )
          ON CONFLICT DO NOTHING
        `;
        claimsCreated++;
      } catch (e) {
        console.warn('Failed to insert suggested claim:', e.message);
      }
    }

    console.log(`[Research-Topic] Found ${results.findings?.length || 0} findings, saved ${claimsCreated} claims`);

    return res.status(200).json({
      success: true,
      topic,
      findings: results.findings || [],
      summary: results.summary,
      suggested_claims: results.suggested_claims || [],
      related_topics: results.related_topics || [],
      claims_created: claimsCreated,
      citations: citations.length,
      tokens_used: usage.total_tokens || 0
    });

  } catch (error) {
    console.error('Research-Topic API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
