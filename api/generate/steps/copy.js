import { sql } from '@vercel/postgres';

/**
 * Copy Step - Generate all page copy based on strategy
 * Uses Claude Sonnet for high-quality copywriting
 */
export async function runCopyStep({ job, stepOutputs, additionalInput, jobId }) {
  const { page_type } = job;
  const strategy = stepOutputs.strategy?.result?.strategy || {};
  const researchData = stepOutputs.research?.result?.business_research || {};
  const brandGuide = stepOutputs.brand?.result?.brand_guide || {};

  const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (!claudeApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Get verified claims for fact-checking
  let verifiedClaims = [];
  if (job.client_id) {
    const claimsResult = await sql`
      SELECT claim_text, claim_type, source_url
      FROM verified_claims
      WHERE client_id = ${job.client_id} AND verification_status = 'verified'
    `;
    verifiedClaims = claimsResult.rows;
  }

  const copyPrompt = `Write compelling copy for a ${page_type} landing page following this strategy.

STRATEGY DOCUMENT:
${JSON.stringify(strategy, null, 2)}

BUSINESS INFORMATION:
Company: ${researchData.company_name || 'Unknown'}
Products: ${JSON.stringify(researchData.products?.slice(0, 2) || [])}
Value Props: ${JSON.stringify(researchData.value_propositions || [])}

BRAND VOICE:
Tone: ${strategy.tone_guidelines?.voice || brandGuide.brand_voice?.tone || 'professional'}
Words to use: ${JSON.stringify(strategy.tone_guidelines?.words_to_use || [])}
Words to avoid: ${JSON.stringify(strategy.tone_guidelines?.words_to_avoid || [])}

VERIFIED CLAIMS (ONLY use these - do not invent statistics or quotes):
${verifiedClaims.map(c => `- [${c.claim_type}] ${c.claim_text}`).join('\n') || 'IMPORTANT: No verified claims available. Do NOT include any statistics, percentages, or specific numbers. Do NOT invent testimonial quotes.'}

VERIFIED TESTIMONIALS:
${researchData.testimonials?.map(t => `- "${t.quote}" - ${t.author}`).join('\n') || 'No verified testimonials - do not invent quotes'}

CRITICAL RULES:
1. NEVER invent statistics, percentages, or numbers that aren't in the verified claims
2. NEVER create fake testimonial quotes
3. If you need a statistic that isn't verified, mark it as [NEEDS VERIFICATION: describe what stat would go here]
4. Use benefit-focused language instead of unverified claims
5. Write in the brand voice consistently
6. NEVER use em dashes. Use commas, periods, semicolons, or " - " (space-dash-space) instead.

Write the complete copy for each section in this JSON format:
{
  "meta": {
    "title": "SEO page title (60 chars max)",
    "description": "Meta description (160 chars max)"
  },
  "hero": {
    "headline": "Main headline",
    "subheadline": "Supporting headline",
    "cta_text": "Button text",
    "cta_subtext": "Text below button (optional)"
  },
  "sections": [
    {
      "id": "section_id",
      "type": "content|testimonial|features|benefits|faq|cta|social_proof",
      "headline": "Section headline (if applicable)",
      "subheadline": "Section subheadline (if applicable)",
      "content": "Main content - can be paragraphs, list items, etc.",
      "items": [
        {
          "headline": "Item headline",
          "description": "Item description"
        }
      ],
      "cta": {
        "text": "CTA text",
        "subtext": "Supporting text"
      },
      "testimonials": [
        {
          "quote": "Exact verified quote",
          "author": "Name",
          "role": "Title/context"
        }
      ]
    }
  ],
  "footer_cta": {
    "headline": "Final CTA headline",
    "subheadline": "Final supporting text",
    "cta_text": "Button text"
  },
  "unverified_claims": ["List any claims marked as NEEDS VERIFICATION"]
}

${getPageTypeCopyGuidelines(page_type)}

Return ONLY valid JSON.`;

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      messages: [
        { role: 'user', content: copyPrompt }
      ]
    })
  });

  const claudeData = await claudeResponse.json();
  const responseText = claudeData.content?.[0]?.text || '';

  // Parse copy
  let copy;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    copy = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (parseError) {
    console.error('Error parsing copy:', parseError);
    copy = { raw_response: responseText };
  }

  const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

  // Count unverified claims
  const unverifiedCount = copy.unverified_claims?.length || 0;

  return {
    data: {
      copy,
      sections_written: copy.sections?.length || 0,
      unverified_claims: copy.unverified_claims || [],
      needs_fact_check: unverifiedCount > 0
    },
    tokens_used: tokensUsed
  };
}

function getPageTypeCopyGuidelines(pageType) {
  const guidelines = {
    advertorial: `
ADVERTORIAL COPY GUIDELINES:
- Write in third-person journalistic style
- Start with a compelling story or hook
- Build credibility with expert positioning
- Weave product naturally into the narrative
- Include "discovery" moment
- Build to emotional climax
- End with soft-then-hard CTA sequence
- 1500-2500 words total`,

    listicle: `
LISTICLE COPY GUIDELINES:
- Create curiosity-inducing numbered headlines
- Each item should stand alone but build momentum
- Mix of actionable tips and insights
- Product appears naturally as one item (not first or last)
- Conversational, helpful tone
- Quick wins early, bigger value later
- 100-200 words per item`,

    quiz: `
QUIZ COPY GUIDELINES:
- Questions should feel insightful, not salesy
- Use "you" language throughout
- Questions reveal pain points subtly
- Result copy should feel personalized
- Include share-worthy insights
- Result leads naturally to product fit
- Keep questions concise (under 100 chars)`,

    vip: `
VIP COPY GUIDELINES:
- Exclusive, premium language
- "You've been selected" framing
- Emphasize scarcity and urgency
- Highlight VIP-only benefits
- Use aspirational language
- Social proof from similar successful people
- Single, clear value proposition
- 500-800 words total`,

    calculator: `
CALCULATOR COPY GUIDELINES:
- Clear input field labels
- Helpful placeholder text
- Results framed as savings/gains
- Before/after comparison language
- Personalized recommendation copy
- Clear next step CTA
- Mobile-friendly short labels`
  };

  return guidelines[pageType] || guidelines.advertorial;
}
