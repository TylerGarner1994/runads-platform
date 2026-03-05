import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { callClaudeWithFallback } from '../../lib/claude.js';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { client_id, objective } = req.body;

    if (!client_id) {
      return res.status(400).json({ success: false, error: 'client_id is required' });
    }

    // Load client data
    const clientResult = await sql`SELECT * FROM clients WHERE id = ${client_id}`;
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const client = clientResult.rows[0];
    const businessResearch = typeof client.business_research === 'string'
      ? (() => { try { return JSON.parse(client.business_research); } catch (e) { return {}; } })()
      : client.business_research || {};

    // Build prompt for Claude to generate brief fields
    const baseSystemPrompt = 'You are an expert campaign strategist who builds comprehensive advertising campaign briefs based on business research data.';

    const userPrompt = `Based on the following business research data, generate a complete campaign brief.

BUSINESS DATA:
Company: ${client.name}
Industry: ${client.industry || businessResearch.industry || 'Unknown'}
Website: ${client.website_url || client.website || 'N/A'}
Value Propositions: ${JSON.stringify(businessResearch.value_propositions || [])}
Products/Services: ${JSON.stringify(businessResearch.products || [])}
Target Audiences: ${JSON.stringify(businessResearch.target_audiences || [])}
Brand Voice: ${businessResearch.brand_voice || 'Professional'}
Unique Differentiators: ${JSON.stringify(businessResearch.unique_differentiators || [])}

Campaign Objective: ${objective || 'Drive conversions and brand awareness'}

Generate a campaign brief with the following fields. Return ONLY valid JSON:

{
  "name": "A descriptive campaign name",
  "objective": "Clear campaign objective statement",
  "target_audience": [
    {
      "segment": "Segment name",
      "demographics": "Age, gender, location details",
      "interests": ["interest1", "interest2"],
      "pain_points": ["pain1", "pain2"]
    }
  ],
  "messaging": {
    "primary_message": "The core message",
    "supporting_points": ["point1", "point2", "point3"],
    "tone": "Recommended tone",
    "hooks": ["hook1", "hook2", "hook3"]
  },
  "platforms": [
    {
      "name": "Platform name (e.g. Facebook, Instagram, Google)",
      "rationale": "Why this platform",
      "ad_formats": ["format1", "format2"]
    }
  ],
  "budget": {
    "recommended_daily": 50,
    "recommended_monthly": 1500,
    "allocation": {
      "prospecting": 60,
      "retargeting": 25,
      "brand": 15
    }
  },
  "timeline": {
    "phase_1": { "name": "Launch", "duration": "2 weeks", "focus": "Testing" },
    "phase_2": { "name": "Optimize", "duration": "4 weeks", "focus": "Scale winners" },
    "phase_3": { "name": "Scale", "duration": "Ongoing", "focus": "Maximize ROI" }
  }
}`;

    const { text: responseText, tokensUsed, json: parsedJson } = await callClaudeWithFallback({
      systemPrompt: baseSystemPrompt,
      baseSystemPrompt,
      userPrompt,
      model: 'claude-sonnet-4-6',
      maxTokens: 4000
    });

    const briefData = parsedJson || {};

    // Save the generated brief
    const id = uuidv4();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO campaign_briefs (id, client_id, name, status, objective, budget, timeline, target_audience, messaging, platforms, created_at, updated_at)
      VALUES (
        ${id},
        ${client_id},
        ${briefData.name || `${client.name} Campaign Brief`},
        'draft',
        ${briefData.objective || objective || null},
        ${JSON.stringify(briefData.budget || {})}::jsonb,
        ${JSON.stringify(briefData.timeline || {})}::jsonb,
        ${JSON.stringify(briefData.target_audience || [])}::jsonb,
        ${JSON.stringify(briefData.messaging || {})}::jsonb,
        ${JSON.stringify(briefData.platforms || [])}::jsonb,
        ${now},
        ${now}
      )
    `;

    const result = await sql`SELECT cb.*, c.name as client_name FROM campaign_briefs cb LEFT JOIN clients c ON cb.client_id = c.id WHERE cb.id = ${id}`;

    return res.status(201).json({
      success: true,
      brief: result.rows[0],
      tokens_used: tokensUsed
    });

  } catch (error) {
    console.error('Brief generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
