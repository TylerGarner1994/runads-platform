import { v4 as uuidv4 } from 'uuid';
import { verifyAuth } from '../../lib/auth.js';
import db, { query } from '../../lib/database.js';

/**
 * Advanced Image Prompt Generator for Meta Ads
 * Optimized for Nano Banana 2 AI image generation
 *
 * Features:
 * - 34 cognitive biases + 5 power stacks
 * - 50 ad style categories
 * - 5 awareness levels (Eugene Schwartz)
 * - Brand injection string generation
 * - Persona-targeted prompts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// COGNITIVE BIASES DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

const COGNITIVE_BIASES = {
  // LOSS & RISK BIASES
  loss_aversion: {
    id: 1,
    name: 'Loss Aversion',
    category: 'loss_risk',
    description: 'Fear of missing gains',
    visual_implementation: 'Show what they could lose or miss out on. Empty spaces where benefits should be. Fading opportunities. Clock imagery suggesting time running out.'
  },
  sunk_cost: {
    id: 2,
    name: 'Sunk Cost',
    category: 'loss_risk',
    description: '"You\'ve already invested..."',
    visual_implementation: 'Show partial progress, incomplete journeys. Investment already made. Progress bars at 70%. "You\'re already halfway there" visual metaphors.'
  },
  zero_risk: {
    id: 3,
    name: 'Zero Risk Bias',
    category: 'loss_risk',
    description: 'Eliminate all perceived risk',
    visual_implementation: 'Shield imagery, safety nets, guarantee badges. Protective elements. "Risk-free" visual cues. Money-back guarantee prominent.'
  },
  regret_aversion: {
    id: 4,
    name: 'Regret Aversion',
    category: 'loss_risk',
    description: 'Fear of future regret',
    visual_implementation: 'Future self looking back. "What if" scenarios. Two-path imagery. Older version wishing they had started sooner.'
  },
  endowment_effect: {
    id: 5,
    name: 'Endowment Effect',
    category: 'loss_risk',
    description: '"Already yours, just claim it"',
    visual_implementation: 'Product already in hands. Gift unwrapping. Name personalization. "Reserved for you" visual elements.'
  },

  // SOCIAL & IDENTITY BIASES
  social_proof: {
    id: 6,
    name: 'Social Proof',
    category: 'social_identity',
    description: '"Everyone\'s doing it"',
    visual_implementation: 'Crowds, groups using product. Notification stacks. Star ratings. Testimonial faces. Numbers showing adoption.'
  },
  bandwagon: {
    id: 7,
    name: 'Bandwagon Effect',
    category: 'social_identity',
    description: 'Join the winning side',
    visual_implementation: 'Growing movement imagery. People joining a group. Momentum visuals. "Join 10,000+ others" with faces.'
  },
  in_group: {
    id: 8,
    name: 'In-Group Bias',
    category: 'social_identity',
    description: '"People like you choose X"',
    visual_implementation: 'People who look like target persona. Same demographics, clothing, environment. "Your tribe" visual.'
  },
  authority: {
    id: 9,
    name: 'Authority Bias',
    category: 'social_identity',
    description: 'Expert endorsement',
    visual_implementation: 'Lab coats, credentials, professional settings. Expert figures with qualifications. Institutional logos.'
  },
  halo_effect: {
    id: 10,
    name: 'Halo Effect',
    category: 'social_identity',
    description: 'Positive association transfer',
    visual_implementation: 'Product near luxury items. Celebrity-like presentation. Premium environments. Association with admired things.'
  },
  liking: {
    id: 11,
    name: 'Liking Bias',
    category: 'social_identity',
    description: 'Attractive/relatable presenter',
    visual_implementation: 'Warm, approachable faces. Genuine smiles. Eye contact. Someone you\'d want to be friends with.'
  },

  // COGNITIVE SHORTCUT BIASES
  anchoring: {
    id: 12,
    name: 'Anchoring',
    category: 'cognitive_shortcut',
    description: 'First number sets reference',
    visual_implementation: 'Crossed-out high prices. "Was $999, now $299" visuals. Comparison numbers. Original price prominent.'
  },
  framing: {
    id: 13,
    name: 'Framing Effect',
    category: 'cognitive_shortcut',
    description: 'Same info, different spin',
    visual_implementation: 'Positive framing visuals. "Save 30%" vs "Pay 70%" visual treatment. Glass half full imagery.'
  },
  availability_heuristic: {
    id: 14,
    name: 'Availability Heuristic',
    category: 'cognitive_shortcut',
    description: 'Recent/vivid examples',
    visual_implementation: 'Dramatic, memorable imagery. Vivid colors. Emotionally striking scenes. Unforgettable visuals.'
  },
  representativeness: {
    id: 15,
    name: 'Representativeness',
    category: 'cognitive_shortcut',
    description: '"Looks like success"',
    visual_implementation: 'Successful-looking people/environments. What success looks like for target. Aspirational but achievable.'
  },
  default_effect: {
    id: 16,
    name: 'Default Effect',
    category: 'cognitive_shortcut',
    description: 'Pre-selected option wins',
    visual_implementation: 'Highlighted "best choice" option. Pre-checked boxes. "Most popular" badges. Recommended path highlighted.'
  },
  mere_exposure: {
    id: 17,
    name: 'Mere Exposure',
    category: 'cognitive_shortcut',
    description: 'Familiarity breeds preference',
    visual_implementation: 'Consistent brand elements. Repeated logo placement. Familiar color schemes. Recognition-building visuals.'
  },

  // DESIRE & MOTIVATION BIASES
  scarcity: {
    id: 18,
    name: 'Scarcity',
    category: 'desire_motivation',
    description: 'Limited quantity/time',
    visual_implementation: 'Low stock indicators. Countdown timers. "Only X left" visuals. Empty shelves with one item remaining.'
  },
  curiosity_gap: {
    id: 19,
    name: 'Curiosity Gap',
    category: 'desire_motivation',
    description: 'Incomplete information',
    visual_implementation: 'Partially revealed images. Blur effects. Hidden elements. "What\'s behind the curtain" visual. Censored/blocked reveals.'
  },
  ikea_effect: {
    id: 20,
    name: 'IKEA Effect',
    category: 'desire_motivation',
    description: 'Value what you build',
    visual_implementation: 'Hands-on imagery. Building/assembly. Personalization in progress. "Made by you" visuals.'
  },
  reciprocity: {
    id: 21,
    name: 'Reciprocity',
    category: 'desire_motivation',
    description: 'Give first, receive later',
    visual_implementation: 'Gift imagery. Free offerings. Generosity visuals. "Free for you" presentation. Giving hands.'
  },
  commitment_consistency: {
    id: 22,
    name: 'Commitment/Consistency',
    category: 'desire_motivation',
    description: 'Small yes → big yes',
    visual_implementation: 'Step-by-step progress. First small action. Easy entry point. Foot-in-door visuals. Simple first step.'
  },
  goal_gradient: {
    id: 23,
    name: 'Goal Gradient',
    category: 'desire_motivation',
    description: 'Closer to finish = motivated',
    visual_implementation: 'Progress bars near completion. Finish line in sight. "Almost there" visuals. Final steps highlighted.'
  },

  // PERCEPTION BIASES
  contrast_effect: {
    id: 24,
    name: 'Contrast Effect',
    category: 'perception',
    description: 'Look better by comparison',
    visual_implementation: 'Side-by-side comparisons. Before/after. Competitor vs. us. Dramatic difference visualization.'
  },
  decoy_effect: {
    id: 25,
    name: 'Decoy Effect',
    category: 'perception',
    description: 'Add inferior option',
    visual_implementation: 'Three options with middle highlighted. Clear "bad deal" option. Obvious best choice setup.'
  },
  von_restorff: {
    id: 26,
    name: 'Von Restorff (Isolation)',
    category: 'perception',
    description: 'Different = remembered',
    visual_implementation: 'One item stands out. Color pop on key element. Isolation of important info. Break from pattern.'
  },
  picture_superiority: {
    id: 27,
    name: 'Picture Superiority',
    category: 'perception',
    description: 'Images > words',
    visual_implementation: 'Strong imagery with minimal text. Let the picture tell the story. Iconic, memorable visuals.'
  },
  rhyme_as_reason: {
    id: 28,
    name: 'Rhyme-as-Reason',
    category: 'perception',
    description: 'Rhyming = believable',
    visual_implementation: 'Rhythmic visual patterns. Repeated elements. Symmetry. Visual "rhyming" through repetition.'
  },
  processing_fluency: {
    id: 29,
    name: 'Processing Fluency',
    category: 'perception',
    description: 'Easy = trustworthy',
    visual_implementation: 'Clean, simple compositions. Easy-to-read layouts. Clear focal points. Uncluttered design.'
  },

  // TRUST & CREDIBILITY BIASES
  ben_franklin: {
    id: 30,
    name: 'Ben Franklin Effect',
    category: 'trust_credibility',
    description: 'Ask small favor first',
    visual_implementation: 'Small engagement prompts. Interactive elements. "Just click" simplicity. Easy first action.'
  },
  pratfall_effect: {
    id: 31,
    name: 'Pratfall Effect',
    category: 'trust_credibility',
    description: 'Flaw admits build trust',
    visual_implementation: 'Honest imperfections shown. "We\'re not perfect, but..." Real, unpolished elements. Authenticity markers.'
  },
  peak_end: {
    id: 32,
    name: 'Peak-End Rule',
    category: 'trust_credibility',
    description: 'Last impression matters',
    visual_implementation: 'Strong final visual element. Memorable ending. Positive concluding imagery. Peak moment capture.'
  },
  confirmation_bias: {
    id: 33,
    name: 'Confirmation Bias',
    category: 'trust_credibility',
    description: 'Affirm existing beliefs',
    visual_implementation: 'Validate what they already think. Nodding, agreeing visuals. "You were right" imagery.'
  },
  survivorship: {
    id: 34,
    name: 'Survivorship Bias',
    category: 'trust_credibility',
    description: 'Show only winners',
    visual_implementation: 'Success stories only. Winners podium. Best results featured. Successful outcomes highlighted.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POWER STACKS - Pre-built bias combinations
// ═══════════════════════════════════════════════════════════════════════════════

const POWER_STACKS = {
  urgency: {
    id: 'A',
    name: 'THE URGENCY STACK',
    biases: ['scarcity', 'loss_aversion', 'regret_aversion'],
    description: 'Creates immediate action through fear of missing out',
    visual_strategy: 'Combine countdown elements with "last chance" imagery. Show what they\'ll lose if they wait. Future regret visualization.'
  },
  trust: {
    id: 'B',
    name: 'THE TRUST STACK',
    biases: ['social_proof', 'authority', 'pratfall_effect'],
    description: 'Builds credibility through multiple trust signals',
    visual_strategy: 'Expert endorsement + crowd validation + honest admission of limitation. Layered credibility markers.'
  },
  desire: {
    id: 'C',
    name: 'THE DESIRE STACK',
    biases: ['curiosity_gap', 'goal_gradient', 'endowment_effect'],
    description: 'Creates pull through curiosity and ownership',
    visual_strategy: 'Partially revealed reward + progress toward goal + "already yours" framing. Building anticipation.'
  },
  comparison: {
    id: 'D',
    name: 'THE COMPARISON STACK',
    biases: ['anchoring', 'contrast_effect', 'decoy_effect'],
    description: 'Makes the choice obvious through strategic comparison',
    visual_strategy: 'High anchor price + dramatic before/after + inferior option to avoid. Clear best choice.'
  },
  identity: {
    id: 'E',
    name: 'THE IDENTITY STACK',
    biases: ['in_group', 'bandwagon', 'commitment_consistency'],
    description: 'Leverages tribe identity and social momentum',
    visual_strategy: 'People like you + growing movement + small commitment leading to larger. Tribal belonging.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AWARENESS LEVELS (Eugene Schwartz)
// ═══════════════════════════════════════════════════════════════════════════════

const AWARENESS_LEVELS = {
  unaware: {
    id: 1,
    name: 'UNAWARE',
    description: 'They don\'t know they have a problem yet',
    visual_strategy: 'Pattern interrupt, curiosity, intrigue. Unexpected visuals that stop the scroll. Don\'t sell - capture attention.',
    prompt_approach: 'Create visually striking, curiosity-inducing images that make them stop and think. No product focus. Pure intrigue.'
  },
  problem_aware: {
    id: 2,
    name: 'PROBLEM AWARE',
    description: 'They know the problem, not the solution',
    visual_strategy: 'Pain visualization, agitation, empathy. Show the problem they\'re experiencing. Mirror their frustration.',
    prompt_approach: 'Dramatize the pain point. Show someone experiencing the exact problem. Create emotional resonance and "that\'s me" recognition.'
  },
  solution_aware: {
    id: 3,
    name: 'SOLUTION AWARE',
    description: 'They know solutions exist, not yours specifically',
    visual_strategy: 'Differentiation, unique mechanism, "why us". Show what makes your solution different.',
    prompt_approach: 'Highlight the unique mechanism or approach. Show why this solution is different/better than alternatives they\'ve tried.'
  },
  product_aware: {
    id: 4,
    name: 'PRODUCT AWARE',
    description: 'They know your product, not yet convinced',
    visual_strategy: 'Social proof, objection handling, credibility. Remove final doubts. Show others who\'ve succeeded.',
    prompt_approach: 'Stack social proof. Show transformation results. Address common objections visually. Build final conviction.'
  },
  most_aware: {
    id: 5,
    name: 'MOST AWARE',
    description: 'Ready to buy, need final push',
    visual_strategy: 'Urgency, offer, direct CTA. They\'re ready - show the deal and push for action.',
    prompt_approach: 'Direct offer visualization. Urgency elements. Clear CTA. Final push to convert. Deal/bonus emphasis.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 50 AD STYLE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

const AD_STYLES = {
  // CORE VISUAL STYLES (1-10)
  professional_studio: {
    id: 1,
    name: 'Professional Studio',
    category: 'core_visual',
    description: 'High-end, controlled, premium',
    prompt_keywords: 'professional studio lighting, seamless background, high-end product photography, controlled environment, premium aesthetic, perfect lighting'
  },
  lifestyle_environmental: {
    id: 2,
    name: 'Lifestyle/Environmental',
    category: 'core_visual',
    description: 'Aspirational, real-world context',
    prompt_keywords: 'lifestyle photography, natural environment, aspirational setting, real-world context, environmental portrait, authentic moment'
  },
  ugc_raw: {
    id: 3,
    name: 'UGC-Style/Raw',
    category: 'core_visual',
    description: 'Authentic, phone-captured aesthetic',
    prompt_keywords: 'UGC style, smartphone quality, authentic, raw, unpolished, real person, casual setting, not overly produced'
  },
  flatlay: {
    id: 4,
    name: 'Flatlay',
    category: 'core_visual',
    description: 'Top-down organized arrangements',
    prompt_keywords: 'flatlay photography, top-down view, organized arrangement, aesthetic layout, overhead shot, styled arrangement'
  },
  minimalist: {
    id: 5,
    name: 'Minimalist/Negative Space',
    category: 'core_visual',
    description: 'Apple-style, one focal point',
    prompt_keywords: 'minimalist, negative space, clean composition, single focal point, Apple-style aesthetic, white space, simple'
  },
  maximalist: {
    id: 6,
    name: 'Maximalist/Dense',
    category: 'core_visual',
    description: 'Busy, energetic, info-rich',
    prompt_keywords: 'maximalist, dense composition, busy, energetic, information-rich, vibrant, dynamic, layered elements'
  },
  dark_mode: {
    id: 7,
    name: 'Dark Mode Optimized',
    category: 'core_visual',
    description: 'High contrast for dark UI',
    prompt_keywords: 'dark background, high contrast, dark mode aesthetic, neon accents, moody lighting, dark theme optimized'
  },
  editorial_magazine: {
    id: 8,
    name: 'Editorial/Magazine',
    category: 'core_visual',
    description: 'Press coverage aesthetic',
    prompt_keywords: 'editorial style, magazine quality, press photography, high fashion aesthetic, Vogue-style, sophisticated'
  },
  three_d_render: {
    id: 9,
    name: '3D Render/CGI',
    category: 'core_visual',
    description: 'Hyper-realistic, perfect angles',
    prompt_keywords: '3D render, CGI, hyper-realistic, perfect product visualization, octane render, cinema 4D style'
  },
  hand_drawn: {
    id: 10,
    name: 'Hand-Drawn/Illustrated',
    category: 'core_visual',
    description: 'Non-photographic, approachable',
    prompt_keywords: 'hand-drawn illustration, sketch style, illustrated, artistic, non-photographic, approachable design'
  },

  // SUBJECT/PRODUCT FOCUS (11-16)
  product_in_use: {
    id: 11,
    name: 'Product-in-Use/Demo',
    category: 'subject_focus',
    description: 'Hands actively using product',
    prompt_keywords: 'product demonstration, hands using product, in-use shot, action shot, demonstrating features'
  },
  founder_forward: {
    id: 12,
    name: 'Founder/Face-Forward',
    category: 'subject_focus',
    description: 'Personal brand, human connection',
    prompt_keywords: 'founder portrait, face-forward, personal brand, human connection, entrepreneur photo, direct eye contact'
  },
  ingredient_breakdown: {
    id: 13,
    name: 'Ingredient Breakdown',
    category: 'subject_focus',
    description: 'Deconstructed, transparency',
    prompt_keywords: 'ingredient visualization, deconstructed product, transparency, raw materials, component showcase'
  },
  behind_scenes: {
    id: 14,
    name: 'Behind-the-Scenes',
    category: 'subject_focus',
    description: 'Manufacturing, process, workspace',
    prompt_keywords: 'behind the scenes, manufacturing, process shot, workspace, making-of, authenticity'
  },
  packaging_hero: {
    id: 15,
    name: 'Packaging Hero',
    category: 'subject_focus',
    description: 'Premium packaging as star',
    prompt_keywords: 'packaging hero shot, premium packaging, box presentation, unboxing ready, luxury packaging'
  },
  unboxing_reveal: {
    id: 16,
    name: 'Unboxing/Reveal',
    category: 'subject_focus',
    description: 'First-look anticipation',
    prompt_keywords: 'unboxing moment, reveal shot, first-look, anticipation, opening experience, surprise element'
  },

  // FORMAT/LAYOUT (17-20)
  text_only: {
    id: 17,
    name: 'Text-Only/Typography',
    category: 'format_layout',
    description: 'Pure text, no photos (trending)',
    prompt_keywords: 'typography focused, text-based design, bold typography, no photography, type-driven, statement text'
  },
  screenshot_interface: {
    id: 18,
    name: 'Screenshot/Interface',
    category: 'format_layout',
    description: 'Fake texts, DMs, notifications',
    prompt_keywords: 'screenshot style, fake text messages, notification design, interface mockup, social media DM style'
  },
  meme_native: {
    id: 19,
    name: 'Meme/Native Content',
    category: 'format_layout',
    description: 'Looks like friend\'s post',
    prompt_keywords: 'meme format, native content, organic social post style, friend\'s post aesthetic, viral meme format'
  },
  split_screen: {
    id: 20,
    name: 'Split Screen/Comparison',
    category: 'format_layout',
    description: 'Side-by-side, duet style',
    prompt_keywords: 'split screen, side-by-side comparison, duet style, two panels, before and after split'
  },

  // PSYCHOLOGICAL/STRATEGIC (21-25)
  before_after: {
    id: 21,
    name: 'Before/After Transformation',
    category: 'psychological',
    description: 'Visual proof',
    prompt_keywords: 'before and after, transformation, visual proof, dramatic change, results comparison'
  },
  social_proof_stack: {
    id: 22,
    name: 'Social Proof Stack',
    category: 'psychological',
    description: 'Testimonials, ratings, results',
    prompt_keywords: 'testimonial visuals, star ratings, user reviews, social proof, customer results, trust indicators'
  },
  problem_visualization: {
    id: 23,
    name: 'Problem Visualization',
    category: 'psychological',
    description: 'Dramatize the pain',
    prompt_keywords: 'problem dramatization, pain point visualization, frustration captured, struggle imagery, relatable problem'
  },
  curiosity_gap_visual: {
    id: 24,
    name: 'Curiosity Gap Visual',
    category: 'psychological',
    description: 'Censored, blurred, incomplete',
    prompt_keywords: 'curiosity gap, partially hidden, blurred reveal, censored element, incomplete image, mystery'
  },
  urgency_scarcity_visual: {
    id: 25,
    name: 'Urgency/Scarcity Visual',
    category: 'psychological',
    description: 'Timers, low stock, "last chance"',
    prompt_keywords: 'urgency indicators, countdown timer, low stock visual, last chance, limited availability, selling out'
  },

  // CREATIVE/OUTSIDE THE BOX (26-50)
  lego_brick: {
    id: 26,
    name: 'LEGO/Brick Style',
    category: 'creative',
    description: 'Built from blocks',
    prompt_keywords: 'LEGO style, brick-built, plastic blocks, toy aesthetic, LEGO recreation'
  },
  claymation: {
    id: 27,
    name: 'Claymation/Stop-Motion',
    category: 'creative',
    description: 'Sculpted clay aesthetic',
    prompt_keywords: 'claymation style, stop-motion aesthetic, sculpted clay, Aardman style, Wallace and Gromit look'
  },
  wobble_jelly: {
    id: 28,
    name: 'Wobble/Jelly Physics',
    category: 'creative',
    description: 'Bouncy, playful movement feel',
    prompt_keywords: 'jelly physics, wobbly, bouncy, playful, squishy texture, elastic movement'
  },
  kids_crayon: {
    id: 29,
    name: 'Kids Crayon Drawing',
    category: 'creative',
    description: 'Childlike, innocent, nostalgic',
    prompt_keywords: 'crayon drawing, child art style, innocent, nostalgic, kindergarten aesthetic, kid drawing'
  },
  whiteboard: {
    id: 30,
    name: 'Whiteboard Sketch',
    category: 'creative',
    description: 'Hand-drawn explainer style',
    prompt_keywords: 'whiteboard drawing, marker sketch, explainer video style, hand-drawn diagram, dry erase board'
  },
  paper_cutout: {
    id: 31,
    name: 'Paper Cutout/Collage',
    category: 'creative',
    description: 'Craft aesthetic',
    prompt_keywords: 'paper cutout, collage art, craft aesthetic, layered paper, scrapbook style'
  },
  pixel_art: {
    id: 32,
    name: 'Pixel Art/8-Bit',
    category: 'creative',
    description: 'Retro gaming nostalgia',
    prompt_keywords: 'pixel art, 8-bit style, retro gaming, Nintendo aesthetic, pixelated, video game'
  },
  watercolor: {
    id: 33,
    name: 'Watercolor/Paint',
    category: 'creative',
    description: 'Artistic, soft, elegant',
    prompt_keywords: 'watercolor painting, soft edges, artistic, elegant, painted, flowing colors'
  },
  chalkboard: {
    id: 34,
    name: 'Chalkboard Style',
    category: 'creative',
    description: 'Educational, handwritten',
    prompt_keywords: 'chalkboard drawing, chalk style, educational, blackboard, handwritten, teacher aesthetic'
  },
  pop_art: {
    id: 35,
    name: 'Pop Art/Warhol',
    category: 'creative',
    description: 'Bold, repetitive, artistic',
    prompt_keywords: 'pop art, Andy Warhol style, bold colors, Lichtenstein, comic dots, repetitive pattern'
  },
  neon_cyberpunk: {
    id: 36,
    name: 'Neon/Cyberpunk',
    category: 'creative',
    description: 'Glowing, futuristic, edgy',
    prompt_keywords: 'neon glow, cyberpunk, futuristic, synthwave, glowing lights, Blade Runner aesthetic'
  },
  vintage_poster: {
    id: 37,
    name: 'Vintage Poster/Propaganda',
    category: 'creative',
    description: 'Retro, bold messaging',
    prompt_keywords: 'vintage poster, propaganda style, retro, bold messaging, WPA poster, Soviet constructivism'
  },
  blueprint: {
    id: 38,
    name: 'Blueprint/Technical Drawing',
    category: 'creative',
    description: 'Precise, engineering feel',
    prompt_keywords: 'blueprint style, technical drawing, engineering aesthetic, schematic, architectural drawing'
  },
  embroidery: {
    id: 39,
    name: 'Embroidery/Cross-Stitch',
    category: 'creative',
    description: 'Handcrafted, detailed',
    prompt_keywords: 'embroidery style, cross-stitch, needlework, handcrafted, textile art, stitched'
  },
  balloon_inflatable: {
    id: 40,
    name: 'Balloon/Inflatable Style',
    category: 'creative',
    description: 'Puffy, fun, tactile',
    prompt_keywords: 'inflatable, balloon-like, puffy, 3D balloon letters, bouncy castle aesthetic'
  },
  ice_sculpture: {
    id: 41,
    name: 'Ice Sculpture',
    category: 'creative',
    description: 'Crystalline, premium, cold',
    prompt_keywords: 'ice sculpture, crystalline, frozen, premium ice aesthetic, carved ice, translucent'
  },
  food_art: {
    id: 42,
    name: 'Food Art',
    category: 'creative',
    description: 'Made entirely of food items',
    prompt_keywords: 'food art, made of food, edible art, food sculpture, culinary creation'
  },
  miniature: {
    id: 43,
    name: 'Miniature/Tilt-Shift',
    category: 'creative',
    description: 'Tiny world, whimsical',
    prompt_keywords: 'miniature world, tilt-shift, tiny, diorama, small scale, dollhouse perspective'
  },
  xray: {
    id: 44,
    name: 'X-Ray/See-Through',
    category: 'creative',
    description: 'Internal view, transparency',
    prompt_keywords: 'x-ray view, see-through, transparent, internal anatomy, medical imaging style'
  },
  holographic: {
    id: 45,
    name: 'Holographic/Iridescent',
    category: 'creative',
    description: 'Shimmering, futuristic',
    prompt_keywords: 'holographic, iridescent, rainbow shimmer, futuristic, chrome, prismatic'
  },
  origami: {
    id: 46,
    name: 'Origami/Paper Fold',
    category: 'creative',
    description: 'Geometric, crafted',
    prompt_keywords: 'origami style, paper fold, geometric, Japanese paper art, folded paper'
  },
  stained_glass: {
    id: 47,
    name: 'Stained Glass',
    category: 'creative',
    description: 'Colorful, artistic, classic',
    prompt_keywords: 'stained glass, colorful glass, church window style, lead lines, translucent color'
  },
  mosaic: {
    id: 48,
    name: 'Mosaic/Tile',
    category: 'creative',
    description: 'Pieced together, artistic',
    prompt_keywords: 'mosaic, tile art, pieced together, Byzantine style, tessellation'
  },
  sand_sculpture: {
    id: 49,
    name: 'Sand Sculpture',
    category: 'creative',
    description: 'Temporary, impressive, beach',
    prompt_keywords: 'sand sculpture, beach art, carved sand, impressive sandcastle, temporary art'
  },
  cloud_smoke: {
    id: 50,
    name: 'Cloud/Smoke Formation',
    category: 'creative',
    description: 'Ethereal, dreamlike',
    prompt_keywords: 'cloud formation, smoke art, ethereal, dreamlike, vapor, atmospheric'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET request returns available options
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      cognitive_biases: Object.entries(COGNITIVE_BIASES).map(([key, bias]) => ({
        key,
        ...bias
      })),
      power_stacks: Object.entries(POWER_STACKS).map(([key, stack]) => ({
        key,
        ...stack
      })),
      awareness_levels: Object.entries(AWARENESS_LEVELS).map(([key, level]) => ({
        key,
        ...level
      })),
      ad_styles: Object.entries(AD_STYLES).map(([key, style]) => ({
        key,
        ...style
      }))
    });
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
      ad_copy_id,

      // Persona selection (if available)
      persona,

      // Awareness level (1-5 or key name)
      awareness_level = 'problem_aware',

      // Cognitive biases (array of keys or numbers, or power stack key)
      biases = ['social_proof', 'curiosity_gap'],
      power_stack, // If provided, overrides biases

      // Ad styles (array of keys or numbers, 1-5 styles)
      styles = ['ugc_raw', 'before_after'],

      // Image specifications
      aspect_ratio = '4:5', // Best for Meta feed

      // Additional context
      product_description,
      target_audience,
      custom_concept, // For Path B custom ad concepts
      include_text_overlay = false,
      text_overlay_content,

      // Generation options
      num_prompts = 5,
      quick_generate = false // Path C
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        error: 'client_id is required'
      });
    }

    // Get client data with brand guide using unified database
    const client = await db.getClientById(client_id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const businessResearch = client.business_research || {};

    // Get associated ad copy if provided
    let adCopy = null;
    if (ad_copy_id) {
      try {
        const adCopyResult = await query(
          'SELECT * FROM ad_copy WHERE id = $1',
          [ad_copy_id]
        );
        if (adCopyResult.rows.length > 0) {
          adCopy = adCopyResult.rows[0];
        }
      } catch (e) {
        console.warn('Could not fetch ad copy:', e.message);
      }
    }

    // Resolve biases (handle power stack or individual biases)
    let resolvedBiases = [];
    if (power_stack && POWER_STACKS[power_stack]) {
      resolvedBiases = POWER_STACKS[power_stack].biases.map(b => COGNITIVE_BIASES[b]);
    } else if (Array.isArray(biases)) {
      resolvedBiases = biases.map(b => {
        if (typeof b === 'number') {
          return Object.values(COGNITIVE_BIASES).find(bias => bias.id === b);
        }
        return COGNITIVE_BIASES[b];
      }).filter(Boolean);
    }

    // Resolve awareness level
    let resolvedAwareness;
    if (typeof awareness_level === 'number') {
      resolvedAwareness = Object.values(AWARENESS_LEVELS).find(a => a.id === awareness_level);
    } else {
      resolvedAwareness = AWARENESS_LEVELS[awareness_level];
    }
    resolvedAwareness = resolvedAwareness || AWARENESS_LEVELS.problem_aware;

    // Resolve ad styles
    let resolvedStyles = [];
    if (Array.isArray(styles)) {
      resolvedStyles = styles.map(s => {
        if (typeof s === 'number') {
          return Object.values(AD_STYLES).find(style => style.id === s);
        }
        return AD_STYLES[s];
      }).filter(Boolean);
    }

    // Build brand injection string
    const brandInjectionString = buildBrandInjectionString(client);

    // Build the mega prompt
    const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!claudeApiKey) {
      return res.status(500).json({
        success: false,
        error: 'ANTHROPIC_API_KEY not configured'
      });
    }

    const prompt = buildMegaPrompt({
      client,
      businessResearch,
      adCopy,
      persona,
      awareness: resolvedAwareness,
      biases: resolvedBiases,
      powerStack: power_stack ? POWER_STACKS[power_stack] : null,
      styles: resolvedStyles,
      aspectRatio: aspect_ratio,
      productDescription: product_description,
      targetAudience: target_audience,
      customConcept: custom_concept,
      includeTextOverlay: include_text_overlay,
      textOverlayContent: text_overlay_content,
      numPrompts: num_prompts,
      brandInjectionString,
      quickGenerate: quick_generate
    });

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || '';

    // Parse the JSON response
    let generatedPrompts;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      generatedPrompts = jsonMatch ? JSON.parse(jsonMatch[0]) : { prompts: [] };
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      generatedPrompts = { raw_response: responseText };
    }

    // Store generated prompts in database
    const savedPrompts = [];

    if (generatedPrompts.prompts) {
      for (const promptData of generatedPrompts.prompts) {
        const promptId = uuidv4();
        try {
          await db.saveImagePrompt({
            id: promptId,
            campaign_id: campaign_id || null,
            client_id,
            user_id: user.userId,
            ad_copy_id: ad_copy_id || null,
            prompt_text: promptData.prompt || '',
            negative_prompt: promptData.negative_prompt || '',
            style_reference: promptData.style_category || '',
            aspect_ratio,
            image_type: promptData.ad_style || 'custom',
            model_target: 'nano_banana_2',
            generation_context: {
              awareness_level: resolvedAwareness?.name,
              biases_applied: resolvedBiases.map(b => b?.name),
              power_stack: power_stack,
              styles_used: resolvedStyles.map(s => s?.name),
              persona: persona,
              strategic_notes: promptData.strategic_notes
            }
          });
          savedPrompts.push({
            id: promptId,
            ...promptData
          });
        } catch (saveError) {
          console.error('Error saving image prompt:', saveError);
          // Continue with remaining prompts even if one fails
          savedPrompts.push({
            id: promptId,
            ...promptData
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      prompts: savedPrompts.length > 0 ? savedPrompts : generatedPrompts.prompts || [],
      creative_direction: generatedPrompts.creative_direction || null,
      selections_used: {
        awareness_level: resolvedAwareness,
        biases: resolvedBiases,
        power_stack: power_stack ? POWER_STACKS[power_stack] : null,
        styles: resolvedStyles
      },
      brand_injection_string: brandInjectionString,
      tokens_used: (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0)
    });

  } catch (error) {
    console.error('Image prompt generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function buildBrandInjectionString(client) {
  const colors = [];
  if (client.primary_color) colors.push(`primary brand color ${client.primary_color}`);
  if (client.secondary_color) colors.push(`secondary color ${client.secondary_color}`);
  if (client.accent_color) colors.push(`accent color ${client.accent_color}`);

  const fonts = [];
  if (client.heading_font) fonts.push(`heading font: ${client.heading_font}`);
  if (client.body_font) fonts.push(`body font: ${client.body_font}`);

  const voice = client.brand_voice || 'professional';
  const keywords = client.tone_keywords || [];

  return `BRAND CONSISTENCY REQUIREMENTS: Use ${colors.join(', ') || 'brand-appropriate colors'}. Typography: ${fonts.join(', ') || 'clean, modern fonts'}. Brand voice: ${voice}. Brand personality: ${keywords.length > 0 ? keywords.join(', ') : 'trustworthy, professional'}. Maintain visual consistency with the brand's established aesthetic.`;
}

function buildMegaPrompt({
  client,
  businessResearch,
  adCopy,
  persona,
  awareness,
  biases,
  powerStack,
  styles,
  aspectRatio,
  productDescription,
  targetAudience,
  customConcept,
  includeTextOverlay,
  textOverlayContent,
  numPrompts,
  brandInjectionString,
  quickGenerate
}) {
  const aspectRatioMap = {
    '1:1': '1080x1080 square',
    '4:5': '1080x1350 vertical (best for Meta feed)',
    '9:16': '1080x1920 stories/reels vertical',
    '16:9': '1920x1080 landscape',
    '1.91:1': '1200x628 link preview'
  };

  return `You are an elite Meta ads creative director with expertise in cognitive psychology, visual persuasion, and AI image generation. Generate ${numPrompts} advanced Nano Banana 2 image prompts that will stop the scroll and drive conversions.

═══════════════════════════════════════════════════════════════════════════════
BRAND CONTEXT
═══════════════════════════════════════════════════════════════════════════════

Company: ${businessResearch.company_name || client.name}
Industry: ${client.industry || businessResearch.industry || 'Unknown'}
Products: ${JSON.stringify(businessResearch.products?.slice(0, 2) || [])}
Value Propositions: ${JSON.stringify(businessResearch.value_propositions || [])}
${productDescription ? `Product Details: ${productDescription}` : ''}

${brandInjectionString}

═══════════════════════════════════════════════════════════════════════════════
TARGET AUDIENCE
═══════════════════════════════════════════════════════════════════════════════

${persona ? `
SELECTED PERSONA:
${JSON.stringify(persona, null, 2)}
` : ''}
${targetAudience ? `Target Description: ${targetAudience}` : ''}
${businessResearch.target_audiences ? `Research-Based Audiences: ${JSON.stringify(businessResearch.target_audiences[0] || {})}` : ''}

═══════════════════════════════════════════════════════════════════════════════
AWARENESS LEVEL: ${awareness.name}
═══════════════════════════════════════════════════════════════════════════════

${awareness.description}

Visual Strategy: ${awareness.visual_strategy}
Prompt Approach: ${awareness.prompt_approach}

═══════════════════════════════════════════════════════════════════════════════
COGNITIVE BIASES TO APPLY
═══════════════════════════════════════════════════════════════════════════════

${powerStack ? `
POWER STACK: ${powerStack.name}
${powerStack.description}
Visual Strategy: ${powerStack.visual_strategy}

Biases in stack:
` : 'Individual Biases Selected:\n'}

${biases.map((bias, i) => `
${i + 1}. ${bias.name}
   Description: ${bias.description}
   Visual Implementation: ${bias.visual_implementation}
`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
AD STYLES TO USE
═══════════════════════════════════════════════════════════════════════════════

${styles.map((style, i) => `
${i + 1}. ${style.name} (${style.category})
   ${style.description}
   Prompt Keywords: ${style.prompt_keywords}
`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
IMAGE SPECIFICATIONS
═══════════════════════════════════════════════════════════════════════════════

Aspect Ratio: ${aspectRatio} - ${aspectRatioMap[aspectRatio] || aspectRatio}
${includeTextOverlay ? `Text Overlay: Include space for text: "${textOverlayContent || 'See ad copy'}"` : 'Text Overlay: None required'}

${customConcept ? `
═══════════════════════════════════════════════════════════════════════════════
CUSTOM CONCEPT (User Request)
═══════════════════════════════════════════════════════════════════════════════

${customConcept}

Interpret this concept and apply the selected biases, awareness level, and styles.
` : ''}

${adCopy ? `
═══════════════════════════════════════════════════════════════════════════════
ASSOCIATED AD COPY (Image should complement)
═══════════════════════════════════════════════════════════════════════════════

Primary Text: ${adCopy.primary_text}
Headline: ${adCopy.headline}
Hook Angle: ${adCopy.hook_angle}
` : ''}

═══════════════════════════════════════════════════════════════════════════════
GENERATION INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Generate ${numPrompts} unique, production-ready Nano Banana 2 prompts. Each prompt must:

1. Open with aspect ratio specification
2. Include detailed subject description matching target persona demographics
3. Describe specific environment, props, and lighting
4. Explicitly implement the cognitive biases visually
5. Apply the selected ad style keywords and approach
6. Include the brand injection string
7. End with mood and strategic goal

EACH PROMPT TESTS SOMETHING DIFFERENT - vary elements across prompts.

Return ONLY valid JSON in this format:
{
  "prompts": [
    {
      "prompt": "Create a ${aspectRatio} vertical image showing [detailed subject matching persona demographics]. The subject is [action implementing bias visually] in [specific environment]. [Cognitive bias visual implementation]. Composition: [camera angle, focal point, rule of thirds]. Lighting: [specific lighting matching brand]. ${brandInjectionString} Style: [selected style with execution details]. The image should feel [brand personality] while achieving [strategic goal: scroll-stop, curiosity, trust, urgency].",
      "negative_prompt": "Things to avoid: [specific exclusions for this style and brand]",
      "ad_style": "[style name used]",
      "strategic_notes": {
        "persona_target": "[which persona this targets]",
        "awareness_level": "${awareness.name}",
        "biases_applied": ["list of biases and how they manifest"],
        "testing_hypothesis": "[what this prompt tests]",
        "expected_performance": "[why this should work]"
      },
      "text_overlay": {
        "headline": "[if applicable]",
        "subhead": "[if applicable]",
        "cta": "[if applicable]"
      }
    }
  ],
  "creative_direction": "Overall strategic approach for this batch of prompts and recommended testing sequence"
}`;
}
