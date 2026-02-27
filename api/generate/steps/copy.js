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
      ORDER BY confidence_score DESC NULLS LAST
      LIMIT 20
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
  const base = `You are an elite direct-response copywriter synthesizing the proven frameworks of history's greatest copywriters: Eugene Schwartz, Gary Halbert, Joe Sugarman, Gary Bencivenga, Clayton Makepeace, John Carlton, Jim Rutz, Parris Lampropoulos, and Evaldo Albuquerque.

## THE IMMUTABLE LAW
You cannot create desire - only channel it. The market already wants something. Connect the product to that existing desire.

## CORE PRINCIPLES (The 33 Laws of Legendary Copy)

### Research & Strategy Laws
- Customer's exact words are gold - mirror their language
- Match the dominant resident emotion (fear, shame, hope, greed)
- The unique mechanism is non-negotiable in modern markets
- Big Promise must be TRANSFORMATION, not feature
- First 50 words determine 80% of response (Schwartz)

### Writing Laws
- Every element pulls to the next - slippery slide (Sugarman)
- Write like conversation, not "writing" (Halbert) - if it sounds like writing, rewrite it
- Specific beats vague ALWAYS ("1,624 customers" not "many people", "in 7 minutes" not "fast")
- Every claim needs immediate proof (Bencivenga)
- Dimensionalize benefits emotionally (Makepeace) - make them vivid, tangible, felt in the body

### Psychological Laws
- Lead with emotion, justify with logic
- Admitting flaws builds trust exponentially (Bencivenga's "reasons NOT to buy" paradox)
- Disqualification increases desire (Carlton) - "This isn't for everyone"
- Small yeses lead to big yes (Sugarman's consistency trigger)
- "Reason why" increases believability for every claim (Halbert)

### Closing Laws
- Make saying NO harder than saying YES
- Stack value until price seems small (anchoring)
- Remove all risk with guarantee
- Create real urgency (not manufactured scarcity)

## PROOF HIERARCHY (Stack strongest to weakest)
1. Third-party verification (studies, publications)
2. Expert endorsements
3. Demonstration/Results
4. Specific testimonials with details
5. General testimonials
6. Logical arguments
Never make a claim without immediate proof.

## PSYCHOLOGICAL TRIGGERS TO WEAVE THROUGHOUT
- Loss Aversion: Pain of losing is 2x stronger than pleasure of gaining
- Curiosity Gap: Tease without revealing, create "must know" moments
- Social Proof: Specific numbers, not vague ("147,832 members" not "thousands")
- Authority: Borrowed credibility from institutions, research, experts
- Anchoring: First number seen influences all subsequent judgments
- Endowment Effect: "It's already yours" / future pacing of ownership
- Storytelling: Information in story form is 22x more memorable than facts alone

## FASCINATION FORMULAS (For bullet points and benefits)
- Specific Number: "The 3 foods you must never eat after 6pm"
- Hidden Secret: "The little-known loophole that saves $4,200/year"
- Counterintuitive: "Why exercising MORE might make you GAIN weight"
- Warning: "Never do this after taking aspirin (could be dangerous)"
- How-To: "How to fall asleep in 7 minutes using a military technique"
- Without: "How to [benefit] without [common sacrifice]"
- Even If: "Works even if you've failed at everything else"

## CONVERSATIONAL BRIDGES (For slippery slide flow)
"Look...", "Here's the thing...", "Now I know what you're thinking...", "But here's where it gets interesting...", "And get this..."

## EVALDO'S 10 QUESTIONS (Copy must answer in order)
1. How is this different? 2. What's in it for me? 3. Why believe you? 4. What proof? 5. Who else got results? 6. What if it fails? 7. Why this price? 8. Why act now? 9. What do I get? 10. How do I start?

## CRITICAL RULES
- NEVER use em dashes. Use commas, periods, semicolons, or " - " instead.
- NEVER invent statistics or testimonial quotes that aren't provided
- Write 1500-3000 words of total copy for maximum page substance
- Every section must serve the slippery slide - pulling readers to the next element

## OUTPUT FORMAT
Return your copy as valid JSON matching the exact schema provided in the user prompt.
`;

  const pageSpecific = {
    advertorial: `${base}

## ADVERTORIAL COPYWRITING MASTERY
You're writing a native advertorial that reads like premium editorial journalism - NOT a sales letter. The reader should feel they're reading a helpful article that happens to mention a solution.

### Core Principle
Maintain editorial credibility while building the irresistible case. The sell should feel like a "discovery" and "recommendation" - never a pitch.

### Tone & Style
- Write in third-person journalistic style (like NY Times health section or Forbes sponsored content)
- Use a credible byline (Dr., researcher, health editor, etc.)
- Create a narrative arc: character + struggle + discovery + transformation
- Build credibility through expert positioning and specific details
- No hype, no exclamation marks, measured and credible language
- Could plausibly appear in a legitimate publication

### THE 10-SECTION ADVERTORIAL ARCHITECTURE

1. **EDITORIAL HEADLINE** (Stop the scroll)
   - Must read like editorial, NOT advertising
   - Formula options: Discovery/News angle, Problem/Solution angle, Personal Story angle, Warning/Expose angle
   - NEVER mention product name in headline
   - Create curiosity or promise valuable information

2. **BYLINE & CREDIBILITY** (Establish authority)
   - Author name with credentials (Dr., Editor, Researcher)
   - Publication date for freshness

3. **EDITORIAL OPENING / THE LEAD** (150-300 words)
   - Hook with relatable character story facing the problem (name, age, specific details)
   - OR lead with surprising statistic that challenges assumptions
   - OR speak directly to reader's situation
   - Make reader think "that's me"

4. **PROBLEM ESTABLISHMENT & AGITATION** (300-500 words)
   - Acknowledge what they've tried (creates rapport)
   - Validate their frustration (you understand)
   - Explain why those things didn't work (not their fault)
   - Use "They Told You" structure or "No Wonder" structure
   - Show consequences of not solving (raise stakes)
   - DO NOT introduce product yet

5. **THE DISCOVERY/PIVOT** (200-400 words)
   - Transition from problem to solution through story or research discovery
   - "Then, in [year], researchers at [institution] made a surprising discovery..."
   - Create the "aha moment"

6. **THE UNIQUE MECHANISM** (400-600 words)
   - Name the mechanism (branded, memorable)
   - Explain how it works (simplified, accessible)
   - Show why it's different from other approaches
   - Back with credibility (research, experts, logic)
   - Make them feel SMART for understanding, not stupid for not knowing

7. **THE SOLUTION INTRODUCTION** (300-500 words)
   - Product feels like the logical, inevitable solution
   - Bridge naturally from mechanism to product
   - Brief features-to-benefits
   - Initial proof element

8. **PROOF & TESTIMONIALS** (400-600 words)
   - Statistical proof, expert endorsements, customer stories (3-4 detailed)
   - Before/after specifics with measurable results
   - Testimonials address different objections and avatar types
   - Woven into narrative, not dumped in one section

9. **OBJECTION HANDLING** (200-400 words)
   - "What about..." or FAQ-style
   - Address: Will it work for me? Is it safe? How long until results? What if it doesn't work?

10. **THE SOFT CTA** (150-300 words)
    - Less aggressive than sales letter, more informational
    - Summarize the opportunity, explain how to try it
    - Mention limited availability (if true)
    - Simple, clear CTA appropriate for editorial context

### Word Count Target: 2000-3000 words across all sections`,

    listicle: `${base}

## LISTICLE COPYWRITING MASTERY
You're writing a helpful advice article with one tip being a natural product recommendation. The reader should gain genuine value from every tip, with the product woven in as a natural discovery.

### Tone & Style
- Write as a helpful friend sharing insider knowledge
- Conversational, practical, actionable - Halbert's "write like you're talking to one person"
- Each tip provides genuine standalone value (even without the product)
- The product tip (#3) should feel like a discovery, not an ad
- Use Sugarman's slippery slide - each tip pulls into the next

### Structure - THE LISTICLE ARCHITECTURE
1. **Publication Header** - Branded, editorial credibility
2. **Listicle Headline** - "X Proven Ways to..." or "X Things You Didn't Know About..."
3. **Introduction** (150-250 words) - Set up the value, tease what they'll learn, mention local relevance
4. **Tips 1-2** - Genuine valuable advice using fascination headlines
5. **Tip 3 - THE NATIVE AD** - Naturally introduce the product as "the one most people miss"
   - Comparison showing advantage over alternatives
   - Social proof embedded (ratings, customer count)
   - Feels like an insider recommendation, not a pitch
6. **Tips 4-7** - More genuine advice (mix counterintuitive tips + practical quick wins)
7. **Mid-Content CTA** - Subtle reminder of the discovery from Tip 3
8. **Conclusion** - Summary + final CTA with urgency

### Tip Headline Formulas (Use fascination bullets)
- "The #1 Mistake Most People Make With [Topic]"
- "Why [Counterintuitive Approach] Actually Works Better"
- "The Simple Trick That [Impressive Result]"
- "What [Authority/Experts] Know That You Don't"

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

## STRATEGIC FRAMEWORK (From strategy step - follow these directives)
Awareness Level: ${strategy.awareness_level?.label || 'Problem Aware'} (Level ${strategy.awareness_level?.level || 2})
Lead Strategy: ${strategy.awareness_level?.lead_strategy || 'Story-driven lead'}
Market Sophistication: Stage ${strategy.market_sophistication?.stage || 4}
Headline Approach: ${strategy.market_sophistication?.headline_approach || 'Lead with mechanism and story'}
Dominant Emotion: ${strategy.dominant_emotion || 'hope'}
Unique Mechanism: ${strategy.unique_mechanism?.name || 'To be developed'} (${strategy.unique_mechanism?.type || 'New Discovery'})
Mechanism Explanation: ${strategy.unique_mechanism?.explanation || 'Explain why this works when everything else failed'}
16-Word Sale: ${strategy.unique_mechanism?.sixteen_word_sale || 'Develop this'}
Copy Architecture: ${JSON.stringify(strategy.copy_architecture || {})}

## PSYCHOLOGICAL TRIGGERS TO APPLY
${strategy.psychological_triggers?.map(t => `- ${t.trigger}: ${t.application} (in ${t.section})`).join('\n') || 'Apply: Loss Aversion, Social Proof, Curiosity Gap, Authority'}

## FULL STRATEGY DOCUMENT
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
