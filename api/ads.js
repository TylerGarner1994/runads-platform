// RunAds - Enhanced Meta Ad Generator (Phase 2)
// Modes: copy, images, email-sequence, full
// Integrates 73 psychological triggers + platform formulas

export const config = { maxDuration: 300 };

import {
  TRIGGERS, STACKING_FORMULAS, PLATFORM_FORMULAS,
  getTriggersForPageType, getTriggersForAwareness, buildTriggerContext
} from '../lib/psychological-triggers.js';

const HOOK_FRAMEWORKS = {
  'problem-agitate-solution': 'Name pain → Amplify emotional cost → Present solution',
  'curiosity-gap': 'Tease outcome without revealing method → Create information gap',
  'contrarian': 'Challenge conventional wisdom → Reveal counterintuitive truth',
  'social-proof': 'Lead with crowd behavior/numbers → Create FOMO through exclusivity',
  'direct-benefit': 'State value proposition clearly with specific numbers',
  'story-hook': 'Open with compelling micro-narrative → Transition to offer',
  'question-hook': 'Ask provocative question → Guide toward your answer',
  'statistic-lead': 'Open with surprising data point → Position solution',
  'before-after': 'Paint vivid contrast between current pain and desired outcome',
  'fomo': 'Create urgency through scarcity/exclusivity → Cost of inaction'
};

const AWARENESS_LEVELS = {
  'unaware': 'Pattern interrupt, curiosity-driven. The audience doesn\'t know they have a problem. Focus on disrupting their scroll with an unexpected visual or claim.',
  'problem_aware': 'Pain visualization. They know the problem but not the solution. Focus on amplifying the pain and frustration they feel.',
  'solution_aware': 'Differentiation. They know solutions exist but not yours. Focus on what makes this approach unique and superior.',
  'product_aware': 'Social proof and credibility. They know about you but haven\'t committed. Focus on proof, testimonials, and removing objections.',
  'most_aware': 'Urgency and offer. They want it, just need the final push. Focus on limited time, bonuses, and guarantees.'
};

const COGNITIVE_BIASES = {
  'anchoring': 'Show a high reference price before revealing the actual lower price',
  'loss_aversion': 'Frame benefits as what they\'ll lose by not acting',
  'social_proof': 'Show numbers of others who have already taken action',
  'authority': 'Feature expert endorsements, credentials, or data',
  'scarcity': 'Emphasize limited availability or time constraints',
  'reciprocity': 'Lead with free value before asking for action',
  'bandwagon': 'Show trending popularity and growing adoption',
  'framing': 'Present the same info in the most persuasive light',
  'contrast': 'Place undesirable alternative next to your offer',
  'endowment': 'Help them feel ownership before purchase'
};

// ============================================================
// TRIGGER SELECTION FOR ADS
// ============================================================
function selectTriggersForAd(awarenessLevel = 'problem_aware', platform = 'facebook', count = 4) {
  const awarenessFiltered = getTriggersForAwareness(awarenessLevel);
  // Prioritize triggers that match the platform
  const platformFormula = PLATFORM_FORMULAS[platform.replace(/-/g, '_')] || PLATFORM_FORMULAS['facebook-instagram'] || {};
  const triggerIds = platformFormula.triggerIds || [];

  // Prefer platform-matched triggers, then fill from awareness-matched
  const platformMatched = awarenessFiltered.filter(t => triggerIds.includes(t.id));
  const rest = awarenessFiltered.filter(t => !triggerIds.includes(t.id));
  const selected = [...platformMatched, ...rest].slice(0, count);

  return selected;
}

function buildAdTriggerContext(triggers) {
  if (!triggers.length) return '';
  return `## PSYCHOLOGICAL TRIGGERS TO APPLY IN AD COPY
${triggers.map(t => `
### ${t.name} (ID: ${t.id})
Psychology: ${t.psychology}
Strategy: ${t.strategy}
Example Template: ${t.templates?.[0] || 'N/A'}
`).join('\n')}

Apply these triggers naturally in the ad copy. The hook should leverage at least 1 trigger. The body should weave in 2-3 more.`;
}

