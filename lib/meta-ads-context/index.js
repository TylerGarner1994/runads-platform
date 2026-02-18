// RunAds - Meta Ads Context Builder
// Compiles hook frameworks, industry templates, and platform best practices
// into structured prompt context for Claude ad generation

import { HOOK_FRAMEWORKS, getHooksForAwareness, getHookPattern } from './high-performing-hooks.js';
import { INDUSTRY_TEMPLATES, matchIndustry, getIndustryTemplates } from './industry-templates.js';
import { PLATFORM_SPECS, PERFORMANCE_FACTORS, CREATIVE_TESTING_FRAMEWORK, getPlatformSpec, getAudienceAdMatch } from './meta-ads-best-practices.js';

/**
 * Build comprehensive ad copy context for Claude prompts
 * Compiles: hook frameworks + industry templates + platform specs + audience matching
 *
 * @param {object} options
 * @param {string} options.industry - Client's industry
 * @param {string} options.awarenessLevel - Schwartz awareness level
 * @param {string} options.platform - Ad platform (facebook, instagram, etc.)
 * @param {string} options.tone - Copy tone
 * @param {string} options.hookFramework - Specific hook to use (optional)
 * @param {string} options.trafficTemp - cold, warm, or hot
 * @returns {string} - Structured context string for Claude prompt injection
 */
export function buildAdCopyContext(options = {}) {
  const {
    industry,
    awarenessLevel = 'problem_aware',
    platform = 'facebook',
    tone = 'conversational',
    hookFramework,
    trafficTemp = 'cold'
  } = options;

  const sections = [];

  // 1. Platform specifications
  const platformSpec = getPlatformSpec(platform);
  if (platformSpec) {
    sections.push(`## PLATFORM SPECIFICATIONS: ${platformSpec.name.toUpperCase()}
Text Limits:
- Primary Text: ${platformSpec.text_limits.primary_text.recommended} (${platformSpec.text_limits.primary_text.note})
- Headline: ${platformSpec.text_limits.headline.recommended} (max ${platformSpec.text_limits.headline.max} chars)
- Description: ${platformSpec.text_limits.description.recommended} (max ${platformSpec.text_limits.description.max} chars)

Image Specs (Feed): ${platformSpec.placements.feed.image.width}x${platformSpec.placements.feed.image.height} (${platformSpec.placements.feed.image.ratio})

Best Practices:
${platformSpec.best_practices.map(bp => `- ${bp}`).join('\n')}`);
  }

  // 2. Hook framework guidance
  const recommendedHooks = getHooksForAwareness(awarenessLevel);
  const activeHook = hookFramework && HOOK_FRAMEWORKS[hookFramework]
    ? HOOK_FRAMEWORKS[hookFramework]
    : HOOK_FRAMEWORKS[recommendedHooks[0]];

  if (activeHook) {
    sections.push(`## HOOK FRAMEWORK: ${activeHook.name.toUpperCase()}
Strategy: ${activeHook.description}
When to Use: ${activeHook.whenToUse}
${tone && activeHook.toneModifiers[tone] ? `Tone Guidance (${tone}): ${activeHook.toneModifiers[tone]}` : ''}

Pattern Templates (adapt to client, don't use verbatim):
${activeHook.patterns.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')}

Other Recommended Hooks for ${awarenessLevel} audience:
${recommendedHooks.filter(h => h !== (hookFramework || recommendedHooks[0])).map(h => `- ${h}: ${HOOK_FRAMEWORKS[h]?.description || ''}`).join('\n')}`);
  }

  // 3. Industry-specific templates (if matched)
  const industryMatch = matchIndustry(industry);
  if (industryMatch) {
    const templates = getIndustryTemplates(industryMatch.key, trafficTemp === 'hot' ? 'retargeting' : 'cold_traffic');
    if (templates) {
      sections.push(`## INDUSTRY CONTEXT: ${industryMatch.name.toUpperCase()}
Common Objections to Address:
${industryMatch.commonObjections.map(o => `- ${o}`).join('\n')}

Best Proof Types for This Industry:
${industryMatch.proofTypes.map(p => `- ${p}`).join('\n')}

${industryMatch.complianceNotes ? `COMPLIANCE: ${industryMatch.complianceNotes}\n` : ''}
Key Metrics This Industry Tracks: ${industryMatch.keyMetrics.join(', ')}

Example Templates (for inspiration — adapt to this client's unique voice):
Primary Text Example: ${templates.primary_text[0]}
Headline Examples: ${templates.headline.join(' | ')}
CTA Options: ${templates.cta.join(', ')}`);
    }
  }

  // 4. Audience temperature matching
  const audienceMatch = getAudienceAdMatch(trafficTemp);
  if (audienceMatch) {
    sections.push(`## AUDIENCE TEMPERATURE: ${audienceMatch.temperature.toUpperCase()}
Recommended Ad Types: ${audienceMatch.ad_types.join(', ')}
Copy Length: ${audienceMatch.copy_length}
CTA Strength: ${audienceMatch.cta_strength}
Best Hook Types: ${audienceMatch.hooks.join(', ')}`);
  }

  // 5. Performance hierarchy reminder
  sections.push(`## CREATIVE PERFORMANCE HIERARCHY
${PERFORMANCE_FACTORS.creative_hierarchy.factors.map(f => `${f.rank}. ${f.factor} (${f.impact} impact) — ${f.note}`).join('\n')}`);

  return sections.join('\n\n---\n\n');
}

