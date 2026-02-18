// RunAds - Meta Ads Best Practices & Platform Specifications
// Character limits, image dimensions, performance factors, creative testing framework,
// and audience-to-ad matching matrix

export const PLATFORM_SPECS = {
  facebook: {
    name: 'Facebook',
    placements: {
      feed: {
        image: { width: 1080, height: 1080, ratio: '1:1', alt_ratios: ['4:5', '16:9'] },
        video: { width: 1080, height: 1080, ratio: '1:1', max_length: 240, recommended_length: '15-30s' },
        carousel: { cards: { min: 2, max: 10 }, image: { width: 1080, height: 1080 } }
      },
      stories: {
        image: { width: 1080, height: 1920, ratio: '9:16' },
        video: { width: 1080, height: 1920, ratio: '9:16', max_length: 120, recommended_length: '5-15s' }
      },
      reels: {
        video: { width: 1080, height: 1920, ratio: '9:16', max_length: 90, recommended_length: '15-30s' }
      },
      right_column: {
        image: { width: 1200, height: 628, ratio: '1.91:1' }
      }
    },
    text_limits: {
      primary_text: { max: 125, recommended: '40-80 chars above fold, 125-250 total', note: 'First 125 chars visible without "See More"' },
      headline: { max: 40, recommended: '25-40 chars', note: 'Truncated after 40 chars on mobile' },
      description: { max: 30, recommended: '20-30 chars', note: 'Not always shown' },
      link_description: { max: 250, note: 'Below headline on link ads' }
    },
    best_practices: [
      'Mobile-first: 98%+ of Facebook ad views are on mobile. Design for small screens.',
      'First 3 seconds are everything for video. Hook or lose them.',
      'Text overlay on images: keep under 20% for better delivery (soft guideline).',
      'Carousel ads often outperform single image for consideration objectives.',
      'UGC-style creative typically outperforms polished studio creative for DTC.',
      'Use the "See More" fold strategically — put the hook above, details below.'
    ]
  },

  instagram: {
    name: 'Instagram',
    placements: {
      feed: {
        image: { width: 1080, height: 1350, ratio: '4:5', alt_ratios: ['1:1'] },
        video: { width: 1080, height: 1350, ratio: '4:5', max_length: 120, recommended_length: '15-30s' },
        carousel: { cards: { min: 2, max: 10 }, image: { width: 1080, height: 1080 } }
      },
      stories: {
        image: { width: 1080, height: 1920, ratio: '9:16' },
        video: { width: 1080, height: 1920, ratio: '9:16', max_length: 120, recommended_length: '5-15s' }
      },
      reels: {
        video: { width: 1080, height: 1920, ratio: '9:16', max_length: 90, recommended_length: '15-30s' }
      }
    },
    text_limits: {
      primary_text: { max: 125, recommended: '100-200 words', note: 'Instagram truncates aggressively' },
      headline: { max: 40, recommended: '20-30 chars' },
      description: { max: 30, recommended: '20-30 chars' }
    },
    best_practices: [
      '4:5 ratio takes up the most feed real estate on mobile — use it.',
      'Instagram audiences respond to aesthetics. Visual quality matters more here than Facebook.',
      'Reels placement is the highest-growth, lowest-cost placement right now.',
      'Hashtags in ad copy: 3-5 relevant hashtags can improve discovery.',
      'Use emojis strategically (2-3 max). They catch the eye in the feed.',
      'Carousel ads with storytelling arcs outperform random product showcases.'
    ]
  }
};