function getPlatformGuidelines(platform) {
  const guidelines = {
    'facebook': {
      headline_length: '25-40 chars',
      text_length: '125-250 words primary text',
      cta_options: ['Learn More', 'Shop Now', 'Sign Up', 'Get Offer', 'Book Now'],
      emoji_use: 'Sparingly (1-2 max in primary text)',
      format_notes: 'Short paragraphs. Line breaks for readability. First sentence must stop the scroll.'
    },
    'instagram': {
      headline_length: '20-30 chars',
      text_length: '100-200 words',
      cta_options: ['Learn More', 'Shop Now', 'Sign Up'],
      emoji_use: 'Strategic, trend-aware (2-3 max)',
      format_notes: 'Visual-first platform. Copy supports the image. Use line breaks generously.'
    },
    'linkedin': {
      headline_length: '30-50 chars',
      text_length: '150-300 words',
      cta_options: ['Learn More', 'Apply Now', 'Download', 'Register'],
      emoji_use: 'Minimal (0-1)',
      format_notes: 'Professional tone. Personal stories perform well. Data-driven claims.'
    },
    'tiktok': {
      headline_length: '15-25 chars',
      text_length: '50-150 chars on-screen text',
      cta_options: ['Shop Now', 'Learn More'],
      emoji_use: 'On-brand only',
      format_notes: 'Authenticity over polish. Hook in first 0-3 seconds. Trend-aware language.'
    },
    'google': {
      headline_length: '30 chars per headline (up to 3)',
      text_length: '90 chars per description (up to 2)',
      cta_options: ['Learn More', 'Get Quote', 'Shop Now', 'Sign Up', 'Call Now'],
      emoji_use: 'None',
      format_notes: 'Keyword-focused. Specific numbers. USP in first headline. CTA in description.'
    },
    'email': {
      headline_length: '50-60 chars subject line',
      text_length: '300-500 words body',
      cta_options: ['Learn More', 'Claim Your Spot', 'Get Started', 'Download Now'],
      emoji_use: 'Optional in subject (1 max)',
      format_notes: 'Preview text 35-50 chars. Short paragraphs. One clear CTA per email.'
    }
  };
  return guidelines[platform] || guidelines.facebook;
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const {
    mode,               // 'copy', 'images', 'email-sequence', 'full'
    client_data,        // Client brand data
    // Copy settings
    ad_type,            // single_image, carousel, video, story
    tone,               // conversational, urgent, professional, playful, authoritative
    hook_framework,     // Which hook pattern
    target_audience,
    offer_details,
    num_variations,     // 3, 5, or 10
    platform,           // facebook, instagram, linkedin, tiktok, google, email
    // Image prompt settings
    awareness_level,
    cognitive_biases,   // Array of bias keys
    ad_styles,          // Array of style names
    aspect_ratio,
    num_prompts,
    custom_concept,
    // Email sequence settings
    sequence_length,    // 3, 5, 7, or 10
    sequence_type,      // 'lead-nurture', 'sales-funnel', 'educational', 'launch', 'abandoned-cart'
    days_between,       // 1, 2, 3
    product_info
  } = req.body;

  try {
    const results = {};
    let totalTokens = 0;

    // Select psychological triggers for this ad campaign
    const selectedTriggers = selectTriggersForAd(
      awareness_level || 'problem_aware',
      platform || 'facebook',
      4
    );
    const triggerContext = buildAdTriggerContext(selectedTriggers);
    const platformGuide = getPlatformGuidelines(platform || 'facebook');

    // ============================================================
    // GENERATE AD COPY
    // ============================================================
    if (mode === 'copy' || mode === 'full') {
      const hookInfo = hook_framework && HOOK_FRAMEWORKS[hook_framework]
        ? `Use the "${hook_framework}" framework: ${HOOK_FRAMEWORKS[hook_framework]}`
        : 'Choose the most effective hook framework for this audience';

      const awarenessInfo = awareness_level && AWARENESS_LEVELS[awareness_level]
        ? `Awareness Level: ${awareness_level}\nGuidance: ${AWARENESS_LEVELS[awareness_level]}`
        : 'Default to problem-aware level';

      const copyPrompt = `You are an elite Meta Ads copywriter who has spent $100M+ on Facebook/Instagram ads. Generate ${num_variations || 3} ad copy variations.

## Client/Brand
${client_data ? JSON.stringify(client_data, null, 2) : 'No brand data provided - use professional defaults'}

## Audience & Awareness
- Target Audience: ${target_audience || 'Not specified'}
- ${awarenessInfo}

## Requirements
- Ad Type: ${ad_type || 'single_image'}
- Tone: ${tone || 'conversational'}
- Hook Framework: ${hookInfo}
- Offer: ${offer_details || 'Not specified'}

## Platform: ${(platform || 'facebook').toUpperCase()}
- Headline Length: ${platformGuide.headline_length}
- Text Length: ${platformGuide.text_length}
- CTA Options: ${platformGuide.cta_options.join(', ')}
- Emoji Usage: ${platformGuide.emoji_use}
- Format: ${platformGuide.format_notes}

${triggerContext}

## Output Format
For each variation, provide:
1. **Hook** (first line - must stop the scroll)
2. **Primary Text** (full ad body)
3. **Headline** (short, punchy)
4. **Description** (supporting line)
5. **CTA Text** (button text)
6. **Triggers Used** (which psychological triggers from above were applied)

Apply these direct response principles:
- Open with the strongest possible hook
- Use short paragraphs (1-2 sentences max)
- Include specific numbers and results where possible
- Create urgency without being sleazy
- End with a clear, compelling CTA
- Use pattern interrupts (line breaks, formatting)

Respond in this JSON format:
{
  "variations": [
    {
      "hook": "...",
      "primary_text": "...",
      "headline": "...",
      "description": "...",
      "cta": "...",
      "triggers_used": ["trigger name", ...],
      "hook_framework": "which framework was used"
    }
  ]
}`;

      const copyResponse = await callClaude(apiKey, copyPrompt);
      totalTokens += (copyResponse.usage?.input_tokens || 0) + (copyResponse.usage?.output_tokens || 0);

      try {
        const text = copyResponse.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        results.ad_copy = jsonMatch ? JSON.parse(jsonMatch[0]) : { variations: [] };
      } catch {
        results.ad_copy = { variations: [], raw: copyResponse.content[0].text };
      }
    }

    // ============================================================
    // GENERATE IMAGE PROMPTS
    // ============================================================
    if (mode === 'images' || mode === 'full') {
      const awarenessInfo = awareness_level && AWARENESS_LEVELS[awareness_level]
        ? `Awareness Level: ${awareness_level}\n${AWARENESS_LEVELS[awareness_level]}`
        : 'Use problem-aware level by default';

      const biasInfo = cognitive_biases?.length > 0
        ? `Cognitive Biases to Apply:\n${cognitive_biases.map(b => `- ${b}: ${COGNITIVE_BIASES[b] || b}`).join('\n')}`
        : '';

      const imagePrompt = `You are an expert at creating AI image generation prompts for Meta Ads. Generate ${num_prompts || 3} image prompts.

## Client/Brand
${client_data ? JSON.stringify(client_data, null, 2) : 'No brand data provided'}

## Settings
${awarenessInfo}
${biasInfo}
- Ad Styles: ${ad_styles?.join(', ') || 'Not specified'}
- Aspect Ratio: ${aspect_ratio || '4:5'}
${custom_concept ? `- Custom Concept: ${custom_concept}` : ''}

## Requirements for Each Prompt
1. Highly specific and detailed (50-100 words)
2. Include: subject, setting, mood, lighting, camera angle, style
3. Optimized for the specified aspect ratio
4. Designed to stop the scroll on Meta platforms
5. Apply the cognitive biases visually
6. Match the awareness level (unaware = pattern interrupt, most_aware = product focus)

Respond in JSON:
{
  "prompts": [
    {
      "concept": "Brief concept description",
      "prompt": "Full detailed image prompt...",
      "rationale": "Why this works for the target audience"
    }
  ]
}`;

      const imageResponse = await callClaude(apiKey, imagePrompt);
      totalTokens += (imageResponse.usage?.input_tokens || 0) + (imageResponse.usage?.output_tokens || 0);

      try {
        const text = imageResponse.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        results.image_prompts = jsonMatch ? JSON.parse(jsonMatch[0]) : { prompts: [] };
      } catch {
        results.image_prompts = { prompts: [], raw: imageResponse.content[0].text };
      }
    }

    // ============================================================
    // GENERATE EMAIL SEQUENCE
    // ============================================================
    if (mode === 'email-sequence' || mode === 'full') {
      const seqLength = sequence_length || 5;
      const seqType = sequence_type || 'lead-nurture';
      const daysBetween = days_between || 2;

      // Select triggers that progress through awareness levels for the sequence
      const awarenessProgression = ['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware'];
      const triggersPerEmail = [];
      for (let i = 0; i < seqLength; i++) {
        const level = awarenessProgression[Math.min(i, awarenessProgression.length - 1)];
        const emailTriggers = selectTriggersForAd(level, 'email', 2);
        triggersPerEmail.push({ level, triggers: emailTriggers.map(t => t.name) });
      }

      const emailPrompt = `You are a world-class email copywriter specializing in ${seqType} sequences. Generate a ${seqLength}-email sequence.

## Client/Brand
${client_data ? JSON.stringify(client_data, null, 2) : 'No brand data provided'}

## Sequence Configuration
- Type: ${seqType}
- Length: ${seqLength} emails
- Days Between: ${daysBetween}
- Target Audience: ${target_audience || 'Not specified'}
- Offer: ${offer_details || 'Not specified'}
- Tone: ${tone || 'conversational'}
${product_info ? `- Product Info: ${product_info}` : ''}

## Awareness Level Progression (per email)
${triggersPerEmail.map((e, i) => `Email ${i + 1}: ${e.level} → Triggers: ${e.triggers.join(', ')}`).join('\n')}

## Sequence Type Guidelines
${seqType === 'lead-nurture' ? 'Build trust and educate. Each email delivers value. Soft sell in emails 3+.' : ''}
${seqType === 'sales-funnel' ? 'Progressive urgency. Problem → Solution → Proof → Offer → Deadline.' : ''}
${seqType === 'educational' ? 'Teach while positioning product. Each email teaches one concept that links to product benefits.' : ''}
${seqType === 'launch' ? 'Build anticipation. Teaser → Value → Social proof → Cart open → Last chance.' : ''}
${seqType === 'abandoned-cart' ? 'Reminder → Objection handling → Urgency → Final offer with bonus/discount.' : ''}

## Output Format
Return JSON:
{
  "sequence": [
    {
      "email_number": 1,
      "subject_line": "string (50-60 chars)",
      "preview_text": "string (35-50 chars)",
      "body": "string (300-500 words, plain text with line breaks)",
      "cta_text": "string",
      "cta_url_anchor": "string (e.g., 'claim-offer')",
      "send_day": 0,
      "awareness_level": "string",
      "triggers_used": ["trigger names"]
    }
  ],
  "strategy": "string (overall sequence strategy explanation)",
  "expected_metrics": {
    "estimated_open_rate": "string percentage",
    "estimated_click_rate": "string percentage",
    "optimal_send_time": "string (best time of day)"
  }
}`;

      const emailResponse = await callClaude(apiKey, emailPrompt);
      totalTokens += (emailResponse.usage?.input_tokens || 0) + (emailResponse.usage?.output_tokens || 0);

      try {
        const text = emailResponse.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        results.email_sequence = jsonMatch ? JSON.parse(jsonMatch[0]) : { sequence: [] };
      } catch {
        results.email_sequence = { sequence: [], raw: emailResponse.content[0].text };
      }
    }

    // ============================================================
    // RESPONSE
    // ============================================================
    res.json({
      ...results,
      triggers_used: selectedTriggers.map(t => ({ id: t.id, name: t.name, category: t.category })),
      platform_optimization: {
        platform: platform || 'facebook',
        guidelines: platformGuide
      },
      tokens_used: totalTokens,
      estimated_cost: (totalTokens / 1000000 * 3).toFixed(4)
    });

  } catch (err) {
    console.error('Ad generation error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function callClaude(apiKey, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`Claude API: ${response.status}`);
  return response.json();
}
