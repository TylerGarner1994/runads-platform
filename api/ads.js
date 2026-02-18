// RunAds - Enhanced Meta Ad Generator (Phase 3)
// Modes: copy, images, email-sequence, full
// Integrates 73 psychological triggers + platform formulas + Meta Ads Knowledge Base

export const config = { maxDuration: 300 };

import {
  TRIGGERS, STACKING_FORMULAS, PLATFORM_FORMULAS,
  getTriggersForPageType, getTriggersForAwareness, buildTriggerContext
} from '../lib/psychological-triggers.js';

import {
  buildAdCopyContext, buildImagePromptContext, buildBrandInjectionString
} from '../lib/meta-ads-context/index.js';

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
  'loss_aversion': 'Frame benefits as what they\'ll lose by not acting — people feel losses 2x more than gains',
  'sunk_cost': 'Remind them of time/money already invested that would be wasted without action',
  'zero_risk': 'Eliminate all perceived risk with guarantees, free trials, and money-back promises',
  'regret_aversion': 'Paint a vivid picture of future regret from inaction',
  'endowment': 'Help them feel ownership before purchase — free trials, personalization, "your plan"',
  'social_proof': 'Show numbers of others who have already taken action — reviews, counts, testimonials',
  'bandwagon': 'Show trending popularity and growing adoption — "fastest-growing", "join X others"',
  'in_group': 'Create us-vs-them framing — insiders who "get it" vs those still struggling',
  'authority': 'Feature expert endorsements, credentials, clinical studies, or institutional data',
  'halo_effect': 'Associate product with admired brands, celebrities, or prestigious institutions',
  'liking': 'Use relatable founders, friendly faces, and genuine personality to build rapport',
  'anchoring': 'Show a high reference price before revealing the actual lower price',
  'framing': 'Present the same info in the most persuasive light — "95% success" vs "5% failure"',
  'availability_heuristic': 'Use vivid, memorable examples that come to mind easily',
  'representativeness': 'Show the ideal customer who looks/sounds exactly like the target audience',
  'default_effect': 'Pre-select the recommended option — people tend to stick with defaults',
  'mere_exposure': 'Increase familiarity through repetition of brand elements and key messages',
  'scarcity': 'Emphasize limited availability, countdown timers, or "only X left"',
  'curiosity_gap': 'Tease a surprising fact or method without fully revealing it — create information hunger',
  'ikea_effect': 'Let them build/customize something — people value what they help create',
  'reciprocity': 'Lead with free value before asking for action — give first, ask second',
  'commitment_consistency': 'Start with small asks that lead to bigger commitments — foot-in-the-door',
  'goal_gradient': 'Show progress toward a goal — "You\'re 80% there" motivates completion',
  'contrast_effect': 'Place undesirable alternative next to your offer to make it look superior',
  'decoy_effect': 'Add a strategically inferior option that makes the target option look best',
  'von_restorff': 'Make the key element visually distinct — isolation effect draws attention',
  'picture_superiority': 'Use vivid imagery over text — images are remembered 6x better than words',
  'rhyme_as_reason': 'Rhyming phrases feel more truthful and memorable — "no pain, all gain"',
  'processing_fluency': 'Keep it simple and easy to read — fluent messages feel more trustworthy',
  'ben_franklin': 'Ask for a small favor first — people who help you start to like you more',
  'pratfall_effect': 'Show a minor, relatable flaw to increase likability and authenticity',
  'peak_end_rule': 'Make the peak moment and ending of the experience exceptional',
  'confirmation_bias': 'Affirm what the audience already believes, then extend to your solution',
  'survivorship_bias': 'Spotlight success stories while being transparent about the journey'
};

