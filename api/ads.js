// RunAds - Meta Ad Generator (Vercel Serverless Function)
// Generates ad copy and image prompts using Claude

export const config = { maxDuration: 300 };

const HOOK_FRAMEWORKS = {
  'problem-agitate-solution': 'Name pain â Amplify emotional cost â Present solution',
  'curiosity-gap': 'Tease outcome without revealing method â Create information gap',
  'contrarian': 'Challenge conventional wisdom â Reveal counterintuitive truth',
  'social-proof': 'Lead with crowd behavior/numbers â Create FOMO through exclusivity',
  'direct-benefit': 'State value proposition clearly with specific numbers',
  'story-hook': 'Open with compelling micro-narrative â Transition to offer',
  'question-hook': 'Ask provocative question â Guide toward your answer',
  'statistic-lead': 'Open with surprising data point â Position solution',
  'before-after': 'Paint vivid contrast between current pain and desired outcome',
  'fomo': 'Create urgency through scarcity/exclusivity â Cost of inaction'
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const {
    mode,               // 'copy', 'images', 'full'
    client_data,        // Client brand data
    // Copy settings
    ad_type,            // single_image, carousel, video, story
    tone,               // conversational, urgent, professional, playful, authoritative
    hook_framework,     // Which hook pattern
    target_audience,
    offer_details,
    num_variations,     // 3, 5, or 10
    // Image prompt settings
    awareness_level,
    cognitive_biases,   // Array of bias keys
    ad_styles,          // Array of style names
    aspect_ratio,
    num_prompts,
    custom_concept
  } = req.body;

  try {
    const results = {};
    let totalTokens = 0;

    // ============================================================
    // GENERATE AD COPY
    // ============================================================
    if (mode === 'copy' || mode === 'full') {
      const hookInfo = hook_framework && HOOK_FRAMEWORKS[hook_framework]
        ? `Use the "${hook_framework}" framework: ${HOOK_FRAMEWORKS[hook_framework]}`
        : 'Choose the most effective hook framework for this audience';

      const copyPrompt = `You are an elite Meta Ads copywriter who has spent $100M+ on Facebook/Instagram ads. Generate ${num_variations || 3} ad copy variations.

## Client/Brand
${client_data ? JSON.stringify(client_data, null, 2) : 'No brand data provided - use professional defaults'}

## Requirements
- Ad Type: ${ad_type || 'single_image'}
- Tone: ${tone || 'conversational'}
- Hook Framework: ${hookInfo}
- Target Audience: ${target_audience || 'Not specified'}
- Offer: ${offer_details || 'Not specified'}

## Output Format
For each variation, provide:
1. **Hook** (first line - must stop the scroll)
2. **Primary Text** (full ad body, 125-250 words)
3. **Headline** (under 40 chars, for the headline field)
4. **Description** (under 30 chars, for the description field)
5. **CTA Text** (button text)

Apply these direct response principles:
- Open with the strongest possible hook
- Use short paragraphs (1-2 sentences max)
- Include specific numbers and results where possible
- Create urgency without being sleazy
- End with a clear, compelling CTA
- Use pattern interrupts (line breaks, emojis sparingly, formatting)

Respond in this JSON format:
{
  "variations": [
    {
      "hook": "...",
      "primary_text": "...",
      "headline": "...",
      "description": "...",
      "cta": "..."
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

    res.json({
      ...results,
      tokens_used: totalTokens,
      estimated_cost: (totalTokens * 0.000003).toFixed(4)
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