/**
 * Build comprehensive image prompt context for Claude
 * Compiles: platform image specs + visual strategy by awareness + creative testing principles
 *
 * @param {object} options
 * @param {string} options.awarenessLevel - Schwartz awareness level
 * @param {string} options.platform - Ad platform
 * @param {string} options.industry - Client's industry
 * @param {object} options.brandData - Client brand colors/fonts
 * @param {string} options.aspectRatio - Desired aspect ratio
 * @returns {string} - Structured context string for Claude image prompt generation
 */
export function buildImagePromptContext(options = {}) {
  const {
    awarenessLevel = 'problem_aware',
    platform = 'facebook',
    industry,
    brandData,
    aspectRatio = '4:5'
  } = options;

  const sections = [];

  // 1. Image specifications
  const platformSpec = getPlatformSpec(platform);
  if (platformSpec) {
    const feedSpec = platformSpec.placements.feed.image;
    sections.push(`## IMAGE SPECIFICATIONS
Platform: ${platformSpec.name}
Primary Ratio: ${aspectRatio} (compose specifically for this frame)
Feed Image Size: ${feedSpec.width}x${feedSpec.height} (${feedSpec.ratio})
Stories/Reels: 1080x1920 (9:16)
Mobile-first: 98%+ views are on mobile. Design for small screens and fast scrolling.`);
  }

  // 2. Visual strategy by awareness level
  const visualStrategies = {
    'unaware': {
      strategy: 'Pattern Interrupt',
      direction: 'Unexpected juxtapositions, optical illusions, "wait what?" moments. The image alone must stop the scroll. NO product shots. Lead with intrigue.',
      subjects: 'Surprising visuals, unusual compositions, emotional faces with unexpected context',
      avoid: 'Product shots, logos, anything that looks like a typical ad'
    },
    'problem_aware': {
      strategy: 'Pain Visualization',
      direction: 'Show the frustration, the mess, the struggle. Make them FEEL their problem through the image. Empathy-driven compositions.',
      subjects: 'Relatable struggle moments, "that face you make when...", problem in action',
      avoid: 'Happy stock photos, solved problems, product solutions (too early)'
    },
    'solution_aware': {
      strategy: 'Unique Mechanism Visualization',
      direction: 'Show HOW your solution works differently. Process shots, infographic-style elements, "inside look" compositions.',
      subjects: 'Process visualization, ingredient spotlight, mechanism diagrams, comparison layouts',
      avoid: 'Generic product shots, stock photography, anything that looks like competitors'
    },
    'product_aware': {
      strategy: 'Social Proof & Transformation',
      direction: 'Before/after, testimonial-style, group of happy users, results visualization. Show that real people got real results.',
      subjects: 'Customer transformations, result screenshots, review compilations, usage montages',
      avoid: 'Claims without proof, generic lifestyle, anything that feels "too good to be true"'
    },
    'most_aware': {
      strategy: 'Product Hero + Urgency',
      direction: 'Beautiful product photography with "limited" or "exclusive" visual markers. Premium feel. Make the offer irresistible visually.',
      subjects: 'Product hero shots, packaging, unboxing moments, luxury compositions with urgency cues',
      avoid: 'Cheap-looking imagery, too much text, anything that dilutes the premium feel'
    }
  };

  const visualStrategy = visualStrategies[awarenessLevel] || visualStrategies['problem_aware'];
  sections.push(`## VISUAL STRATEGY: ${visualStrategy.strategy.toUpperCase()} (${awarenessLevel})
Direction: ${visualStrategy.direction}
Best Subjects: ${visualStrategy.subjects}
Avoid: ${visualStrategy.avoid}`);

  // 3. Brand injection
  if (brandData) {
    sections.push(`## BRAND VISUAL GUIDELINES
${brandData.colors?.primary ? `Primary Color: ${brandData.colors.primary} — use as accent, not dominant` : ''}
${brandData.colors?.secondary ? `Secondary Color: ${brandData.colors.secondary}` : ''}
${brandData.colors?.accent ? `Accent Color: ${brandData.colors.accent} — use for CTAs and highlights` : ''}
${brandData.typography?.heading_font ? `Heading Font Mood: ${brandData.typography.heading_font}` : ''}
${brandData.voice ? `Brand Voice: ${brandData.voice} — visuals should match this energy` : ''}
Note: Incorporate brand colors subtly through environment, lighting, props, or clothing. Don't make the image look like a branded template.`.trim());
  }

  // 4. Industry visual norms
  const industryMatch = matchIndustry(industry);
  if (industryMatch) {
    sections.push(`## INDUSTRY VISUAL NORMS: ${industryMatch.name}
Best Proof Types (translate to visuals): ${industryMatch.proofTypes.join(', ')}
${industryMatch.complianceNotes ? `Visual Compliance: ${industryMatch.complianceNotes}` : ''}`);
  }

  // 5. Creative testing reminder
  sections.push(`## CREATIVE VARIETY
Generate diverse concepts across different:
- Visual styles (UGC vs studio vs illustration vs split-screen)
- Emotional registers (aspirational vs empathetic vs urgent)
- Composition approaches (close-up vs wide, busy vs minimal)
This enables A/B testing per the creative testing framework.`);

  return sections.join('\n\n---\n\n');
}

/**
 * Build brand injection string from client data
 * Ensures brand consistency in generated image prompts
 */
export function buildBrandInjectionString(clientData) {
  if (!clientData) return '';

  const parts = [];
  if (clientData.brand_voice) parts.push(`Brand Voice: ${clientData.brand_voice}`);
  if (clientData.style_guide?.primary_color) parts.push(`Brand Color: ${clientData.style_guide.primary_color}`);
  if (clientData.style_guide?.accent_color) parts.push(`Accent Color: ${clientData.style_guide.accent_color}`);
  if (clientData.industry) parts.push(`Industry: ${clientData.industry}`);
  if (clientData.tagline) parts.push(`Tagline: ${clientData.tagline}`);

  if (parts.length === 0) return '';
  return `\n## BRAND CONTEXT\n${parts.join('\n')}`;
}

// Re-export sub-module functions for convenience
export { getHooksForAwareness, getHookPattern, matchIndustry, getIndustryTemplates, getPlatformSpec, getAudienceAdMatch };
