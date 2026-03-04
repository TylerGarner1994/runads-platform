import { sql } from '@vercel/postgres';
import { callClaudeWithFallback } from '../../../lib/claude.js';
import { getStrategySkillContext } from '../../../lib/skill-loader.js';

/**
 * Strategy Step - Create page outline and messaging strategy
 * Uses Claude Sonnet for strategy generation
 */
export async function runStrategyStep({ job, stepOutputs, additionalInput, jobId }) {
  const { page_type, target_audience, offer_details, template_id } = { ...job, ...additionalInput };
  const researchData = stepOutputs.research?.result?.business_research || {};
  const brandGuide = stepOutputs.brand?.result?.brand_guide || {};

  // Load skill context for richer strategy output
  const skillContext = getStrategySkillContext();

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

  const strategyPrompt = `You are a world-class direct response strategist trained in the frameworks of Schwartz, Halbert, Bencivenga, Makepeace, Carlton, Sugarman, and Evaldo Albuquerque.

Create a detailed page strategy for a ${page_type} landing page.

## STRATEGIC FRAMEWORKS TO APPLY

### 1. SCHWARTZ AWARENESS CALIBRATION
Determine where the prospect sits and match strategy accordingly:
- Level 5 (Most Aware): Lead with offer/deal directly
- Level 4 (Product Aware): Emphasize superiority and proof
- Level 3 (Solution Aware): Differentiate via unique mechanism
- Level 2 (Problem Aware): Agitate > Solution > Product
- Level 1 (Unaware): Story/Curiosity > Problem > Solution

### 2. MARKET SOPHISTICATION ANALYSIS
Determine the market stage:
- Stage 1 (First to market): Simple, direct claims
- Stage 2: Enlarge the claim with specifics
- Stage 3: Add unique mechanism ("...with our proprietary process")
- Stage 4: Enhance mechanism with credibility
- Stage 5 (Most markets today): Lead with story/identification, embed claims

### 3. UNIQUE MECHANISM DEVELOPMENT (Evaldo's 16-Word Framework)
"This [NEW OPPORTUNITY] is the key to [THEIR DESIRE] and it's only attainable through my [UNIQUE MECHANISM]."
Mechanism types: New Discovery, Hidden Cause, Overlooked Factor, Proprietary Process, Counter-Intuitive Approach

### 4. DOMINANT RESIDENT EMOTION (Makepeace/Bencivenga)
Every market has a dominant emotional frequency. Identify it:
- Financial: FEAR (losing money, missing out)
- Weight loss/health: SHAME + HOPE (appearance, vitality)
- Business/opportunity: HOPE + GREED (success, proving doubters)
- Supplements: FEAR + HOPE (decline vs. energy)
Your copy must resonate at this emotional frequency.

### 5. PROOF HIERARCHY (Bencivenga)
Stack proof strongest to weakest:
1. Third-party verification (studies, publications)
2. Expert endorsements
3. Demonstration/Results
4. Specific testimonials with details
5. General testimonials
6. Logical arguments
Never make a claim without immediate proof.

### 6. PSYCHOLOGICAL TRIGGERS TO MAP
Select 3-5 primary triggers for this audience:
Loss Aversion, Social Proof, Authority, Scarcity, Curiosity Gap, Anchoring, Commitment/Consistency, In-Group Bias, Endowment Effect, Contrast Effect

## BUSINESS RESEARCH
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
  "awareness_level": {
    "level": 1-5,
    "label": "Unaware|Problem Aware|Solution Aware|Product Aware|Most Aware",
    "justification": "Why this audience sits at this level",
    "lead_strategy": "How the page should open based on awareness"
  },
  "market_sophistication": {
    "stage": 1-5,
    "justification": "Why the market is at this stage",
    "headline_approach": "How to structure headlines for this stage"
  },
  "dominant_emotion": "The primary emotional frequency to match",
  "unique_mechanism": {
    "name": "Branded mechanism name",
    "type": "New Discovery|Hidden Cause|Overlooked Factor|Proprietary Process|Counter-Intuitive",
    "explanation": "Why this works when everything else failed",
    "sixteen_word_sale": "Complete Evaldo 16-word framework sentence"
  },
  "psychological_triggers": [
    {
      "trigger": "Trigger name",
      "application": "How to apply it on this page",
      "section": "Which section uses it"
    }
  ],
  "page_goal": "The primary conversion goal",
  "target_persona": {
    "description": "Who this page is for (specific demographics + psychographics)",
    "pain_points": ["Surface pain", "Underlying real pain", "Emotional root"],
    "desires": ["What they say they want", "What they actually want", "Deepest need"],
    "objections": ["Primary objection + what they really mean", "Secondary", "Tertiary"],
    "failed_solutions": ["What they've tried before and why it didn't work"],
    "decision_style": "Analytical|Emotional|Impulsive|Deliberate",
    "language_patterns": ["Phrases they use to describe their problem"]
  },
  "hook": {
    "headline": "Main headline matched to awareness + sophistication level",
    "subheadline": "Supporting headline with specificity and mechanism hint",
    "angle": "The psychological angle and which trigger powers it",
    "lead_type": "Story|Problem-Agitation|Secret/Discovery|Proclamation|Question|Proof"
  },
  "sections": [
    {
      "name": "section_name",
      "purpose": "What this section accomplishes psychologically",
      "key_message": "The main point to communicate",
      "elements": ["List of elements to include"],
      "claims_to_use": ["Which verified claims fit here"],
      "proof_type": "Which proof hierarchy level this section uses",
      "triggers_used": ["Which psychological triggers are active here"]
    }
  ],
  "cta_strategy": {
    "primary_cta": "Main call to action text",
    "secondary_cta": "Alternative/softer CTA",
    "cta_placement": ["Where CTAs should appear"],
    "urgency_element": "Real urgency reason (not manufactured)",
    "risk_reversal": "Guarantee type and language"
  },
  "objection_handling": [
    {
      "objection": "What they say",
      "real_concern": "What they actually mean",
      "counter": "How to address it using which proof type",
      "where": "Section where this is addressed"
    }
  ],
  "social_proof_strategy": {
    "testimonials_to_highlight": ["Which testimonials to use and why"],
    "trust_signals": ["What trust elements to include"],
    "proof_stacking_order": ["How proof elements build on each other"],
    "placement": ["Where social proof appears for maximum impact"]
  },
  "tone_guidelines": {
    "voice": "How to sound (matched to persona's language preferences)",
    "words_to_use": ["Words that resonate with this persona"],
    "words_to_avoid": ["Buzzwords they're numb to"],
    "conversational_bridges": ["Transition phrases for slippery slide flow"]
  },
  "copy_architecture": {
    "word_count_target": "Target based on awareness level and page type",
    "lead_percentage": "How much of the copy is the lead/hook (should be 20%)",
    "proof_density": "How heavily to stack proof elements",
    "story_elements": "Key narrative arc: character + struggle + discovery + transformation"
  }
}

Return ONLY valid JSON.`;

  const basePrompt = 'You are a world-class direct response strategist. Create comprehensive page strategies.';
  const fullPrompt = `${basePrompt}\n\nApply the frameworks below:${skillContext}`;

  const { text: responseText, tokensUsed, json: parsedJson } = await callClaudeWithFallback({
    systemPrompt: fullPrompt,
    baseSystemPrompt: basePrompt,
    userPrompt: strategyPrompt,
    model: 'claude-sonnet-4-6',
    maxTokens: 5000
  });

  const strategy = parsedJson || { raw_response: responseText };

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