// ============================================================
// POWER STACKS - Pre-built cognitive bias combinations
// ============================================================
const POWER_STACKS = {
  'urgency': {
    name: 'Urgency Stack',
    biases: ['scarcity', 'loss_aversion', 'regret_aversion', 'goal_gradient', 'zero_risk'],
    description: 'Maximum urgency — limited time/quantity + fear of missing out + risk removal'
  },
  'trust': {
    name: 'Trust Stack',
    biases: ['social_proof', 'authority', 'commitment_consistency', 'processing_fluency', 'pratfall_effect'],
    description: 'Build deep credibility — proof + experts + consistency + authenticity'
  },
  'desire': {
    name: 'Desire Stack',
    biases: ['endowment', 'curiosity_gap', 'anticipation', 'peak_end_rule', 'picture_superiority'],
    description: 'Create intense wanting — ownership + curiosity + vivid imagery'
  },
  'comparison': {
    name: 'Comparison Stack',
    biases: ['anchoring', 'contrast_effect', 'decoy_effect', 'framing', 'zero_risk'],
    description: 'Make your offer the obvious choice — price anchoring + contrast + framing'
  },
  'identity': {
    name: 'Identity Stack',
    biases: ['in_group', 'confirmation_bias', 'liking', 'bandwagon', 'representativeness'],
    description: 'Deep audience resonance — "this is for people like me"'
  }
};

