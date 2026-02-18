import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

// Default templates to seed
const DEFAULT_TEMPLATES = [
  {
    id: 'advertorial-health-editorial',
    name: 'Health Editorial Advertorial',
    type: 'advertorial',
    description: 'Professional health/wellness advertorial that reads like a news article. Perfect for supplements, health products, and medical devices.',
    industries: ['health', 'wellness', 'supplements', 'beauty', 'fitness'],
    conversion_goals: ['purchase', 'signup', 'lead'],
    section_structure: [
      { name: 'header', type: 'editorial_header', elements: ['publication_logo', 'native_ad_disclosure', 'share_buttons', 'date'] },
      { name: 'hero', type: 'article_hero', elements: ['headline', 'subheadline', 'author_byline', 'featured_image'] },
      { name: 'hook', type: 'story_intro', elements: ['personal_story', 'problem_identification', 'curiosity_hook'] },
      { name: 'problem_agitation', type: 'content', elements: ['pain_points', 'failed_solutions', 'emotional_connection'] },
      { name: 'discovery', type: 'content', elements: ['breakthrough_moment', 'expert_discovery', 'credibility_builder'] },
      { name: 'solution_reveal', type: 'product_feature', elements: ['product_introduction', 'how_it_works', 'key_benefits'] },
      { name: 'social_proof_1', type: 'testimonials', elements: ['customer_stories', 'before_after', 'verified_results'] },
      { name: 'science_section', type: 'content', elements: ['research_backing', 'ingredient_breakdown', 'expert_quotes'] },
      { name: 'benefits_deep_dive', type: 'features', elements: ['benefit_cards', 'comparison_chart', 'unique_differentiators'] },
      { name: 'social_proof_2', type: 'testimonials', elements: ['more_testimonials', 'media_mentions', 'trust_badges'] },
      { name: 'objection_handling', type: 'faq', elements: ['common_questions', 'guarantee_info', 'safety_concerns'] },
      { name: 'cta_section', type: 'cta', elements: ['offer_details', 'urgency_element', 'primary_cta', 'risk_reversal'] },
      { name: 'footer', type: 'editorial_footer', elements: ['disclaimer', 'references', 'related_articles'] }
    ]
  },
  {
    id: 'listicle-money-saving-tips',
    name: 'Money-Saving Tips Listicle',
    type: 'listicle',
    description: 'Native ad disguised as helpful financial tips article. Product naturally integrated as one of the tips.',
    industries: ['finance', 'ecommerce', 'saas', 'insurance', 'all'],
    conversion_goals: ['purchase', 'signup', 'lead', 'download'],
    section_structure: [
      { name: 'header', type: 'content_header', elements: ['site_logo', 'category_tag', 'share_buttons'] },
      { name: 'hero', type: 'listicle_hero', elements: ['number_headline', 'subheadline', 'reading_time', 'featured_image'] },
      { name: 'intro', type: 'content', elements: ['hook_paragraph', 'problem_statement', 'promise'] },
      { name: 'tip_1', type: 'list_item', elements: ['number_badge', 'tip_headline', 'explanation', 'action_item'] },
      { name: 'tip_2', type: 'list_item', elements: ['number_badge', 'tip_headline', 'explanation', 'action_item'] },
      { name: 'tip_3', type: 'list_item', elements: ['number_badge', 'tip_headline', 'explanation', 'action_item'] },
      { name: 'tip_4_product', type: 'list_item_featured', elements: ['number_badge', 'tip_headline', 'product_integration', 'benefits', 'soft_cta'] },
      { name: 'tip_5', type: 'list_item', elements: ['number_badge', 'tip_headline', 'explanation', 'action_item'] },
      { name: 'tip_6', type: 'list_item', elements: ['number_badge', 'tip_headline', 'explanation', 'action_item'] },
      { name: 'bonus_tip', type: 'list_item_featured', elements: ['bonus_badge', 'tip_headline', 'product_callback', 'testimonial', 'cta'] },
      { name: 'conclusion', type: 'content', elements: ['summary', 'encouragement', 'final_cta'] },
      { name: 'author_box', type: 'author', elements: ['author_photo', 'author_bio', 'credentials'] }
    ]
  },
  {
    id: 'quiz-personalization',
    name: 'Personalization Quiz',
    type: 'quiz',
    description: 'Interactive quiz that leads to personalized product recommendation. Great for beauty, health, fashion, and subscription products.',
    industries: ['beauty', 'health', 'fashion', 'subscription', 'ecommerce'],
    conversion_goals: ['lead', 'purchase', 'signup'],
    section_structure: [
      { name: 'landing', type: 'quiz_landing', elements: ['headline', 'subheadline', 'quiz_preview', 'start_button', 'time_estimate'] },
      { name: 'questions', type: 'quiz_questions', elements: ['progress_bar', 'question_text', 'answer_options'] },
      { name: 'email_capture', type: 'quiz_capture', elements: ['almost_done_message', 'email_input', 'privacy_note', 'see_results_button'] },
      { name: 'loading_results', type: 'quiz_loading', elements: ['analyzing_message', 'loading_animation'] },
      { name: 'results', type: 'quiz_results', elements: ['personalized_headline', 'result_type', 'result_description', 'product_recommendation'] },
      { name: 'product_details', type: 'product_feature', elements: ['why_this_product', 'key_benefits', 'testimonial'] },
      { name: 'offer', type: 'cta', elements: ['special_offer', 'discount_code', 'cta_button', 'guarantee'] },
      { name: 'share', type: 'social_share', elements: ['share_prompt', 'share_buttons'] }
    ]
  },
  {
    id: 'vip-exclusive-access',
    name: 'VIP Exclusive Access',
    type: 'vip',
    description: 'Premium, exclusive offer page with luxury feel. Perfect for high-ticket items, limited releases, and VIP programs.',
    industries: ['luxury', 'fashion', 'beauty', 'coaching', 'membership', 'all'],
    conversion_goals: ['purchase', 'signup', 'lead'],
    section_structure: [
      { name: 'header', type: 'minimal_header', elements: ['logo', 'vip_badge'] },
      { name: 'hero', type: 'vip_hero', elements: ['exclusive_headline', 'invitation_subheadline', 'limited_spots_indicator', 'hero_image'] },
      { name: 'selection_message', type: 'content', elements: ['youve_been_selected', 'why_you_qualify', 'what_this_means'] },
      { name: 'offer_details', type: 'vip_offer', elements: ['offer_headline', 'offer_description', 'value_proposition', 'exclusive_benefits'] },
      { name: 'benefits_grid', type: 'features', elements: ['benefit_1', 'benefit_2', 'benefit_3', 'benefit_4'] },
      { name: 'social_proof', type: 'testimonials', elements: ['vip_testimonials', 'notable_members', 'results_achieved'] },
      { name: 'comparison', type: 'comparison', elements: ['regular_vs_vip', 'value_breakdown', 'savings_highlight'] },
      { name: 'urgency', type: 'urgency', elements: ['countdown_timer', 'spots_remaining', 'deadline_message'] },
      { name: 'cta_section', type: 'cta', elements: ['claim_spot_button', 'price_display', 'guarantee', 'payment_options'] },
      { name: 'faq', type: 'faq', elements: ['vip_questions', 'what_happens_next', 'cancellation_policy'] },
      { name: 'final_cta', type: 'cta', elements: ['last_chance_message', 'cta_button', 'contact_option'] }
    ]
  },
  {
    id: 'calculator-savings',
    name: 'Savings Calculator',
    type: 'calculator',
    description: 'Interactive calculator showing potential savings or ROI. Great for SaaS, financial services, and comparison tools.',
    industries: ['saas', 'finance', 'insurance', 'energy', 'ecommerce', 'all'],
    conversion_goals: ['lead', 'demo', 'signup', 'purchase'],
    section_structure: [
      { name: 'header', type: 'simple_header', elements: ['logo', 'value_prop_tagline'] },
      { name: 'hero', type: 'calculator_hero', elements: ['headline', 'subheadline', 'calculator_preview'] },
      { name: 'calculator', type: 'interactive_calculator', elements: ['input_fields', 'calculate_button', 'results_display'] },
      { name: 'results_breakdown', type: 'calculator_results', elements: ['current_cost', 'potential_savings', 'comparison_visual', 'roi_calculation'] },
      { name: 'personalized_cta', type: 'cta', elements: ['based_on_results_message', 'recommended_plan', 'cta_button'] },
      { name: 'how_it_works', type: 'features', elements: ['step_1', 'step_2', 'step_3', 'step_4'] },
      { name: 'social_proof', type: 'testimonials', elements: ['customer_savings_stories', 'average_savings_stat', 'company_logos'] },
      { name: 'comparison', type: 'comparison', elements: ['before_after', 'competitor_comparison', 'feature_matrix'] },
      { name: 'trust_signals', type: 'social_proof', elements: ['security_badges', 'certifications', 'reviews_score'] },
      { name: 'faq', type: 'faq', elements: ['calculation_methodology', 'getting_started', 'pricing_questions'] },
      { name: 'final_cta', type: 'cta', elements: ['recap_savings', 'start_saving_button', 'demo_option', 'guarantee'] }
    ]
  }
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    const now = new Date().toISOString();

    for (const template of DEFAULT_TEMPLATES) {
      try {
        // Check if template already exists
        const existing = await sql`SELECT id FROM page_templates WHERE id = ${template.id}`;

        if (existing.rows.length > 0) {
          results.skipped.push(template.id);
          continue;
        }

        // Insert template
        await sql`
          INSERT INTO page_templates (
            id, name, type, description, section_structure,
            industries, conversion_goals, is_active, created_at, updated_at
          )
          VALUES (
            ${template.id},
            ${template.name},
            ${template.type},
            ${template.description},
            ${JSON.stringify(template.section_structure)}::jsonb,
            ${JSON.stringify(template.industries)}::jsonb,
            ${JSON.stringify(template.conversion_goals)}::jsonb,
            true,
            ${now},
            ${now}
          )
        `;

        results.created.push(template.id);
      } catch (error) {
        results.errors.push({ id: template.id, error: error.message });
      }
    }

    return res.status(200).json({
      success: true,
      results,
      total_templates: DEFAULT_TEMPLATES.length
    });
  } catch (error) {
    console.error('Template seed error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
