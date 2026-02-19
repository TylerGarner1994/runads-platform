import { sql } from '@vercel/postgres';

/**
 * Copy Step - Generate all page copy based on strategy
 * Uses Claude Sonnet for high-quality copywriting
 * v2.0 - Richer section-specific copy, more sections, higher token budget
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

  // Build a rich copy prompt with system + user prompt architecture
  const systemPrompt = getCopySystemPrompt(page_type);

  const userPrompt = buildCopyUserPrompt({
    page_type,
    strategy,
    researchData,
    brandGuide,
    verifiedClaims
  });

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
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

// ============================================================
// COPY SYSTEM PROMPT
// ============================================================
function getCopySystemPrompt(pageType) {
  const base = `You are an elite direct-response copywriter who has written copy for brands generating $100M+ in revenue. Your copy converts at 2-5x industry averages.

## COPYWRITING PRINCIPLES
1. Lead with emotion, support with logic
2. Every headline must stop the scroll and create curiosity
3. Use the PAS framework (Problem-Agitate-Solution) throughout
4. Write in the reader's language - not corporate speak
5. Every section must have a clear purpose and flow naturally to the next
6. Use power words: "discover", "proven", "exclusive", "breakthrough", "finally"
7. Include specific numbers and details for credibility
8. NEVER use em dashes. Use commas, periods, semicolons, or " - " instead.
9. NEVER invent statistics or testimonial quotes that aren't provided
10. Write 1500-3000 words of total copy for maximum page substance

## OUTPUT FORMAT
Return your copy as valid JSON matching the exact schema provided in the user prompt.
`;

  const pageSpecific = {
    advertorial: `${base}

## ADVERTORIAL COPYWRITING MASTERY
You're writing a native advertorial that reads like premium editorial journalism - NOT a sales letter.

### Tone & Style
- Write in third-person journalistic style (like NY Times or Forbes)
- Use a credible byline (Dr., researcher, health editor, etc.)
- Create a narrative arc: character + struggle + discovery + transformation
- Build credibility through expert positioning and specific details
- The sell should feel like a "recommendation" not a "pitch"

### Story Structure
1. Open with a relatable patient/customer story (use a realistic name, age, specific details)
2. Establish the problem as a widespread issue (cite scope/scale)
3. Introduce why conventional approaches fail
4. Present the "discovery" moment - how an expert found the answer
5. Reveal the solution through scientific/mechanism explanation
6. Show proof through multiple transformation stories
7. Remove risk with guarantees
8. Close with urgency and clear CTA

### Word Count Target: 2000-3000 words across all sections`,

    listicle: `${base}

## LISTICLE COPYWRITING MASTERY
You're writing a helpful advice article with one tip being a natural product recommendation.

### Tone & Style
- Write as a helpful friend sharing insider tips
- Conversational, practical, actionable
- Each tip should provide genuine standalone value
- The product tip (#3) should feel like a natural discovery, not an ad

### Structure
- 6-8 total tips (only tip #3 is the product)
- Each tip: compelling headline + 100-200 words of actionable advice
- Product tip includes comparison data and social proof
- Mix of quick wins and deeper insights

### Word Count Target: 1500-2500 words across all sections`,

    quiz: `${base}

## QUIZ COPYWRITING MASTERY
You're writing copy for a personalized recommendation quiz funnel.

### Tone & Style
- Friendly, curious, engaging
- Questions that make the reader feel understood
- Results that feel personalized and insightful
- CTA that feels like a natural next step

### Structure
- Welcome screen with social proof and time commitment
- 6-8 questions that subtly qualify the lead
- Email capture with clear value exchange
- Results page with personalized recommendation

### Word Count Target: 800-1200 words across all sections`,

    vip: `${base}

## VIP PAGE COPYWRITING MASTERY
You're writing copy for an exclusive insider/VIP signup page.

### Tone & Style
- Exclusive, premium language
- Create FOMO and urgency
- Emphasize what members GET (not what you want)
- Community and belonging

### Structure
- Hero with exclusivity hook and member count
- 6 clear VIP benefits with emotional framing
- Social proof from existing members
- Urgency-driven final CTA

### Word Count Target: 600-1000 words across all sections`,

    calculator: `${base}

## CALCULATOR COPYWRITING MASTERY
You're writing copy for an interactive savings calculator.

### Tone & Style
- Bold, challenger brand positioning
- Accusatory toward industry overcharging
- Empowering for the consumer
- Specific dollar amounts

### Structure
- Hero challenging the status quo
- Calculator context and setup
- How it works explanation
- Trust building with metrics
- Bold CTA to take action

### Word Count Target: 600-1000 words across all sections`
  };

  return pageSpecific[pageType] || pageSpecific.advertorial;
}

// ============================================================
// USER PROMPT BUILDER
// ============================================================
function buildCopyUserPrompt({ page_type, strategy, researchData, brandGuide, verifiedClaims }) {
  return `Write compelling, conversion-optimized copy for a ${page_type} landing page.

## STRATEGY DOCUMENT
${JSON.stringify(strategy, null, 2)}

## BUSINESS INFORMATION
Company: ${researchData.company_name || 'Unknown'}
Industry: ${researchData.industry || 'General'}
Products: ${JSON.stringify(researchData.products?.slice(0, 3) || [])}
Value Props: ${JSON.stringify(researchData.value_propositions || [])}
Key Features: ${JSON.stringify(researchData.key_features || [])}
Unique Selling Points: ${JSON.stringify(researchData.unique_selling_points || researchData.differentiators || [])}

## BRAND VOICE
Tone: ${strategy.tone_guidelines?.voice || brandGuide.brand_voice?.tone || 'professional'}
Words to use: ${JSON.stringify(strategy.tone_guidelines?.words_to_use || [])}
Words to avoid: ${JSON.stringify(strategy.tone_guidelines?.words_to_avoid || [])}

## VERIFIED CLAIMS (ONLY use these - do not invent statistics or quotes)
${verifiedClaims.map(c => `- [${c.claim_type}] ${c.claim_text}`).join('\n') || 'IMPORTANT: No verified claims available. Do NOT include any statistics, percentages, or specific numbers. Do NOT invent testimonial quotes. Use benefit-focused language instead.'}

## VERIFIED TESTIMONIALS
${researchData.testimonials?.map(t => `- "${t.quote}" - ${t.author}${t.role ? `, ${t.role}` : ''}`).join('\n') || 'No verified testimonials available - do not invent quotes. Use general social proof language instead.'}

## CRITICAL RULES
1. NEVER invent statistics, percentages, or numbers that aren't in the verified claims
2. NEVER create fake testimonial quotes
3. If you need a statistic that isn't verified, mark it as [NEEDS VERIFICATION: describe what stat would go here]
4. Use benefit-focused language instead of unverified claims
5. Write in the brand voice consistently
6. NEVER use em dashes. Use commas, periods, semicolons, or " - " (space-dash-space) instead.
7. Write SUBSTANTIAL copy - every section should have real, meaningful content (not thin placeholder text)
8. Minimum 8 sections in the output

## REQUIRED JSON OUTPUT FORMAT
{
  "meta": {
    "title": "SEO page title (60 chars max)",
    "description": "Meta description (160 chars max)"
  },
  "hero": {
    "badge": "Small label above headline (e.g., 'BREAKING DISCOVERY' or 'HEALTH REPORT')",
    "headline": "Main headline - compelling, curiosity-driving",
    "subheadline": "Supporting headline with specificity",
    "byline": "Author name and credentials (for advertorial)",
    "date": "Publication date string",
    "reading_time": "X min read",
    "social_proof": "e.g., '75,000+ people have read this' or 'Rated 4.9/5 by 2,000+ customers'",
    "cta_text": "Primary button text",
    "cta_subtext": "Text below button (optional)"
  },
  "sections": [
    {
      "id": "section_id",
      "type": "story|problem|discovery|solution|how_it_works|testimonials|benefits|features|faq|risk_reversal|social_proof|comparison|stats|content|cta",
      "headline": "Section headline",
      "subheadline": "Section subheadline (if applicable)",
      "content": "Main content - paragraphs of compelling copy. Write 150-400 words per content section.",
      "items": [
        {
          "headline": "Item headline",
          "description": "Item description (50-100 words each)",
          "icon": "Suggested emoji or icon name"
        }
      ],
      "stats": [
        {
          "number": "75,000+",
          "label": "Happy Customers"
        }
      ],
      "cta": {
        "text": "CTA button text",
        "subtext": "Supporting text below CTA"
      },
      "testimonials": [
        {
          "quote": "Exact verified quote or benefit-focused placeholder",
          "author": "Name",
          "role": "Title/context",
          "rating": 5,
          "result": "Specific result achieved (if available)"
        }
      ],
      "faq_items": [
        {
          "question": "Frequently asked question",
          "answer": "Detailed, helpful answer (50-100 words)"
        }
      ]
    }
  ],
  "footer_cta": {
    "headline": "Final CTA headline - urgency driven",
    "subheadline": "Final supporting text with guarantee",
    "cta_text": "Button text",
    "guarantee": "Money-back guarantee text"
  },
  "unverified_claims": ["List any claims marked as NEEDS VERIFICATION"]
}

${getPageTypeCopyGuidelines(page_type)}

Write the COMPLETE copy now. Return ONLY valid JSON.`;
}

// ============================================================
// PAGE TYPE COPY GUIDELINES
// ============================================================
function getPageTypeCopyGuidelines(pageType) {
  const guidelines = {
    advertorial: `
## ADVERTORIAL SECTIONS (Must include ALL of these in order)
1. story - Patient/customer story opening (300-500 words, narrative with name/age/details)
2. problem - Why existing solutions fail (200-300 words with highlighted stats)
3. discovery - Expert introduction and mechanism (200-300 words)
4. solution - Product reveal with benefits grid (200-300 words + 4-6 benefit items)
5. how_it_works - 3-step mechanism (3 items with 50-80 word descriptions each)
6. testimonials - Social proof section (minimum 3 testimonials with ratings)
7. stats - Key metrics display (3-4 stats with numbers and labels)
8. risk_reversal - FAQ section (4-6 FAQ items with detailed answers)
9. cta - Final conversion push (100-200 words with urgency)`,

    listicle: `
## LISTICLE SECTIONS (Must include ALL of these)
1. content - Introduction (150-250 words setting up the topic)
2-3. content - Tips 1-2 (genuine advice, 100-200 words each)
4. solution - Tip 3 THE NATIVE AD (200-300 words with comparison + social proof)
5-7. content - Tips 4-6 (genuine advice, 100-200 words each)
8. testimonials - Social proof for the product (2-3 testimonials)
9. cta - Conclusion and final CTA`,

    quiz: `
## QUIZ SECTIONS (Must include ALL of these)
1. content - Welcome screen copy (headline, subheadline, social proof)
2. content - Questions (6-8 questions with 3-4 answer options each, as items)
3. content - Email capture copy
4. content - Results variants (3 result types with personalized recommendations)
5. cta - Post-results CTA`,

    vip: `
## VIP SECTIONS (Must include ALL of these)
1. benefits - 6 VIP perks with icons and descriptions
2. social_proof - Member count, testimonials
3. features - Upcoming exclusive items/content preview
4. cta - Final signup push with urgency`,

    calculator: `
## CALCULATOR SECTIONS (Must include ALL of these)
1. content - Calculator context and setup
2. how_it_works - 3 simple steps
3. stats - Trust metrics (4 stats)
4. testimonials - Social proof (2-3 testimonials)
5. cta - Final CTA with incentive`
  };

  return guidelines[pageType] || guidelines.advertorial;
}