// ============================================================
// 50 AD STYLES for Image Prompt Generation
// ============================================================
const AD_STYLES = {
  'professional_studio': 'Clean studio lighting, white/gray background, commercial product photography',
  'lifestyle': 'Natural setting, real-world use, warm lifestyle photography',
  'ugc_raw': 'User-generated content feel, iPhone-quality, authentic and unpolished',
  'flatlay': 'Top-down flat lay arrangement, organized layout, minimal background',
  'minimalist': 'Negative space, single focal point, clean and uncluttered',
  'maximalist': 'Dense, information-rich, bold colors, multiple elements competing for attention',
  'dark_mode': 'Dark background, moody lighting, high contrast, premium feel',
  'editorial': 'Magazine-quality composition, editorial lighting, fashion/beauty aesthetic',
  '3d_render': 'CGI/3D rendered product, floating elements, impossible physics',
  'hand_drawn': 'Illustrated, hand-drawn elements, sketch-style, artistic feel',
  'product_demo': 'Product in use, demonstration shot, before/during/after',
  'founder_forward': 'Founder/face prominent, personal brand, trust through human connection',
  'ingredient_breakdown': 'Ingredients/components highlighted, deconstructed product view',
  'behind_scenes': 'Factory, lab, or workspace — transparency and authenticity',
  'packaging_hero': 'Packaging as hero, unboxing moment, retail-ready presentation',
  'unboxing': 'Reveal moment, excitement of opening, gift-like presentation',
  'text_typography': 'Text-dominant, bold typography, minimal imagery, statement piece',
  'screenshot': 'App/dashboard screenshot, UI walkthrough, digital product preview',
  'meme_native': 'Meme format, native social content, humor-driven, shareable',
  'split_screen': 'Side-by-side comparison, before/after split, A vs B format',
  'before_after': 'Transformation shot, dramatic before/after, progress visualization',
  'social_proof_stack': 'Testimonial collage, review screenshots, star ratings, trust badges',
  'problem_visualization': 'Visual representation of the problem/pain point the product solves',
  'curiosity_gap': 'Intriguing partial reveal, blurred/hidden element, "what is this?" hook',
  'urgency_scarcity': 'Countdown timers, "almost gone" visuals, limited edition markers',
  'lego_brick': 'LEGO/brick-style recreation of product or scene, toy-like aesthetic',
  'claymation': 'Clay/plasticine stop-motion style, handcrafted 3D texture',
  'wobble_jelly': 'Wobble/jelly physics animation style, bouncy, playful motion',
  'crayon_drawing': 'Kid\'s crayon drawing style, childlike innocence, handmade charm',
  'whiteboard': 'Whiteboard sketch, marker-drawn explainer, educational feel',
  'paper_cutout': 'Paper cutout/collage, layered textures, scrapbook aesthetic',
  'pixel_art': 'Pixel art/8-bit retro game style, nostalgic, digital craft',
  'watercolor': 'Watercolor painting, soft washes, organic bleeding edges',
  'chalkboard': 'Chalkboard/blackboard style, chalk-drawn, educational setting',
  'pop_art': 'Pop art/Warhol style, bold outlines, halftone dots, vibrant colors',
  'neon_cyberpunk': 'Neon glow, cyberpunk aesthetic, dark with electric highlights',
  'vintage_poster': 'Vintage propaganda poster, retro illustration, bold messaging',
  'blueprint': 'Blueprint/technical drawing, engineering style, precise and detailed',
  'embroidery': 'Embroidery/cross-stitch style, fabric texture, handcraft aesthetic',
  'balloon_inflatable': 'Balloon/inflatable style, puffy 3D letters, playful and tactile',
  'ice_sculpture': 'Ice sculpture, frozen crystalline forms, luxury and precision',
  'food_art': 'Food art composition, edible arrangements, culinary creativity',
  'miniature_tilt': 'Miniature/tilt-shift photography, tiny world, diorama feel',
  'xray_see_through': 'X-ray/see-through effect, revealing internal structure',
  'holographic': 'Holographic/iridescent, rainbow shimmer, futuristic material',
  'origami': 'Origami/paper fold, geometric precision, Japanese craft aesthetic',
  'stained_glass': 'Stained glass window, rich jewel tones, light filtering through',
  'mosaic': 'Mosaic/tile pattern, tessellation, fragmented beauty',
  'sand_sculpture': 'Sand sculpture, beach art, ephemeral natural medium',
  'cloud_smoke': 'Cloud/smoke formation, ethereal shapes, dreamlike atmosphere'
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

      // Build cognitive bias context for ad copy
      const biasContext = cognitive_biases?.length > 0
        ? `\n## COGNITIVE BIASES TO WEAVE INTO COPY\n${cognitive_biases.map(b => `- **${b}**: ${COGNITIVE_BIASES[b] || b}`).join('\n')}\n\nYou MUST strategically apply these biases in your copy. The hook should leverage 1-2 biases. The body should weave in all remaining biases naturally. Each bias should serve the persuasion arc, not feel forced.\n`
        : '';

      // Build structured knowledge base context for this ad
      const knowledgeBaseContext = buildAdCopyContext({
        industry: client_data?.industry || '',
        awarenessLevel: awareness_level || 'problem_aware',
        platform: platform || 'facebook',
        tone: tone || 'conversational',
        hookFramework: hook_framework || '',
        trafficTemp: awareness_level === 'most_aware' ? 'hot' : (awareness_level === 'product_aware' ? 'warm' : 'cold')
      });
      const brandInjection = buildBrandInjectionString(client_data);

      const copyPrompt = `You are a world-class direct response copywriter with deep expertise in behavioral psychology, cognitive biases, and persuasion science. You've studied the work of Gary Halbert, Eugene Schwartz, Joe Sugarman, Gary Bencivenga, and David Ogilvy. You understand that great advertising is not about features — it's about triggering emotional and cognitive responses that make action feel inevitable.

Generate ${num_variations || 3} ad copy variations that demonstrate mastery of:
1. **Cognitive bias application** — Every line should serve a psychological purpose
2. **Emotional specificity** — Not "feel better" but "feel the energy you had at 25 when you could play with your kids without getting winded"
3. **Pattern interrupts** — The scroll must stop. Use unexpected angles, counterintuitive openings, or curiosity gaps.
4. **Narrative micro-arcs** — Even in 125 words, tell a story: tension → insight → resolution → action

## Client/Brand
${client_data ? JSON.stringify(client_data, null, 2) : 'No brand data provided - use professional defaults'}
${brandInjection}

## Audience & Awareness Psychology
- Target Audience: ${target_audience || 'Not specified'}
- ${awarenessInfo}

IMPORTANT AWARENESS CONTEXT:
- **Unaware**: They don't know they have a problem. You need a pattern interrupt — something that makes them realize "wait, that's me." Never mention the product directly. Lead with the problem disguised as a story or surprising fact.
- **Problem Aware**: They feel the pain but don't know solutions exist. Amplify their frustration with vivid, specific language. Paint their daily struggle. Then hint at a way out.
- **Solution Aware**: They know solutions exist but haven't chosen yours. Lead with your UNIQUE MECHANISM — what makes your approach fundamentally different. Use comparison and contrast biases.
- **Product Aware**: They know about you but haven't committed. Stack social proof, eliminate objections, show transformation stories from people just like them.
- **Most Aware**: They're ready, just need the final push. Lead with the offer, urgency, guarantee. Make inaction feel costly.

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
${biasContext}

## META ADS KNOWLEDGE BASE (structured best practices & templates)
${knowledgeBaseContext}

## ADVANCED COPY PRINCIPLES (apply throughout)

### Hook Mastery
- The first line has ONE job: make them read the second line
- Use "fascination" techniques: specific numbers, unexpected claims, identity-based opening
- Examples of elite hooks: "The $4.2 billion mistake 97% of women make before breakfast" / "My cardiologist said this was impossible. Then I showed him my labs."

### Body Copy Architecture
- Each paragraph should create a "slippery slide" (Joe Sugarman) — impossible to stop reading
- Use the "bucket brigade" technique: short transitional phrases that maintain momentum ("Here's the thing...", "But here's where it gets interesting...", "And the best part?")
- Alternate between emotional and logical appeals (feel → think → feel → act)
- Include at least one "specificity marker" per variation (exact number, date, percentage, or named entity)

### CTA Psychology
- The CTA should feel like the natural, inevitable next step — not a request
- Frame the CTA around what they GET, not what they DO ("Get Your Free Guide" > "Download Now")
- Add micro-urgency near the CTA without being slimy

## Output Format
For each variation, provide:
1. **Hook** (first line - must stop the scroll — apply your best hook framework)
2. **Primary Text** (full ad body — apply biases, bucket brigades, emotional specificity)
3. **Headline** (short, punchy, benefit-driven)
4. **Description** (supporting line with proof or urgency)
5. **CTA Text** (button text — action + benefit)
6. **Triggers Used** (which specific cognitive biases and psychological triggers were applied)
7. **Hook Framework** (which framework was used and why it's optimal for this awareness level)

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
        ? `## COGNITIVE BIASES TO ENCODE VISUALLY\n${cognitive_biases.map(b => `- **${b}**: ${COGNITIVE_BIASES[b] || b}`).join('\n')}\n\nEach prompt MUST visually encode at least 2-3 of these biases. For example:\n- "social_proof" → show crowds, groups of happy users, testimonial-style layouts, user count badges\n- "scarcity" → visual timers, "almost gone" visual cues, single item on empty shelf\n- "authority" → lab coats, clinical settings, university crests, microscopes\n- "contrast_effect" → split composition showing the bad alternative vs the good one\n- "curiosity_gap" → partially hidden or blurred elements that create visual intrigue\n- "endowment" → person already using/enjoying the product, ownership cues\n- "loss_aversion" → before/without imagery showing what they'd miss\n`
        : '';

      // Build style descriptions
      const styleDescriptions = ad_styles?.length > 0
        ? `## VISUAL STYLES TO USE\n${ad_styles.map(s => `- **${s}**: ${AD_STYLES[s] || s}`).join('\n')}\n\nEach prompt should be crafted in one of these specific visual styles. Distribute them across prompts for variety.`
        : '';

      // Build structured image prompt context from knowledge base
      const imageKnowledgeBase = buildImagePromptContext({
        awarenessLevel: awareness_level || 'problem_aware',
        platform: platform || 'facebook',
        industry: client_data?.industry || '',
        brandData: client_data?.style_guide ? {
          colors: {
            primary: client_data.style_guide.primary_color,
            secondary: client_data.style_guide.secondary_color,
            accent: client_data.style_guide.accent_color
          },
          typography: { heading_font: client_data.style_guide.heading_font },
          voice: client_data.brand_voice
        } : null,
        aspectRatio: aspect_ratio || '4:5'
      });

      const imagePrompt = `You are a world-class creative director and AI image prompt engineer who understands both visual psychology and Meta advertising performance science. You specialize in creating image prompts that:
1. Stop the scroll in under 0.3 seconds
2. Encode cognitive biases into visual elements
3. Match the audience's awareness level with the right visual strategy
4. Produce images that feel native to the platform (not stock-photo-generic)

Generate ${num_prompts || 5} highly detailed image prompts.

## Client/Brand
${client_data ? JSON.stringify(client_data, null, 2) : 'No brand data provided'}

## Awareness Level Strategy
${awarenessInfo}

VISUAL STRATEGY BY AWARENESS:
- **Unaware**: Pattern interrupt visuals. Unexpected juxtapositions, optical illusions, "wait what?" moments. The image alone must stop the scroll. NO product shots.
- **Problem Aware**: Pain visualization. Show the frustration, the mess, the struggle — make them FEEL their problem through the image. Empathy-driven compositions.
- **Solution Aware**: Unique mechanism visualization. Show HOW your solution works differently. Process shots, infographic-style elements, "inside look" compositions.
- **Product Aware**: Social proof and transformation. Before/after, testimonial-style, group of happy users, results visualization.
- **Most Aware**: Product hero + urgency cues. Beautiful product photography with "limited" or "exclusive" visual markers. Premium feel.

${biasInfo}
${styleDescriptions}

## META ADS IMAGE KNOWLEDGE BASE
${imageKnowledgeBase}

## Technical Specifications
- Aspect Ratio: ${aspect_ratio || '4:5'} — compose specifically for this frame
- Platform: Meta (Facebook/Instagram) — mobile-first viewing
${custom_concept ? `- Custom Creative Direction: ${custom_concept}` : ''}

## PROMPT ENGINEERING REQUIREMENTS
Each prompt must be 80-150 words and include ALL of these elements:
1. **Subject** — What is the main element? Be hyper-specific (not "a woman" but "a 35-year-old woman with tired eyes and messy bun looking at her phone at 2am")
2. **Setting/Environment** — Where? Be specific about the space, background, and atmospheric elements
3. **Lighting** — Exact lighting setup (golden hour, harsh fluorescent, soft box, rim light, etc.)
4. **Camera/Composition** — Angle, lens (85mm portrait, wide angle, macro), depth of field, rule of thirds placement
5. **Color Palette** — Dominant and accent colors, mood they create
6. **Mood/Emotion** — The feeling the viewer should get in 0.3 seconds
7. **Cognitive Bias Encoding** — Which biases are embedded visually and HOW
8. **Scroll-Stop Element** — The ONE thing that makes someone pause mid-scroll
9. **Style Direction** — The specific visual style (from the styles list above if provided)

## NEGATIVE CONSTRAINTS
- No generic stock photography vibes
- No cliché corporate imagery (handshakes, arrows going up, etc.)
- No text in the image (text overlay is added later)
- Avoid oversaturated/HDR look
- No AI-obvious artifacts (extra fingers, melting faces, etc.)

Respond in JSON:
{
  "prompts": [
    {
      "concept": "Brief 5-word concept",
      "prompt": "Full detailed image generation prompt (80-150 words)...",
      "style": "Which visual style this uses",
      "biases_encoded": ["bias_key1", "bias_key2"],
      "scroll_stop_element": "What makes someone pause",
      "rationale": "Psychological reasoning for why this image works for this awareness level and audience"
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

      const emailPrompt = `You are a master email sequence architect who combines direct response copywriting with behavioral psychology. You understand the Todd Brown "Unique Mechanism" framework, the Frank Kern "Results In Advance" method, and the Ryan Deiss "Invisible Selling Machine" architecture.

Every email must serve a dual purpose: deliver genuine value AND advance the reader one step closer to conversion. No email should feel like pure selling.

Generate a ${seqLength}-email sequence.

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

## SEQUENCE TYPE DEEP STRATEGY
${seqType === 'lead-nurture' ? `LEAD NURTURE ARCHITECTURE:
- Email 1: "Welcome + Quick Win" — Deliver the lead magnet promise + one actionable insight. Use reciprocity bias.
- Email 2: "The Backstory" — Share the origin story. Why does this brand/product exist? Use liking and authenticity.
- Email 3: "The Mistake" — Reveal the #1 mistake the audience is making. Use authority + curiosity gap.
- Email 4: "The Proof" — Case study or transformation story. Specific numbers. Use social proof + survivorship.
- Email 5+: "The Bridge" — Connect their problem to your solution as the logical next step. Soft CTA.` : ''}
${seqType === 'sales-funnel' ? `SALES FUNNEL ARCHITECTURE:
- Email 1: "The Hook" — Open with the most compelling version of their problem. Use loss aversion.
- Email 2: "The Agitate" — Deepen the pain. Show the real cost of inaction with specifics. Use regret aversion.
- Email 3: "The Solution" — Introduce the unique mechanism. Why THIS approach is different. Use authority + contrast.
- Email 4: "The Proof" — Stack social proof: testimonials, data, expert endorsements. Use bandwagon.
- Email 5+: "The Close" — Urgency + guarantee + final objection handling. Use scarcity + zero risk.` : ''}
${seqType === 'educational' ? `EDUCATIONAL ARCHITECTURE:
- Each email teaches ONE concept that naturally leads to the product
- Use the "Teach → Apply → Connect" framework: teach the concept, show how to apply it, then reveal how the product makes it easier/better
- Include actionable takeaways in every email (not just theory)
- Build the "Unique Mechanism" story across emails — by the end, the reader should understand WHY your approach is fundamentally different` : ''}
${seqType === 'launch' ? `LAUNCH ARCHITECTURE:
- Pre-launch: Build anticipation with "something big is coming" + behind-the-scenes content
- Value bombs: Deliver 2-3 pieces of genuinely useful content that demonstrate expertise
- Social proof: Share early access results, beta tester feedback, expert endorsements
- Cart open: Full pitch with bonuses, guarantee, and clear value proposition
- Final push: Urgency (real deadline), FAQ/objection handling, "last chance" with countdown` : ''}
${seqType === 'abandoned-cart' ? `ABANDONED CART ARCHITECTURE:
- Email 1 (1hr): Gentle reminder — "Did you forget something?" + product image. No pressure.
- Email 2 (24hr): Objection handling — Address the #1 reason people don't buy. Use zero_risk + testimonials.
- Email 3 (48hr): Urgency — "Your cart is expiring" + social proof of recent purchases.
- Email 4 (72hr): Final offer — Small discount or bonus to close the deal. "Last chance" framing.` : ''}

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
    // Build knowledge base metadata for the response
    const kbMeta = {};
    try {
      const { matchIndustry, getHooksForAwareness } = await import('../lib/meta-ads-context/index.js');
      const industryMatch = matchIndustry(client_data?.industry || '');
      if (industryMatch) kbMeta.industry_matched = industryMatch.name;
      kbMeta.recommended_hooks = getHooksForAwareness(awareness_level || 'problem_aware');
    } catch { /* knowledge base metadata is optional */ }

    res.json({
      ...results,
      triggers_used: selectedTriggers.map(t => ({ id: t.id, name: t.name, category: t.category })),
      platform_optimization: {
        platform: platform || 'facebook',
        guidelines: platformGuide
      },
      knowledge_base: kbMeta,
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