export const PERFORMANCE_FACTORS = {
  creative_hierarchy: {
    description: 'What matters most for ad performance, in order of impact',
    factors: [
      { rank: 1, factor: 'Creative/Visual', impact: '50-70%', note: 'The image or video is the #1 driver of performance. A great offer with bad creative will fail.' },
      { rank: 2, factor: 'Offer/Value Prop', impact: '20-30%', note: 'What you\'re offering and how you frame it. Free trial > discount > full price.' },
      { rank: 3, factor: 'Audience Targeting', impact: '10-15%', note: 'With Advantage+ and broad targeting, creative IS targeting. The algorithm finds the right people for the right creative.' },
      { rank: 4, factor: 'Copy/Messaging', impact: '5-10%', note: 'Copy supports the creative. It rarely saves bad creative but can amplify great creative.' },
      { rank: 5, factor: 'Landing Page', impact: '5-10%', note: 'Post-click experience. Fast load, message match, clear CTA.' }
    ]
  },

  creative_fatigue: {
    description: 'How to detect and manage ad fatigue',
    signals: [
      'Frequency > 3.0 with declining CTR',
      'CPA increasing 20%+ over 5-7 days with no external factors',
      'CTR declining 20%+ week-over-week on same audience',
      'Relevance/Quality score dropping'
    ],
    solutions: [
      'Refresh creative (new image/video, same copy) — cheapest fix',
      'Swap hook (new first line, same body) — tests messaging angle',
      'New format (static → carousel → video) — resets pattern recognition',
      'Audience expansion (lookalike % increase) — finds fresh eyeballs',
      'Full creative refresh (new concept entirely) — nuclear option'
    ],
    refresh_cadence: 'Refresh top-performing ads every 2-4 weeks. Have 3-5 creative concepts in rotation at all times.'
  },

  audience_ad_matching: {
    description: 'Match the right ad type to the right audience temperature',
    matrix: {
      cold: {
        temperature: 'Cold (never heard of you)',
        objectives: ['Awareness', 'Traffic', 'Video Views'],
        ad_types: ['Story-driven video', 'Educational carousel', 'Problem-awareness image'],
        hooks: ['curiosity-gap', 'contrarian', 'story-hook', 'statistic-lead'],
        copy_length: 'Short to medium (50-150 words)',
        cta_strength: 'Soft (Learn More, Watch, Read)',
        budget_note: 'Allocate 60-70% of budget here for top-of-funnel growth'
      },
      warm: {
        temperature: 'Warm (engaged with content, visited site)',
        objectives: ['Consideration', 'Lead Generation', 'Traffic'],
        ad_types: ['Testimonial video', 'Product demo', 'Comparison carousel'],
        hooks: ['social-proof', 'before-after', 'question-hook', 'direct-benefit'],
        copy_length: 'Medium (100-250 words)',
        cta_strength: 'Medium (Get Free Guide, Start Trial, Book Call)',
        budget_note: 'Allocate 20-25% of budget for middle-funnel nurturing'
      },
      hot: {
        temperature: 'Hot (added to cart, started checkout, past customers)',
        objectives: ['Conversions', 'Sales', 'Catalog Sales'],
        ad_types: ['Dynamic product ads', 'Offer/discount image', 'Urgency video'],
        hooks: ['fomo', 'direct-benefit', 'social-proof'],
        copy_length: 'Short (30-80 words)',
        cta_strength: 'Strong (Buy Now, Complete Order, Claim Offer)',
        budget_note: 'Allocate 10-15% of budget for bottom-funnel conversion'
      }
    }
  }
};

export const CREATIVE_TESTING_FRAMEWORK = {
  description: 'How to test ad creative scientifically',

  testing_hierarchy: [
    { level: 1, test: 'Concept', description: 'Test fundamentally different creative concepts (UGC vs studio, video vs static, testimonial vs product demo). This has the biggest impact.', min_budget: 50, min_impressions: 1000 },
    { level: 2, test: 'Hook', description: 'Same concept, different opening lines/first frames. Tests which angle resonates most.', min_budget: 30, min_impressions: 800 },
    { level: 3, test: 'Visual Style', description: 'Same concept and hook, different visual treatment (color scheme, composition, model).', min_budget: 30, min_impressions: 800 },
    { level: 4, test: 'Copy', description: 'Same creative, different body copy. Tests messaging and persuasion approach.', min_budget: 25, min_impressions: 500 },
    { level: 5, test: 'CTA', description: 'Same everything, different call-to-action. Smallest impact but easiest to test.', min_budget: 20, min_impressions: 500 }
  ],

  statistical_significance: {
    minimum_conversions: 50,
    confidence_level: '95%',
    note: 'Don\'t make decisions on less than 50 conversions per variant. Small samples lie.',
    rule_of_thumb: 'If a variant has 2x the conversions of another after 50+ conversions each, it\'s likely a real winner.'
  },

  naming_convention: {
    format: '[Date]_[Concept]_[Hook]_[Audience]_[Placement]',
    example: '2024-01_UGC-Testimonial_PAS-Hook_LAL-3pct_Feed',
    note: 'Consistent naming lets you analyze patterns across campaigns'
  },

  iteration_rules: [
    'Kill clear losers after 1000+ impressions and 0 conversions',
    'Scale winners by 20-30% budget increase every 3 days (not more)',
    'Always have a "control" (current best) running against challengers',
    'Test one variable at a time unless budget supports multivariate',
    'Document learnings: what worked, what didn\'t, and WHY you think so'
  ]
};

/**
 * Get platform specs for a given platform
 */
export function getPlatformSpec(platform) {
  return PLATFORM_SPECS[platform] || PLATFORM_SPECS.facebook;
}

/**
 * Get the audience-to-ad matching recommendations
 */
export function getAudienceAdMatch(temperature) {
  return PERFORMANCE_FACTORS.audience_ad_matching.matrix[temperature] || null;
}
