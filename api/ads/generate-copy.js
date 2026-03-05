import { v4 as uuidv4 } from 'uuid';
import { verifyAuth } from '../../lib/auth.js';
import db from '../../lib/database.js';
import { callClaudeWithFallback } from '../../lib/claude.js';
import { buildAdCopyContext } from '../../lib/meta-ads-context/index.js';
import { getAdGenSkillContext } from '../../lib/skill-loader.js';

export const config = { maxDuration: 300 };

/**
 * Meta Ad Copy Generator
 * Generates high-converting ad copy using client research and proven frameworks
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Verify auth
  const user = await verifyAuth(req, res);
  if (!user) return;

  try {
    const {
      client_id,
      campaign_id,
      ad_type = 'single_image',
      hook_angle,
      target_audience,
      offer_details,
      cta_goal = 'learn_more',
      tone = 'conversational',
      num_variations = 3,
      include_hooks = true,
      custom_instructions,
      brief_id,
      platforms,
      landing_page_id
    } = req.body;

    // Normalize platforms: default to legacy meta-only behavior
    const requestedPlatforms = Array.isArray(platforms) && platforms.length > 0
      ? platforms.map(p => p.toLowerCase())
      : null;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        error: 'client_id is required'
      });
    }

    // Get client data using unified database
    const client = await db.getClientById(client_id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const businessResearch = client.business_research || {};

    // Load campaign brief if provided
    let briefData = null;
    if (brief_id) {
      const briefResult = await db.query('SELECT * FROM campaign_briefs WHERE id = $1', [brief_id]);
      if (briefResult.rows[0]) {
        briefData = briefResult.rows[0];
      }
    }

    // Load landing page copy if provided
    let landingPageCopy = null;
    if (landing_page_id) {
      const pageResult = await db.query(
        'SELECT html_content, meta_title, meta_description FROM landing_pages WHERE id = $1',
        [landing_page_id]
      );
      if (pageResult.rows[0]) {
        const pageHtml = pageResult.rows[0].html_content || '';
        const h1Match = pageHtml.match(/<h1[^>]*>(.*?)<\/h1>/is);
        const h2Match = pageHtml.match(/<h2[^>]*>(.*?)<\/h2>/is);
        landingPageCopy = {
          headline: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '',
          subheadline: h2Match ? h2Match[1].replace(/<[^>]+>/g, '').trim() : '',
          meta_title: pageResult.rows[0].meta_title,
          meta_description: pageResult.rows[0].meta_description
        };
      }
    }

    // Get verified claims for the client
    const verifiedClaims = await db.getVerifiedClaims(client_id, 10);

    // Build rich context from meta-ads-context library + skill-loader
    const adCopyContext = buildAdCopyContext({
      industry: client.industry || businessResearch.industry,
      awarenessLevel: 'problem_aware',
      platform: 'facebook',
      tone,
      hookFramework: hook_angle,
      trafficTemp: 'cold'
    });
    const adSkillContext = getAdGenSkillContext();

    const basePrompt = 'You are an elite Meta ads copywriter who has generated over $100M in revenue for clients. You write ads that stop the scroll, create emotional connection, and drive action.';
    const fullPrompt = `${basePrompt}\n\n${adCopyContext}\n${adSkillContext}`;

    const prompt = buildAdCopyPrompt({
      client,
      businessResearch,
      verifiedClaims,
      adType: ad_type,
      hookAngle: hook_angle,
      targetAudience: target_audience,
      offerDetails: offer_details,
      ctaGoal: cta_goal,
      tone,
      numVariations: num_variations,
      includeHooks: include_hooks,
      customInstructions: custom_instructions,
      platforms: requestedPlatforms,
      briefData,
      landingPageCopy
    });

    const { text: responseText, tokensUsed: totalTokens, json: parsedJson } = await callClaudeWithFallback({
      systemPrompt: fullPrompt,
      baseSystemPrompt: basePrompt,
      userPrompt: prompt,
      model: 'claude-sonnet-4-6',
      maxTokens: 4000
    });

    const adVariations = parsedJson || { raw_response: responseText };

    // Multi-platform response handling
    if (requestedPlatforms) {
      const platformResults = {};
      const platformData = adVariations.platforms || {};

      for (const platform of requestedPlatforms) {
        const platVariations = platformData[platform]?.variations || [];
        const savedForPlatform = [];

        for (const variation of platVariations) {
          const copyId = uuidv4();
          try {
            await db.saveAdCopy({
              id: copyId,
              campaign_id: campaign_id || null,
              client_id,
              user_id: user.userId,
              channel: platform,
              ad_type,
              primary_text: variation.primary_text || variation.hook_text || '',
              headline: variation.headline || (variation.headlines && variation.headlines[0]) || '',
              description: variation.description || (variation.descriptions && variation.descriptions[0]) || '',
              cta: variation.cta || variation.cta_overlay || '',
              hook_angle: variation.hook_angle || hook_angle || '',
              target_audience: target_audience || '',
              offer_details: offer_details || '',
              generation_prompt: prompt.substring(0, 2000),
              model_used: 'claude-sonnet-4',
              tokens_used: totalTokens
            });
            savedForPlatform.push({ id: copyId, ...variation });
          } catch (saveError) {
            console.error(`Error saving ${platform} ad copy:`, saveError);
            savedForPlatform.push({ id: copyId, ...variation });
          }
        }

        platformResults[platform] = savedForPlatform.length > 0 ? savedForPlatform : platVariations;
      }

      return res.status(200).json({
        success: true,
        platforms: platformResults,
        strategy_notes: adVariations.strategy_notes || null,
        tokens_used: totalTokens
      });
    }

    // Legacy single-platform (meta) response
    const savedCopies = [];

    if (adVariations.variations) {
      for (const variation of adVariations.variations) {
        const copyId = uuidv4();
        try {
          await db.saveAdCopy({
            id: copyId,
            campaign_id: campaign_id || null,
            client_id,
            user_id: user.userId,
            channel: 'meta',
            ad_type,
            primary_text: variation.primary_text || '',
            headline: variation.headline || '',
            description: variation.description || '',
            cta: variation.cta || '',
            hook_angle: variation.hook_angle || hook_angle || '',
            target_audience: target_audience || '',
            offer_details: offer_details || '',
            generation_prompt: prompt.substring(0, 2000),
            model_used: 'claude-sonnet-4',
            tokens_used: totalTokens
          });
          savedCopies.push({
            id: copyId,
            ...variation
          });
        } catch (saveError) {
          console.error('Error saving ad copy:', saveError);
          savedCopies.push({
            id: copyId,
            ...variation
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      variations: savedCopies.length > 0 ? savedCopies : adVariations.variations || [],
      strategy_notes: adVariations.strategy_notes || null,
      tokens_used: totalTokens
    });

  } catch (error) {
    console.error('Ad copy generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function buildAdCopyPrompt({
  client,
  businessResearch,
  verifiedClaims,
  adType,
  hookAngle,
  targetAudience,
  offerDetails,
  ctaGoal,
  tone,
  numVariations,
  includeHooks,
  customInstructions,
  platforms,
  briefData,
  landingPageCopy
}) {
  const ctaMap = {
    learn_more: 'Learn More',
    shop_now: 'Shop Now',
    sign_up: 'Sign Up',
    get_offer: 'Get Offer',
    book_now: 'Book Now',
    download: 'Download',
    contact_us: 'Contact Us',
    get_quote: 'Get Quote'
  };

  const toneGuides = {
    conversational: 'Write like you\'re talking to a friend. Use "you" and "your" frequently. Be warm but not salesy.',
    urgent: 'Create urgency without being pushy. Use time-sensitive language and scarcity elements naturally.',
    professional: 'Authoritative and credible. Focus on expertise and results. Avoid hype.',
    playful: 'Light, fun, and engaging. Use humor where appropriate. Make people smile.',
    authoritative: 'Expert positioning. Use data, credentials, and social proof. Confident but not arrogant.'
  };

  let prompt = `BUSINESS CONTEXT:
Company: ${businessResearch.company_name || client.name}
Industry: ${client.industry || businessResearch.industry || 'Unknown'}
Value Propositions: ${JSON.stringify(businessResearch.value_propositions || [])}
Products/Services: ${JSON.stringify(businessResearch.products?.slice(0, 3) || [])}
Target Audiences: ${JSON.stringify(businessResearch.target_audiences?.slice(0, 2) || [])}
Brand Voice: ${client.brand_voice || businessResearch.brand_voice || 'Professional yet approachable'}
Unique Differentiators: ${JSON.stringify(businessResearch.unique_differentiators || [])}

VERIFIED CLAIMS (use these for credibility):
${verifiedClaims.map(c => `- [${c.claim_type}] ${c.claim_text}`).join('\n') || 'No verified claims available'}`;

  // Inject campaign brief context
  if (briefData) {
    prompt += `

## CAMPAIGN BRIEF CONTEXT
Objective: ${briefData.objective || 'Not specified'}
Target Audience: ${JSON.stringify(briefData.target_audience || {})}
Key Messaging: ${JSON.stringify(briefData.messaging || {})}
Platforms: ${JSON.stringify(briefData.platforms || [])}
Budget: ${JSON.stringify(briefData.budget || {})}`;
  }

  // Inject landing page alignment context
  if (landingPageCopy) {
    prompt += `

## LANDING PAGE COPY (Ensure ad copy aligns with this)
Headline: ${landingPageCopy.headline}
Subheadline: ${landingPageCopy.subheadline}
Meta Title: ${landingPageCopy.meta_title || ''}
Meta Description: ${landingPageCopy.meta_description || ''}`;
  }

  prompt += `

GENERATION REQUIREMENTS:
- Ad Type: ${adType}
- Hook Angle: ${hookAngle || 'Choose the most compelling angle based on research'}
- Target Audience: ${targetAudience || 'Use target audience from research'}
- Offer/Promotion: ${offerDetails || 'No specific offer - focus on value proposition'}
- CTA Button: ${ctaMap[ctaGoal] || 'Learn More'}
- Tone: ${tone} - ${toneGuides[tone] || toneGuides.conversational}
- Number of Variations: ${numVariations}

${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}`;

  // Multi-platform prompt
  if (platforms) {
    const platformSpecs = [];

    if (platforms.includes('meta')) {
      platformSpecs.push(`### Meta (Facebook/Instagram)
For each variation:
- primary_text (125-500 chars) - Main ad copy above the image
- headline (under 40 chars) - Punchy headline on the image
- description (under 30 chars) - Supporting text below headline
- cta - Button text
- hook_angle - Name the hook strategy used`);
    }

    if (platforms.includes('google')) {
      platformSpecs.push(`### Google Ads
For each variation:
- headlines - Array of up to 15 headlines (each max 30 chars)
- descriptions - Array of up to 4 descriptions (each max 90 chars)
- sitelinks - Array of suggested sitelink texts
- hook_angle - Name the hook strategy used`);
    }

    if (platforms.includes('tiktok')) {
      platformSpecs.push(`### TikTok
For each variation:
- hook_text - Opening hook text for first 3 seconds
- body_text - Main body copy
- cta_overlay - CTA overlay text for the video
- hashtags - Array of 5-10 relevant hashtags
- hook_angle - Name the hook strategy used`);
    }

    prompt += `

Generate ${numVariations} unique ad variations PER PLATFORM, each with a different hook angle.

## PLATFORM-SPECIFIC REQUIREMENTS:
${platformSpecs.join('\n\n')}

Return ONLY valid JSON in this format:
{
  "platforms": {
    ${platforms.includes('meta') ? `"meta": {
      "variations": [
        { "primary_text": "...", "headline": "...", "description": "...", "cta": "${ctaMap[ctaGoal] || 'Learn More'}", "hook_angle": "..." }
      ]
    }` : ''}${platforms.includes('meta') && (platforms.includes('google') || platforms.includes('tiktok')) ? ',' : ''}
    ${platforms.includes('google') ? `"google": {
      "variations": [
        { "headlines": ["...", "..."], "descriptions": ["...", "..."], "sitelinks": ["...", "..."], "hook_angle": "..." }
      ]
    }` : ''}${platforms.includes('google') && platforms.includes('tiktok') ? ',' : ''}
    ${platforms.includes('tiktok') ? `"tiktok": {
      "variations": [
        { "hook_text": "...", "body_text": "...", "cta_overlay": "...", "hashtags": ["...", "..."], "hook_angle": "..." }
      ]
    }` : ''}
  },
  "strategy_notes": "Brief explanation of why these approaches will work for this audience"
}`;
  } else {
    // Legacy single-platform (meta) prompt
    prompt += `

Generate ${numVariations} unique ad variations, each with a different hook angle. For each variation:
1. Primary Text (125-500 chars) - The main ad copy that appears above the image
2. Headline (under 40 chars) - Punchy headline that appears on the image
3. Description (under 30 chars) - Supporting text below headline
4. CTA - The button text
5. Hook Angle - Name the hook strategy used

Return ONLY valid JSON in this format:
{
  "variations": [
    {
      "primary_text": "The compelling copy that stops the scroll and drives action...",
      "headline": "Short Punchy Headline",
      "description": "Supporting detail",
      "cta": "${ctaMap[ctaGoal] || 'Learn More'}",
      "hook_angle": "Problem-Agitate-Solution"
    }
  ],
  "strategy_notes": "Brief explanation of why these approaches will work for this audience"
}`;
  }

  return prompt;
}
