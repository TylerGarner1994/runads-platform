import { sql } from '@vercel/postgres';

/**
 * Strategy Step - Create page outline and messaging strategy
 * Uses Claude Sonnet for strategy generation
 */
export async function runStrategyStep({ job, stepOutputs, additionalInput, jobId }) {
  const { page_type, target_audience, offer_details, template_id } = { ...job, ...additionalInput };
  const researchData = stepOutputs.research?.result?.business_research || {};
  const brandGuide = stepOutputs.brand?.result?.brand_guide || {};

  const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (!claudeApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Get template structure if specified
  let templateStructure = null;
  if (template_id) {
    const templateResult = await sql`SELECT * FROM page_templates WHERE id = ${template_id}`;
    if (templateResult.rows[0]) {
      templateStructure = templateResult.rows[0].section_structure;
    }
  }

  // Get verified claims for this client
  let verifiedClaims = [];
  if (job.client_id) {
    const claimsResult = await sql`
      SELECT claim_text, claim_type, confidence_score
      FROM verified_claims
      WHERE client_id = ${job.client_id} AND verification_status = 'verified'
      ORDER BY confidence_score DESC
      LIMIT 20
    `;
    verifiedClaims = claimsResult.rows;
  }

  const strategyPrompt = `Create a detailed page strategy for a ${page_type} landing page.

BUSINESS RESEARCH:
Company: ${researchData.company_name || 'Unknown'}
Industry: ${researchData.industry || 'Unknown'}
Value Props: ${JSON.stringify(researchData.value_propositions || [])}
Products: ${JSON.stringify(researchData.products?.slice(0, 3) || [])}
Target Audiences: ${JSON.stringify(researchData.target_audiences || [])}
Unique Differentiators: ${JSON.stringify(researchData.unique_differentiators || [])}
Brand Voice: ${researchData.brand_voice || brandGuide.brand_voice?.tone || 'professional'}

${target_audience ? `SPECIFIC TARGET AUDIENCE: ${target_audience}` : ''}
${offer_details ? `OFFER DETAILS: ${offer_details}` : ''}

VERIFIED CLAIMS AVAILABLE (use these, don't make up statistics):
${verifiedClaims.map(c => `- [${c.claim_type}] ${c.claim_text}`).join('\n') || 'No verified claims available - avoid statistics'}

TESTIMONIALS AVAILABLE:
${researchData.testimonials?.slice(0, 3).map(t => `- "${t.quote}" - ${t.author}`).join('\n') || 'None'}

${templateStructure ? `TEMPLATE STRUCTURE TO FOLLOW:\n${JSON.stringify(templateStructure, null, 2)}` : ''}

PAGE TYPE REQUIREMENTS:
${getPageTypeRequirements(page_type)}

Create a comprehensive strategy document in this JSON format:
{
  "page_goal": "The primary conversion goal",
  "target_persona": {
    "description": "Who this page is for",
    "pain_points": ["Their main problems"],
    "desires": ["What they want to achieve"],
    "objections": ["Why they might not convert"]
  },
  "hook": {
    "headline": "Main headline (attention-grabbing, benefit-focused)",
    "subheadline": "Supporting headline",
    "angle": "The psychological angle (curiosity, fear, desire, urgency, etc.)"
  },
  "sections": [
    {
      "name": "section_name",
      "purpose": "What this section accomplishes",
      "key_message": "The main point to communicate",
      "elements": ["List of elements to include"],
      "claims_to_use": ["Which verified claims fit here"]
    }
  ],
  "cta_strategy": {
    "primary_cta": "Main call to action text",
    "secondary_cta": "Alternative/softer CTA",
    "cta_placement": ["Where CTAs should appear"],
    "urgency_element": "How to create urgency (if applicable)"
  },
  "objection_handling": [
    {
      "objection": "Potential objection",
      "counter": "How to address it",
      "where": "Section where this is addressed"
    }
  ],
  "social_proof_strategy": {
    "testimonials_to_highlight": ["Which testimonials to use"],
    "trust_signals": ["What trust elements to include"],
    "placement": ["Where social proof appears"]
  },
  "tone_guidelines": {
    "voice": "How to sound",
    "words_to_use": ["Preferred terminology"],
    "words_to_avoid": ["What not to say"]
  }
}

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
      max_tokens: 3000,
      messages: [
        { role: 'user', content: strategyPrompt }
      ]
    })
  });

  const claudeData = await claudeResponse.json();
  const responseText = claudeData.content?.[0]?.text || '';

  // Parse strategy
  let strategy;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (parseError) {
    console.error('Error parsing strategy:', parseError);
    strategy = { raw_response: responseText };
  }

  const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

  return {
    data: {
      strategy,
      sections_planned: strategy.sections?.length || 0,
      verified_claims_available: verifiedClaims.length
    },
    tokens_used: tokensUsed
  };
}

function getPageTypeRequirements(pageType) {
  const requirements = {
    advertorial: `
ADVERTORIAL REQUIREMENTS:
- Must read like editorial content, not an ad
- Use a story/discovery narrative structure
- Include "expert" or "journalist" voice
- Problem > Discovery > Solution > Results flow
- Native ad styling (looks like news article)
- Social proof interwoven throughout
- Soft CTAs building to harder CTA at end
- 1500-2500 words typical length`,

    listicle: `
LISTICLE REQUIREMENTS:
- Numbered list format (5-10 items)
- Each item has hook headline + explanation
- Mix of tips, with product as one item (native integration)
- Engaging subheadings for each item
- Easy to scan/skim
- CTA after revealing product item
- 800-1500 words typical length`,

    quiz: `
QUIZ REQUIREMENTS:
- 5-10 engaging questions
- Questions reveal pain points and desires
- Personalized result based on answers
- Result leads to product recommendation
- Email capture before/after results
- Share-worthy results
- Mobile-optimized question flow`,

    vip: `
VIP PAGE REQUIREMENTS:
- Exclusive/luxury feel
- Limited availability messaging
- Premium benefits highlighted
- Social proof from similar customers
- Clear value proposition for "elite" offer
- Urgency elements (limited spots, deadline)
- Single focused CTA
- 500-1000 words typical length`,

    calculator: `
CALCULATOR REQUIREMENTS:
- Interactive input fields
- Real-time calculation display
- Personalized results based on inputs
- Before/after or savings comparison
- Visual representation of results
- CTA based on calculated value
- Mobile-friendly inputs`
  };

  return requirements[pageType] || requirements.advertorial;
}
