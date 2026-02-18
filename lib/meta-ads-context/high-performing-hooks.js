// RunAds - High-Performing Hook Frameworks
// 10 proven hook frameworks with pattern templates and tone modifiers
// Based on analysis of top-performing Meta ads across industries

export const HOOK_FRAMEWORKS = {
  'problem-agitate-solution': {
    name: 'Problem-Agitate-Solution',
    description: 'Name pain → Amplify emotional cost → Present solution',
    whenToUse: 'Problem-aware audiences. When the pain point is strong and relatable.',
    patterns: [
      'Tired of [specific pain]? You\'re not alone — [statistic]. Here\'s what [solution type] users discovered.',
      '[Pain point] is costing you more than you think. Every [time period], you\'re losing [specific loss]. But what if there was a way to [desired outcome]?',
      'If [pain point] keeps you up at night, read this. [Number] [target audience] found a way to [outcome] without [common objection].',
      'You\'ve tried [failed solution 1], [failed solution 2], and even [failed solution 3]. Nothing worked. Until now.',
      'The real reason [pain point] won\'t go away isn\'t what you think. (It\'s not [common misconception].)'
    ],
    toneModifiers: {
      conversational: 'Use "you" language, contractions, rhetorical questions',
      urgent: 'Add time pressure, emphasize cost of waiting',
      professional: 'Use data-driven language, cite sources',
      playful: 'Use unexpected analogies, humor to describe the pain',
      authoritative: 'Lead with credentials, expert framing'
    }
  },

  'curiosity-gap': {
    name: 'Curiosity Gap',
    description: 'Tease outcome without revealing method → Create information gap',
    whenToUse: 'Unaware and problem-aware audiences. When you have a surprising angle.',
    patterns: [
      'This [unusual thing] is why [number] [target audience] are [unexpected action]. (It\'s not what you\'d expect.)',
      'A [professional title] revealed the one thing [target audience] should never [common action]. The reason will surprise you.',
      'I spent [time period] studying [topic] and found something nobody talks about. Here\'s what I discovered.',
      'The #1 [category] in [country/industry] does something completely different from everyone else. Want to know what?',
      'Why do [successful group] all [unexpected habit]? The answer changed everything I thought I knew about [topic].'
    ],
    toneModifiers: {
      conversational: 'Use insider language, "let me tell you a secret"',
      urgent: 'Frame the gap as time-sensitive information',
      professional: 'Use research framing, "new study reveals"',
      playful: 'Use "plot twist" energy, playful teasing',
      authoritative: 'Use "after X years of research" framing'
    }
  },

  'contrarian': {
    name: 'Contrarian',
    description: 'Challenge conventional wisdom → Reveal counterintuitive truth',
    whenToUse: 'Solution-aware audiences who\'ve heard it all. Market sophistication 3+.',
    patterns: [
      'Stop [common advice]. It\'s actually making your [problem] worse. Here\'s what to do instead.',
      'Everything you\'ve been told about [topic] is wrong. [Unexpected truth].',
      '[Number]% of [target audience] make this mistake every day. The [industry] doesn\'t want you to know.',
      'Your [expert/advisor] won\'t tell you this about [topic]. But the data is clear.',
      'I used to believe [common belief] too. Then I saw the data. [Shocking finding].'
    ],
    toneModifiers: {
      conversational: 'Use "truth bomb" energy, relatable disbelief',
      urgent: 'Frame as urgent correction, "stop doing this NOW"',
      professional: 'Use evidence-based framing, cite counter-research',
      playful: 'Use "wait, what?" surprise energy',
      authoritative: 'Use "after treating X patients/clients" authority'
    }
  },

  'social-proof': {
    name: 'Social Proof Lead',
    description: 'Lead with crowd behavior/numbers → Create FOMO through exclusivity',
    whenToUse: 'Product-aware and most-aware audiences. When you have strong proof.',
    patterns: [
      '[Number] [target audience] have already [action]. Here\'s why they\'re not looking back.',
      '"[Short testimonial quote]" — [Author], [Role]. Join [number]+ who\'ve experienced [result].',
      'Rated [rating] by [number] [target audience]. See why [product] is the #1 choice for [use case].',
      'Last [time period], [number] people switched to [product]. The reviews speak for themselves.',
      'Featured in [publication 1], [publication 2], and trusted by [notable client]. Now available to everyone.'
    ],
    toneModifiers: {
      conversational: 'Use relatable peer language, "people just like you"',
      urgent: 'Add "limited spots" or "selling fast" urgency',
      professional: 'Cite industry recognition, enterprise adoption',
      playful: 'Use "everyone\'s talking about" viral energy',
      authoritative: 'Lead with institutional endorsements'
    }
  },

  'direct-benefit': {
    name: 'Direct Benefit',
    description: 'State value proposition clearly with specific numbers',
    whenToUse: 'Most-aware audiences. When the benefit is strong and provable.',
    patterns: [
      'Get [specific benefit] in [timeframe]. No [common objection]. Guaranteed.',
      '[Benefit 1] + [Benefit 2] + [Benefit 3]. All in one [product type] for [price/free].',
      'Save [amount] on [category] every [time period]. [Number] [target audience] already do.',
      'From [starting point] to [desired outcome] in [timeframe]. Here\'s exactly how.',
      '[Product] gives you [primary benefit] without [sacrifice]. Try it free for [period].'
    ],
    toneModifiers: {
      conversational: 'Use casual benefit stacking, "oh, and also..."',
      urgent: 'Time-limit the benefit, "only available until [date]"',
      professional: 'Use ROI language, measurable outcomes',
      playful: 'Use "yes, really" emphasis on surprising benefits',
      authoritative: 'Use "clinically proven" or "scientifically formulated"'
    }
  },

  'story-hook': {
    name: 'Story Hook',
    description: 'Open with compelling micro-narrative → Transition to offer',
    whenToUse: 'All awareness levels. Stories bypass resistance filters.',
    patterns: [
      'Last [time period], I was [relatable situation]. Then [unexpected event] changed everything.',
      '[Name] was [struggle]. [Number] [time periods] later, [amazing result]. Here\'s [possessive] story.',
      'I almost didn\'t share this. But after [event], I realized [target audience] deserve to know.',
      'It started with a simple question: "[relatable question]?" The answer led me to [discovery].',
      'My [family member/friend] called me crying about [problem]. That\'s when I knew I had to [action].'
    ],
    toneModifiers: {
      conversational: 'First-person, raw and real, "let me be honest"',
      urgent: 'Time-pressure the story, "this window is closing"',
      professional: 'Case study format, "Client X came to us with..."',
      playful: 'Use humor and self-deprecation in the narrative',
      authoritative: 'Use founder/expert origin story'
    }
  },

  'question-hook': {
    name: 'Question Hook',
    description: 'Ask provocative question → Guide toward your answer',
    whenToUse: 'Problem-aware and solution-aware audiences. Great for engagement.',
    patterns: [
      'What if [desired outcome] was easier than you think? (Hint: it has nothing to do with [common approach].)',
      'Can you honestly say your [area] is where you want it to be? If not, keep reading.',
      'What would change in your life if [specific problem] disappeared tomorrow?',
      'Be honest: when was the last time [desired experience]? If you can\'t remember, this is for you.',
      'Why do [successful group] always [positive trait] while the rest of us [relatable struggle]?'
    ],
    toneModifiers: {
      conversational: 'Use personal, reflective questions',
      urgent: 'Use "how much longer" pressure questions',
      professional: 'Use industry-diagnostic questions',
      playful: 'Use "pop quiz" or "be honest" framing',
      authoritative: 'Use "the question every expert asks" framing'
    }
  },

  'statistic-lead': {
    name: 'Statistic Lead',
    description: 'Open with surprising data point → Position solution',
    whenToUse: 'Solution-aware audiences. When you have compelling data.',
    patterns: [
      '[Surprising statistic]. That means [personal implication for reader]. Here\'s what you can do about it.',
      'New [study/data] shows: [finding]. [Number]% of [target audience] are already [action]. Are you?',
      'The average [target audience] spends [amount] on [category] and gets [poor result]. There\'s a better way.',
      '[Number] out of [number] [target audience] report [problem]. The solution isn\'t what you\'d think.',
      'According to [source], [statistic]. This is why [product/approach] was created.'
    ],
    toneModifiers: {
      conversational: 'Use "wild, right?" reaction to stats',
      urgent: 'Frame stats as worsening trend',
      professional: 'Cite peer-reviewed sources, use precise numbers',
      playful: 'Use "hold up" or "wait for it" stat reveals',
      authoritative: 'Use "our research shows" or "in our study of X"'
    }
  },

  'before-after': {
    name: 'Before/After',
    description: 'Paint vivid contrast between current pain and desired outcome',
    whenToUse: 'Problem-aware and product-aware audiences. Visual transformation.',
    patterns: [
      'Before: [vivid pain description]. After: [vivid outcome]. The difference? [Product/method].',
      '[Time period] ago, I was [pain state]. Today, I [achievement]. Here\'s the turning point.',
      'Picture this: [desired morning routine/life scene]. Now compare it to [current reality]. Ready to bridge the gap?',
      'Day 1: [starting state]. Day [number]: [transformed state]. No [sacrifice]. No [common objection].',
      'Without [product]: [pain scenario]. With [product]: [bliss scenario]. The choice is yours.'
    ],
    toneModifiers: {
      conversational: 'Use vivid sensory language, paint the scene',
      urgent: 'Emphasize "every day you wait is another day of [pain]"',
      professional: 'Use metrics-based before/after',
      playful: 'Use dramatic contrast for humor',
      authoritative: 'Use clinical before/after documentation'
    }
  },

  'fomo': {
    name: 'FOMO',
    description: 'Create urgency through scarcity/exclusivity → Cost of inaction',
    whenToUse: 'Most-aware audiences. When you have real scarcity or deadlines.',
    patterns: [
      '[Number] [target audience] joined in the last [time period]. [Number] spots remain. Don\'t miss your chance.',
      'This [offer] expires in [timeframe]. After that, [consequence]. [Number] people have already claimed theirs.',
      'We only release [number] per [time period]. [Percentage]% of last batch sold out in [time]. Secure yours now.',
      'Everyone in your [industry/group] is talking about this. [Number]+ already in. Are you next?',
      'Price goes up [date/timeframe]. Lock in [current offer] before it\'s too late. [Number] already did.'
    ],
    toneModifiers: {
      conversational: 'Use "just so you know" casual urgency',
      urgent: 'Use countdown language, "hours remaining"',
      professional: 'Use "limited enrollment" or "cohort-based" framing',
      playful: 'Use "don\'t be that person who misses out" humor',
      authoritative: 'Use "by invitation only" exclusivity'
    }
  }
};

/**
 * Get a hook framework by key
 */
export function getHookFramework(key) {
  return HOOK_FRAMEWORKS[key] || null;
}

/**
 * Get all hook framework keys
 */
export function getHookFrameworkKeys() {
  return Object.keys(HOOK_FRAMEWORKS);
}

/**
 * Get recommended hooks for an awareness level
 */
export function getHooksForAwareness(awarenessLevel) {
  const mapping = {
    'unaware': ['curiosity-gap', 'story-hook', 'contrarian'],
    'problem_aware': ['problem-agitate-solution', 'question-hook', 'statistic-lead', 'before-after'],
    'solution_aware': ['contrarian', 'statistic-lead', 'curiosity-gap', 'direct-benefit'],
    'product_aware': ['social-proof', 'before-after', 'story-hook', 'direct-benefit'],
    'most_aware': ['direct-benefit', 'fomo', 'social-proof']
  };
  return mapping[awarenessLevel] || mapping['problem_aware'];
}

/**
 * Get a random pattern from a hook framework, optionally tone-modified
 */
export function getHookPattern(frameworkKey, tone) {
  const framework = HOOK_FRAMEWORKS[frameworkKey];
  if (!framework) return null;
  const pattern = framework.patterns[Math.floor(Math.random() * framework.patterns.length)];
  const modifier = tone && framework.toneModifiers[tone] ? framework.toneModifiers[tone] : null;
  return { pattern, modifier, framework: frameworkKey };
}
