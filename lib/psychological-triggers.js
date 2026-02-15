// RunAds - Psychological Triggers Knowledge Base
// 73 science-backed triggers with copy templates, organized by category
// Based on analysis of Unicorn Marketers' playbook structure

const TRIGGER_CATEGORIES = {
  'fear-loss': { name: 'Fear & Loss Aversion', range: '1-15', description: 'Triggers that activate the brain\'s threat detection and loss aversion systems' },
  'curiosity': { name: 'Curiosity & Cognitive Gaps', range: '16-28', description: 'Triggers that create information gaps the reader must close' },
  'social-proof': { name: 'Social Proof & Authority', range: '29-43', description: 'Triggers that leverage social validation and expert credibility' },
  'identity': { name: 'Identity & Belonging', range: '44-55', description: 'Triggers that connect with self-identity, aspirations, and group belonging' },
  'reward': { name: 'Reward & Incentive', range: '56-63', description: 'Triggers that activate the brain\'s reward and motivation systems' },
  'simplicity': { name: 'Simplicity & Clarity', range: '64-73', description: 'Triggers that reduce cognitive load and make action effortless' },
};

const TRIGGERS = [
  // ============ FEAR & LOSS AVERSION (1-15) ============
  {
    id: 1, name: 'FOMO (Fear of Missing Out)', category: 'fear-loss',
    psychology: 'FOMO activates the amygdala, the brain\'s threat detection center. When people perceive others are experiencing something they are not, it triggers social comparison and urgency to act.',
    strategy: 'Show real-time activity (X people viewing now), limited availability counters, exclusive access windows, and competitor adoption rates.',
    templates: [
      'While you are reading this, [number] other [target audience] are already implementing these strategies. Every day you wait is another day your competitors pull ahead.',
      '[Number] [target audience] signed up in the last [time period] alone. They are already seeing [specific result]. The window is closing.',
      'WARNING: Your competitors are already using [solution]. Every day without it costs you [specific loss].'
    ],
    bestFor: ['advertorial', 'listicle', 'vip-signup'],
    awarenessLevels: ['solution_aware', 'product_aware', 'most_aware']
  },
  {
    id: 2, name: 'Loss Aversion', category: 'fear-loss',
    psychology: 'People feel losses roughly twice as intensely as equivalent gains. Frame what they stand to lose rather than gain.',
    strategy: 'Lead with what the reader loses by not acting. Use "stop losing" language instead of "start gaining."',
    templates: [
      'You are currently losing [amount] every [time period] by not [action]. Here is how to stop the bleeding.',
      'Every day without [solution], you are throwing away [specific amount] in [wasted resource].',
      'WARNING: [target audience] who ignore this lose an average of [amount] per [time period].'
    ],
    bestFor: ['advertorial', 'calculator', 'listicle'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 3, name: 'Scarcity (Limited Quantity)', category: 'fear-loss',
    psychology: 'When supply is limited, perceived value increases. The brain assigns more value to things that are rare or diminishing.',
    strategy: 'Show real inventory counts, limited batch numbers, exclusive membership caps, or enrollment limits.',
    templates: [
      'Only [number] spots remaining for [offer]. Once they are gone, this page comes down.',
      'We only made [number] of these. [percentage]% have already been claimed.',
      'Limited to [number] [target audience] per [time period]. Currently [number] spots left.'
    ],
    bestFor: ['vip-signup', 'advertorial', 'quiz'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 4, name: 'Urgency (Limited Time)', category: 'fear-loss',
    psychology: 'Time pressure activates fight-or-flight responses and bypasses analytical thinking, pushing decisions to System 1.',
    strategy: 'Use genuine deadlines, countdown timers, expiring bonuses, and price increase warnings.',
    templates: [
      'This special pricing expires in [time]. After that, [consequence].',
      'The [bonus/offer] disappears at midnight on [date]. No exceptions.',
      '[Time period] from now, this offer will no longer exist. The only question is whether you will act before then.'
    ],
    bestFor: ['advertorial', 'listicle', 'vip-signup'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 5, name: 'Competitive Disadvantage', category: 'fear-loss',
    psychology: 'The fear of falling behind competitors is one of the strongest motivators in business contexts.',
    strategy: 'Show what competitors are doing, industry adoption rates, and the cost of being left behind.',
    templates: [
      'Your competitors are already using [solution] to [benefit]. How long before the gap becomes impossible to close?',
      '[Percentage]% of [industry] leaders have adopted [solution]. The remaining [percentage]% are losing market share.',
      'While you are still using [old method], your competitors switched to [solution] and saw [result].'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 6, name: 'Mistake Prevention', category: 'fear-loss',
    psychology: 'People are highly motivated to avoid mistakes. Fear of doing something wrong is more powerful than desire to do something right.',
    strategy: 'Position content as mistake-prevention. Use "avoid these errors" framing.',
    templates: [
      '[Number] costly mistakes [target audience] make with [topic] (and how to avoid every one).',
      'Are you making these [number] [topic] mistakes? [Percentage]% of [target audience] are.',
      'STOP: Before you [action], read this. [Number] out of [number] [target audience] get this wrong.'
    ],
    bestFor: ['listicle', 'advertorial', 'quiz'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 7, name: 'Regret Avoidance', category: 'fear-loss',
    psychology: 'Anticipated regret is a powerful emotional driver. People work harder to avoid future regret than to achieve future pleasure.',
    strategy: 'Paint a vivid picture of future regret for not acting now. Use "imagine looking back" framing.',
    templates: [
      'Imagine looking back [time period] from now, knowing you had the chance to [benefit] and did nothing.',
      'The only people who regret [action] are the ones who waited too long to start.',
      'Do not be the person who says "I wish I had started [solution] sooner."'
    ],
    bestFor: ['advertorial', 'vip-signup'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 8, name: 'Status Threat', category: 'fear-loss',
    psychology: 'Threats to social status activate the same brain regions as physical pain. People will act quickly to protect their position.',
    strategy: 'Show how inaction threatens the reader\'s professional or social standing.',
    templates: [
      'Your [colleagues/competitors] are quietly upgrading to [solution]. When they pull ahead, will you be ready?',
      'In [industry], those still using [old method] are increasingly seen as behind the times.',
      'The gap between [target audience] who use [solution] and those who do not is growing every day.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 9, name: 'Resource Depletion', category: 'fear-loss',
    psychology: 'The fear of running out of essential resources (time, money, energy, health) triggers immediate protective action.',
    strategy: 'Quantify the ongoing drain of resources and show how the solution stops the bleed.',
    templates: [
      'Every [time period] you wait costs you [specific amount] in [wasted resource]. Stop the drain.',
      'You are hemorrhaging [resource] right now. Here is the [number]-minute fix.',
      'At the current rate, you will burn through [amount] of [resource] before [date]. Unless you act now.'
    ],
    bestFor: ['calculator', 'advertorial'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 10, name: 'Sunk Cost Fallacy', category: 'fear-loss',
    psychology: 'People continue investing in something because of previously invested resources, even when it is no longer rational.',
    strategy: 'Acknowledge past investment while showing the greater cost of continuing the current path.',
    templates: [
      'You have already invested [amount] in [current approach]. Do not let that investment go to waste by not optimizing it.',
      'You have come this far. The only thing standing between you and [result] is [solution].',
      'After everything you have put into [effort], would you really walk away without trying the one thing that could make it all worthwhile?'
    ],
    bestFor: ['advertorial', 'quiz'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 11, name: 'Protection Instinct', category: 'fear-loss',
    psychology: 'The instinct to protect oneself and loved ones from harm is one of the deepest evolutionary drives.',
    strategy: 'Frame the solution as protection against a threat rather than achievement of a benefit.',
    templates: [
      'Protect your [family/business/health] from [threat] with [solution].',
      '[Number] [target audience] have already safeguarded their [asset]. Have you?',
      'Do not leave your [asset] exposed to [risk]. [Solution] creates an impenetrable shield.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 12, name: 'Obsolescence Fear', category: 'fear-loss',
    psychology: 'Fear of becoming irrelevant or outdated drives rapid adoption of new technologies and methods.',
    strategy: 'Show how the landscape is shifting and how the solution keeps the reader relevant.',
    templates: [
      'The [industry] landscape is shifting. [Target audience] who do not adapt will be left behind.',
      'In [time period], [old method] will be obsolete. Are you ready for what comes next?',
      '[Percentage]% of [industry] has already made the switch. The rest are running out of time.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['unaware', 'problem_aware']
  },
  {
    id: 13, name: 'Isolation Anxiety', category: 'fear-loss',
    psychology: 'Humans are social creatures. The fear of being excluded from a group triggers deep anxiety.',
    strategy: 'Show the growing community and what the reader is missing by not being part of it.',
    templates: [
      'Join [number] [target audience] who are already [benefit]. Do not be the last one standing outside.',
      'Everyone in your [industry/network] is talking about [solution]. Are you the only one not in the conversation?',
      'The [community name] is growing by [number] members per [time period]. Your seat is waiting.'
    ],
    bestFor: ['vip-signup', 'quiz'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 14, name: 'Uncertainty Aversion', category: 'fear-loss',
    psychology: 'The brain treats uncertainty as a threat. People prefer a known negative outcome over an uncertain one.',
    strategy: 'Remove uncertainty with guarantees, free trials, clear timelines, and specific outcomes.',
    templates: [
      'No guesswork. No risk. Just [specific outcome] guaranteed in [time period] or your money back.',
      'We take all the uncertainty out of [process]. Here is exactly what happens when you [action].',
      'Stop wondering "what if" and start knowing. [Solution] gives you [specific certainty].'
    ],
    bestFor: ['advertorial', 'calculator', 'quiz'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 15, name: 'Change Resistance', category: 'fear-loss',
    psychology: 'People resist change even when the status quo is harmful. Frame the solution as minimal disruption.',
    strategy: 'Show how easy the transition is. Emphasize that the reader does not need to change their routine.',
    templates: [
      'You do not need to change anything about your [routine]. Just add [solution] and watch [result] happen.',
      'Zero learning curve. Zero disruption. [Solution] works within your existing [system/routine].',
      'Keep doing everything you are doing now. [Solution] simply makes it [percentage]% more effective.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['product_aware', 'most_aware']
  },

  // ============ CURIOSITY & COGNITIVE GAPS (16-28) ============
  {
    id: 16, name: 'Information Gap', category: 'curiosity',
    psychology: 'When people perceive a gap between what they know and what they want to know, they experience discomfort that drives them to seek resolution.',
    strategy: 'Tease valuable information without revealing it. Create a gap between what readers know and what they need to know.',
    templates: [
      'The [number] [industry] secrets that [target audience] who [result] never share publicly.',
      'What [percentage]% of [target audience] do not know about [topic] is costing them [amount].',
      'There is one thing separating [successful group] from everyone else. And it is not what you think.'
    ],
    bestFor: ['advertorial', 'listicle', 'quiz'],
    awarenessLevels: ['unaware', 'problem_aware']
  },
  {
    id: 17, name: 'Mystery & Intrigue', category: 'curiosity',
    psychology: 'The brain is wired to resolve uncertainty. Unexplained phenomena create cognitive tension that demands resolution.',
    strategy: 'Create mystery around results, methods, or discoveries. Use "secret" and "hidden" framing.',
    templates: [
      'The hidden [method/ingredient] behind [result] that [authority] does not want you to know.',
      'Inside: The closely guarded [industry] secret that [number] [target audience] have used to [result].',
      'What we found when we investigated [topic] shocked even our team of experts.'
    ],
    bestFor: ['advertorial', 'quiz'],
    awarenessLevels: ['unaware', 'problem_aware']
  },
  {
    id: 18, name: 'Unexpected Value', category: 'curiosity',
    psychology: 'When people discover value they did not expect, it triggers dopamine release and heightened attention.',
    strategy: 'Surprise readers with bonus insights, unexpected angles, or counterintuitive data.',
    templates: [
      'We expected [expected outcome]. What we found instead could change everything about how you [action].',
      'BONUS: We also discovered [unexpected benefit] that nobody in [industry] is talking about.',
      'The surprising connection between [topic A] and [topic B] that [target audience] need to know.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 19, name: 'Open Loops', category: 'curiosity',
    psychology: 'The Zeigarnik effect: unfinished tasks are remembered better than completed ones. Open questions create mental tension.',
    strategy: 'Start multiple narrative threads. Hint at revelations that come later. Use cliffhangers between sections.',
    templates: [
      'Before I reveal [the answer/method], you need to understand why [conventional wisdom] has been wrong all along...',
      'I will show you exactly how in a moment. But first, there is something critical you need to know about [related topic]...',
      'The most surprising part is not [teased result]. It is what happened next. (Keep reading.)'
    ],
    bestFor: ['advertorial', 'quiz'],
    awarenessLevels: ['unaware', 'problem_aware', 'solution_aware']
  },
  {
    id: 20, name: 'Cognitive Dissonance', category: 'curiosity',
    psychology: 'When people hold two contradictory beliefs, they experience mental discomfort and are motivated to resolve it.',
    strategy: 'Present information that contradicts the reader\'s current beliefs, then offer your solution as the resolution.',
    templates: [
      'You believe [common belief]. But the data shows the opposite is true.',
      'Everything you have been told about [topic] is backwards. Here is the proof.',
      'If [common approach] really worked, why are [percentage]% of [target audience] still struggling with [problem]?'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['unaware', 'problem_aware']
  },
  {
    id: 21, name: 'Predictive Processing', category: 'curiosity',
    psychology: 'The brain constantly predicts what comes next. When predictions are violated, attention spikes.',
    strategy: 'Set up expectations then subvert them. Use pattern interrupts in headlines and body copy.',
    templates: [
      'You would expect [expected outcome]. Instead, [surprising outcome] happened.',
      'Forget everything you know about [topic]. The new rules are completely different.',
      '[Common approach] should work. Science says otherwise. Here is what actually moves the needle.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 22, name: 'Novelty', category: 'curiosity',
    psychology: 'Novel stimuli activate the brain\'s reward center. New information and approaches get disproportionate attention.',
    strategy: 'Emphasize what is new, different, or first-of-its-kind about the solution.',
    templates: [
      'Introducing the first [solution type] specifically designed for [target audience].',
      'NEW: The [year] approach to [topic] that is replacing everything that came before.',
      'Never before has [target audience] had access to [this specific capability].'
    ],
    bestFor: ['advertorial', 'listicle', 'vip-signup'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 23, name: 'Incompleteness', category: 'curiosity',
    psychology: 'Incomplete information creates a sense of unfinished business that the brain wants to complete.',
    strategy: 'Present partial information that can only be completed by taking the desired action.',
    templates: [
      'You have [number] out of [number] pieces of the [result] puzzle. Here is the missing piece.',
      'You are [percentage]% of the way to [goal]. The final step is simpler than you think.',
      'Most [target audience] have already figured out [step 1] and [step 2]. What they are missing is [step 3].'
    ],
    bestFor: ['quiz', 'listicle'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 24, name: 'Narrative Gaps', category: 'curiosity',
    psychology: 'Stories with missing pieces compel the reader to fill in the blanks, creating deep engagement.',
    strategy: 'Tell a story with strategic gaps that the reader must continue reading to fill.',
    templates: [
      '[Name] was about to give up on [goal]. Then they discovered something that changed everything...',
      'Nobody believed [protagonist] when they claimed [bold claim]. [Time period] later, the results spoke for themselves.',
      'After [number] failed attempts at [goal], [name] tried one more thing. What happened next surprised everyone.'
    ],
    bestFor: ['advertorial'],
    awarenessLevels: ['unaware', 'problem_aware']
  },
  {
    id: 25, name: 'Question Framing', category: 'curiosity',
    psychology: 'Questions activate the brain\'s search mode, compelling it to seek answers.',
    strategy: 'Lead with provocative questions that the reader cannot help but want answered.',
    templates: [
      'What if everything you believe about [topic] is wrong?',
      'Why do [percentage]% of [target audience] fail at [goal]? (Hint: It is not what you think.)',
      'Can [seemingly impossible claim] really be achieved in just [time period]?'
    ],
    bestFor: ['advertorial', 'quiz', 'listicle'],
    awarenessLevels: ['unaware', 'problem_aware']
  },
  {
    id: 26, name: 'Juxtaposition', category: 'curiosity',
    psychology: 'Placing contrasting ideas side by side creates tension and forces the brain to reconcile them.',
    strategy: 'Contrast the reader\'s current state with the desired state. Show before/after dramatically.',
    templates: [
      'On one hand, [current painful reality]. On the other, [desired outcome]. The bridge between them? [Solution].',
      '[Target audience A] are still [struggling with problem]. [Target audience B] solved it [time period] ago. The difference? [Solution].',
      'Same [industry]. Same [market]. One uses [solution], one does not. The results could not be more different.'
    ],
    bestFor: ['advertorial', 'calculator'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 27, name: 'Anti-Pattern', category: 'curiosity',
    psychology: 'Going against established patterns creates cognitive friction that demands attention.',
    strategy: 'Challenge industry norms, popular advice, or common practices.',
    templates: [
      'Every [industry] guru tells you to [common advice]. Here is why that is destroying your [result].',
      'We did the opposite of what every [expert type] recommended. Our [metric] went up [percentage]%.',
      'CONTROVERSIAL: Why the most successful [target audience] are doing the exact opposite of [common practice].'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 28, name: 'Paradox', category: 'curiosity',
    psychology: 'Paradoxical statements create cognitive tension that the brain must resolve, ensuring continued engagement.',
    strategy: 'Present seemingly contradictory truths that your solution resolves.',
    templates: [
      'The less you [action], the more you [result]. Here is the counterintuitive science behind it.',
      'How doing LESS [activity] actually produces MORE [outcome].',
      'The [target audience] getting the best [results] are the ones working the least. Here is their secret.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['unaware', 'problem_aware']
  },

  // ============ SOCIAL PROOF & AUTHORITY (29-43) ============
  {
    id: 29, name: 'Social Proof (General)', category: 'social-proof',
    psychology: 'When uncertain, people look to others\' behavior for guidance. The larger the crowd, the stronger the pull.',
    strategy: 'Show numbers: users, customers, downloads, ratings, reviews. Make the crowd visible.',
    templates: [
      '[Number]+ [target audience] have already made the switch to [solution]. Join them.',
      'Trusted by [number] [target audience] across [number] countries.',
      '[Number] [target audience] cannot be wrong. See why they chose [solution].'
    ],
    bestFor: ['advertorial', 'listicle', 'vip-signup', 'quiz'],
    awarenessLevels: ['solution_aware', 'product_aware', 'most_aware']
  },
  {
    id: 30, name: 'Authority Bias', category: 'social-proof',
    psychology: 'People defer to perceived experts and authority figures, especially in unfamiliar domains.',
    strategy: 'Feature credentials, certifications, years of experience, institutional affiliations.',
    templates: [
      'Developed by [credential] with [number] years of experience in [field].',
      'Backed by research from [prestigious institution]. Proven in [number] clinical studies.',
      'Recommended by [number] leading [professionals] in [industry].'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 31, name: 'Expert Endorsement', category: 'social-proof',
    psychology: 'Named expert endorsements carry more weight than anonymous reviews because they put reputation on the line.',
    strategy: 'Get specific quotes from named experts with credentials. Show their face and title.',
    templates: [
      '"[Quote about solution]" - [Expert Name], [Title], [Organization]',
      '[Expert Name], who has [credential/achievement], calls [solution] "[strong endorsement]."',
      'When [Expert Name] ([credential]) recommends something, [number] [target audience] listen.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 32, name: 'Celebrity Endorsement', category: 'social-proof',
    psychology: 'Celebrity association transfers positive feelings (halo effect) to the product or service.',
    strategy: 'Reference well-known figures who use or endorse the solution (only if genuine).',
    templates: [
      'Used by [celebrity/influencer] and [number] other industry leaders.',
      'Find out why [well-known figure] switched to [solution] after [number] years of [old method].',
      'Featured in [media outlet] and endorsed by [notable figure].'
    ],
    bestFor: ['advertorial'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 33, name: 'Wisdom of the Crowds', category: 'social-proof',
    psychology: 'Large numbers signal safety and correctness. If many people are doing it, it must be right.',
    strategy: 'Emphasize scale: total users, daily signups, aggregate results.',
    templates: [
      '[Number] [target audience] signed up this [time period] alone. They are already seeing [result].',
      'Over [number] [units] [sold/delivered/completed] and counting.',
      'Growing by [number] new [target audience] every [time period]. The movement is real.'
    ],
    bestFor: ['advertorial', 'listicle', 'vip-signup'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 34, name: 'User-Generated Content', category: 'social-proof',
    psychology: 'Content created by actual users is perceived as more authentic than brand-created messaging.',
    strategy: 'Feature real customer photos, screenshots, video testimonials, and social media posts.',
    templates: [
      'See what real [target audience] are saying about [solution] (screenshots from actual conversations).',
      'Unfiltered reviews from [number] verified [target audience] who have used [solution] for [time period]+.',
      'These results are not from our marketing team. They are from people just like you.'
    ],
    bestFor: ['advertorial', 'listicle', 'quiz'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 35, name: 'Testimonials & Case Studies', category: 'social-proof',
    psychology: 'Specific stories of transformation are more persuasive than abstract claims because they activate narrative processing.',
    strategy: 'Use detailed before/after stories with names, specific numbers, and timeframes.',
    templates: [
      '"I went from [before state] to [after state] in just [time period]. [Solution] changed everything." - [Name], [Location]',
      'CASE STUDY: How [Name] achieved [specific result] after struggling with [problem] for [time period].',
      '[Name] was [struggling with problem]. [Time period] after starting [solution], [specific measurable result].'
    ],
    bestFor: ['advertorial', 'listicle', 'quiz'],
    awarenessLevels: ['solution_aware', 'product_aware', 'most_aware']
  },
  {
    id: 36, name: 'Likeability / Attraction', category: 'social-proof',
    psychology: 'People are more easily persuaded by those they like. Warmth, humor, and relatability build trust.',
    strategy: 'Show the human side of the brand. Use relatable founder stories and conversational tone.',
    templates: [
      'Hi, I am [Name]. I struggled with [same problem] for [time period] before I discovered [solution].',
      'I know exactly how you feel. I was in the same position [time period] ago.',
      'We are not a faceless corporation. We are [number] [passionate people] who [share the reader\'s mission].'
    ],
    bestFor: ['advertorial', 'vip-signup'],
    awarenessLevels: ['unaware', 'problem_aware', 'solution_aware']
  },
  {
    id: 37, name: 'Similarity (Ingroup Bias)', category: 'social-proof',
    psychology: 'People trust and follow those who are similar to them in demographics, values, or situation.',
    strategy: 'Use testimonials from people who match the target audience\'s demographics and situation.',
    templates: [
      'Made for [target audience] BY [target audience]. We understand because we have been there.',
      'Other [target audience] in [location/industry] are achieving [result]. You can too.',
      'If you are a [specific demographic] who [specific situation], this was made specifically for you.'
    ],
    bestFor: ['advertorial', 'quiz', 'vip-signup'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 38, name: 'Scarcity (Social Proof Driven)', category: 'social-proof',
    psychology: 'When others are consuming something rapidly, it signals value and creates urgency.',
    strategy: 'Show depletion rate: "selling fast", "almost sold out", real-time purchase notifications.',
    templates: [
      '[Number] people are viewing this right now. [Number] have purchased in the last [time period].',
      'Selling [number] per [time period]. Current batch is [percentage]% claimed.',
      'Due to overwhelming demand, we can only guarantee availability for the next [time period].'
    ],
    bestFor: ['advertorial', 'vip-signup'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 39, name: 'Bandwagon Effect', category: 'social-proof',
    psychology: 'The tendency to adopt behaviors because many others are doing so. Momentum creates more momentum.',
    strategy: 'Show growth trends, adoption curves, and momentum indicators.',
    templates: [
      '[Solution] is the fastest-growing [category] in [industry]. [Number] new users every [time period].',
      'The [solution] movement is sweeping [industry/location]. Do not get left behind.',
      'Why [number]+ [target audience] switched to [solution] in the last [time period] alone.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 40, name: 'Consensus', category: 'social-proof',
    psychology: 'When experts, users, and media all agree, the combined weight becomes nearly irresistible.',
    strategy: 'Stack multiple types of proof: expert + user + media + data all pointing to the same conclusion.',
    templates: [
      'Recommended by doctors. Loved by [number]+ users. Featured in [media outlet]. The verdict is unanimous.',
      '[Number] experts, [number] users, and [number] studies all point to the same conclusion: [solution] works.',
      'Doctors agree. Users agree. The data agrees. [Solution] is the [category] leader.'
    ],
    bestFor: ['advertorial'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 41, name: 'Reciprocity (Social)', category: 'social-proof',
    psychology: 'When someone gives you something, you feel obligated to give something in return.',
    strategy: 'Give valuable content, tools, or resources before asking for anything.',
    templates: [
      'Here is our complete [resource] absolutely free. No strings attached.',
      'We have helped [number] [target audience] for free. Now let us help you.',
      'Download our [number]-page [resource]. Consider it our gift to fellow [target audience].'
    ],
    bestFor: ['listicle', 'quiz', 'vip-signup', 'calculator'],
    awarenessLevels: ['unaware', 'problem_aware']
  },
  {
    id: 42, name: 'Community & Belonging', category: 'social-proof',
    psychology: 'Humans have a fundamental need to belong to groups. Communities create loyalty beyond the product.',
    strategy: 'Build community language: "members", "insiders", "family", "tribe".',
    templates: [
      'Join [number]+ [target audience] in the [community name]. Where the best in [industry] come to grow.',
      'You are not just getting [product]. You are joining a community of [number] [target audience] who support each other.',
      'Welcome to the [community name]. The [number] [target audience] in here are doing incredible things.'
    ],
    bestFor: ['vip-signup', 'quiz'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 43, name: 'Social Learning', category: 'social-proof',
    psychology: 'People learn behaviors by observing others\' actions and outcomes (Bandura\'s Social Learning Theory).',
    strategy: 'Show step-by-step success stories. Let readers see themselves in others\' journeys.',
    templates: [
      'Follow [Name]\'s journey: from [starting point] to [achievement] in [time period].',
      'Watch how [Name] used [solution] to transform their [area]. Step by step.',
      'See exactly what [number] successful [target audience] did differently (and copy their approach).'
    ],
    bestFor: ['advertorial', 'quiz'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },

  // ============ IDENTITY & BELONGING (44-55) ============
  {
    id: 44, name: 'Identity Alignment', category: 'identity',
    psychology: 'People make choices that are consistent with their self-image. Products that align with identity feel inevitable.',
    strategy: 'Frame the product as a natural expression of who the reader already is.',
    templates: [
      'You are the kind of [target audience] who [positive trait]. [Solution] was made for people like you.',
      'If you value [core value], you will love [solution].',
      'This is not for everyone. It is for [target audience] who [defining characteristic].'
    ],
    bestFor: ['advertorial', 'vip-signup', 'quiz'],
    awarenessLevels: ['problem_aware', 'solution_aware', 'product_aware']
  },
  {
    id: 45, name: 'Self-Efficacy', category: 'identity',
    psychology: 'People\'s belief in their ability to succeed determines whether they will try. Boost their confidence.',
    strategy: 'Show that success is achievable by anyone. Remove the "this won\'t work for me" objection.',
    templates: [
      'If [relatable person] can do it, you can too. Here is the exact same [method/tool] they used.',
      'No experience needed. No special skills required. Just follow [number] simple steps.',
      '[Number]% of our [target audience] see results within [time period]. The system does the heavy lifting.'
    ],
    bestFor: ['advertorial', 'quiz', 'calculator'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 46, name: 'Personalization', category: 'identity',
    psychology: 'Personalized experiences feel more relevant and valuable. The brain pays more attention to self-referential information.',
    strategy: 'Use dynamic content, quiz results, and targeted messaging based on audience segments.',
    templates: [
      'Based on your [quiz answer/profile], the best approach for you is [personalized recommendation].',
      'For [target audience] in [specific situation], we recommend [specific solution].',
      'Your custom [plan/solution] is ready. Built specifically for [their specific need].'
    ],
    bestFor: ['quiz', 'calculator'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 47, name: 'Exclusivity', category: 'identity',
    psychology: 'Exclusive access makes people feel special and valued. It activates the reward center.',
    strategy: 'Create invitation-only, early access, or members-only framing.',
    templates: [
      'This page is not available to the general public. You are seeing it because [reason].',
      'By invitation only. [Number] spots for [target audience] who qualify.',
      'EXCLUSIVE ACCESS: Available only to [qualifying criteria].'
    ],
    bestFor: ['vip-signup', 'advertorial'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 48, name: 'Aspiration & Ideal Self', category: 'identity',
    psychology: 'People are motivated to close the gap between who they are and who they want to be.',
    strategy: 'Paint a vivid picture of the reader\'s ideal future self, then show how the solution bridges the gap.',
    templates: [
      'Imagine waking up every morning knowing [ideal outcome]. That is what [solution] delivers.',
      'The [target audience] you want to become is just [number] steps away.',
      'In [time period], you could be [ideal future state]. Here is the roadmap.'
    ],
    bestFor: ['advertorial', 'quiz', 'vip-signup'],
    awarenessLevels: ['problem_aware', 'solution_aware']
  },
  {
    id: 49, name: 'Self-Expression', category: 'identity',
    psychology: 'Products that help people express their identity become extensions of the self.',
    strategy: 'Position the product as a way for the reader to express who they are or what they stand for.',
    templates: [
      '[Solution] is not just a [product category]. It is a statement about what you stand for.',
      'Show the world you are a [positive identity] by [action with solution].',
      'Every [target audience] who uses [solution] is saying something about who they are.'
    ],
    bestFor: ['vip-signup', 'advertorial'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 50, name: 'Autonomy & Control', category: 'identity',
    psychology: 'The need for autonomy is a core psychological drive. Products that give control are valued more.',
    strategy: 'Emphasize choice, customization, and the reader\'s power over their outcomes.',
    templates: [
      'You are in complete control. Choose your [options], set your [parameters], get your [results].',
      'No more depending on [external factor]. [Solution] puts the power back in your hands.',
      'Your [result], your way. [Solution] adapts to your unique [needs/preferences].'
    ],
    bestFor: ['calculator', 'quiz'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 51, name: 'Ownership Effect', category: 'identity',
    psychology: 'People value things more once they own them (endowment effect). Free trials leverage this.',
    strategy: 'Let people experience ownership before buying. Free trials, samples, and "keep it" guarantees.',
    templates: [
      'Try [solution] free for [time period]. If you do not love it, keep everything and pay nothing.',
      'Your [solution] is already set up and waiting. Just [simple action] to activate it.',
      'Start using [solution] right now. You can decide later if you want to keep it.'
    ],
    bestFor: ['advertorial', 'quiz'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 52, name: 'Legacy & Impact', category: 'identity',
    psychology: 'People are motivated by the desire to create something that outlasts them.',
    strategy: 'Connect the product to larger purpose, lasting impact, or meaningful contribution.',
    templates: [
      'This is not just about [immediate benefit]. It is about building [long-term legacy].',
      'The [target audience] who invest in [solution] today are shaping the future of [industry/area].',
      'What will your [result] look like [time period] from now? Start building that legacy today.'
    ],
    bestFor: ['advertorial', 'vip-signup'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 53, name: 'Self-Actualization', category: 'identity',
    psychology: 'At the top of Maslow\'s hierarchy, self-actualization drives people to reach their full potential.',
    strategy: 'Frame the product as the key to unlocking the reader\'s full potential.',
    templates: [
      'You have the talent. You have the drive. [Solution] is the missing piece that unlocks your full potential.',
      'Stop settling for [current state] when you were meant for [ideal state].',
      'The best version of your [business/life/career] is waiting. [Solution] is the bridge.'
    ],
    bestFor: ['advertorial', 'quiz'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 54, name: 'Storytelling & Archetypes', category: 'identity',
    psychology: 'Stories activate multiple brain regions simultaneously. Archetypal narratives feel deeply familiar.',
    strategy: 'Use hero\'s journey, underdog, or transformation narratives. Cast the reader as the hero.',
    templates: [
      'Everyone told [protagonist] it was impossible. [Time period] later, [protagonist] proved them all wrong.',
      'This is the story of [target audience] who refused to accept [status quo] and found a better way.',
      'You are the hero of this story. [Solution] is your [mentor/weapon/map].'
    ],
    bestFor: ['advertorial'],
    awarenessLevels: ['unaware', 'problem_aware']
  },
  {
    id: 55, name: 'Rituals & Habits', category: 'identity',
    psychology: 'Rituals create meaning and habits create automation. Products that become part of routines are stickier.',
    strategy: 'Position the product as part of a daily routine or meaningful practice.',
    templates: [
      'Add [solution] to your [morning/daily] routine and watch [result] compound over time.',
      'The [number]-minute daily ritual that [number]+ [target audience] swear by.',
      'Make [solution] part of your [routine] and never worry about [problem] again.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['product_aware', 'most_aware']
  },

  // ============ REWARD & INCENTIVE (56-63) ============
  {
    id: 56, name: 'Immediate Gratification', category: 'reward',
    psychology: 'The brain heavily discounts future rewards. Immediate payoffs are disproportionately motivating.',
    strategy: 'Emphasize instant access, immediate results, and quick wins.',
    templates: [
      'Get instant access to [solution] and see your first [result] within [short time period].',
      'Start seeing results in as little as [short time period]. No waiting.',
      'Instant download. Instant setup. Instant [benefit].'
    ],
    bestFor: ['advertorial', 'listicle', 'quiz'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 57, name: 'Anticipation', category: 'reward',
    psychology: 'The anticipation of a reward can be more pleasurable than the reward itself. Build excitement.',
    strategy: 'Create a sense of exciting things to come. Waitlists, launch countdowns, preview access.',
    templates: [
      'Something big is coming for [target audience]. Be the first to know.',
      'We have been working on this for [time period]. The wait is almost over.',
      'Get on the waitlist now. When this launches, [bold prediction about impact].'
    ],
    bestFor: ['vip-signup'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 58, name: 'Variable Rewards', category: 'reward',
    psychology: 'Unpredictable rewards create stronger engagement than predictable ones (slot machine effect).',
    strategy: 'Include surprise bonuses, random perks, or unexpected benefits.',
    templates: [
      'Every [target audience] who [action] today gets a surprise bonus (valued at [amount]).',
      'We randomly select [number] new members each [time period] for [exclusive benefit].',
      'Order now and receive a mystery bonus curated specifically for [target audience].'
    ],
    bestFor: ['advertorial', 'vip-signup'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 59, name: 'Progress & Milestones', category: 'reward',
    psychology: 'Visible progress toward a goal is intrinsically motivating. The closer to the goal, the harder people work.',
    strategy: 'Show progress indicators, milestone celebrations, and "you\'re almost there" messaging.',
    templates: [
      'You are [percentage]% of the way to [goal]. Complete [action] to unlock the next level.',
      'Step [current] of [total]. You are closer than you think.',
      'Most [target audience] reach [milestone] within [time period] of starting. You are on track.'
    ],
    bestFor: ['quiz', 'calculator'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 60, name: 'Gamification', category: 'reward',
    psychology: 'Game mechanics (points, levels, achievements) trigger dopamine release and sustained engagement.',
    strategy: 'Add interactive elements: quizzes, scores, progress bars, unlockable content.',
    templates: [
      'Take the [number]-question quiz to discover your [type/score/level].',
      'Complete all [number] steps to unlock your personalized [result/plan].',
      'Your score: [score]. Here is what it means and how to improve it.'
    ],
    bestFor: ['quiz', 'calculator'],
    awarenessLevels: ['unaware', 'problem_aware', 'solution_aware']
  },
  {
    id: 61, name: 'Perceived Value', category: 'reward',
    psychology: 'Value is relative, not absolute. The same offer feels more valuable when anchored against a higher reference point.',
    strategy: 'Show the full value, then the price. Stack bonuses. Compare to alternatives.',
    templates: [
      'Total value: [high amount]. Your price today: [low amount]. That is [percentage]% off.',
      'You could pay [competitor price] for [inferior alternative]. Or get [solution] for [fraction].',
      'PLUS: Get [bonus 1] ([value]), [bonus 2] ([value]), and [bonus 3] ([value]) absolutely free.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 62, name: 'Surprise & Delight', category: 'reward',
    psychology: 'Unexpected positive experiences create stronger emotional bonds than expected ones.',
    strategy: 'Over-deliver. Include unannounced bonuses or benefits.',
    templates: [
      'Wait, there is more. We are also including [unexpected bonus] at no extra charge.',
      'SURPRISE: Everyone who [action] this [time period] also gets [unexpected benefit].',
      'We added [bonus] because we believe in going above and beyond for our [target audience].'
    ],
    bestFor: ['advertorial', 'vip-signup'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 63, name: 'Reciprocity (Economic)', category: 'reward',
    psychology: 'Economic reciprocity: people feel obligated to return value when they receive value.',
    strategy: 'Provide substantial free value before making an offer. The bigger the gift, the stronger the obligation.',
    templates: [
      'We have given you [free resource]. Now here is how to get [even bigger result] with [solution].',
      'This free [resource] alone is worth [amount]. Imagine what the full [solution] can do.',
      'You have just received [number] [valuable things] for free. If you want the complete system, here is how to get it.'
    ],
    bestFor: ['listicle', 'quiz', 'calculator'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },

  // ============ SIMPLICITY & CLARITY (64-73) ============
  {
    id: 64, name: 'Cognitive Ease', category: 'simplicity',
    psychology: 'The brain prefers information that is easy to process. Simple messages feel truer and more trustworthy.',
    strategy: 'Use short sentences, simple words, and clear structure. Break complex ideas into digestible pieces.',
    templates: [
      '[Solution] does one thing: [core benefit]. And it does it better than anything else.',
      'Three steps. [Number] minutes. [Specific result]. That is it.',
      'No complexity. No confusion. Just [solution] that delivers [result].'
    ],
    bestFor: ['advertorial', 'listicle', 'calculator'],
    awarenessLevels: ['solution_aware', 'product_aware', 'most_aware']
  },
  {
    id: 65, name: 'Mental Fluency', category: 'simplicity',
    psychology: 'Information that flows smoothly is processed more easily and feels more credible.',
    strategy: 'Use rhythm, repetition, and familiar language patterns. Avoid jargon.',
    templates: [
      'Simple to start. Easy to use. Impossible to live without.',
      'See it. Try it. Love it. That is the [solution] experience.',
      'Less [pain]. More [gain]. That is the [solution] promise.'
    ],
    bestFor: ['advertorial', 'listicle'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 66, name: 'Choice Architecture', category: 'simplicity',
    psychology: 'How choices are presented dramatically affects decisions. Structure choices to guide toward the best option.',
    strategy: 'Present 3 options with the desired choice highlighted. Use "most popular" or "recommended" labels.',
    templates: [
      'Choose your plan: [Basic] | [RECOMMENDED: Pro] | [Enterprise]. Most [target audience] choose Pro.',
      'Option A: [minimal]. Option B: [best value]. Option C: [premium]. [Percentage]% choose B.',
      'Start with [free option] or go straight to [paid option] for [exclusive benefit].'
    ],
    bestFor: ['calculator', 'quiz'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 67, name: 'Default Bias', category: 'simplicity',
    psychology: 'People tend to stick with the default option. Pre-selected choices dramatically increase adoption.',
    strategy: 'Pre-select the desired option. Make the recommended choice the default.',
    templates: [
      'We have pre-selected the [recommended option] for you based on what works best for [target audience].',
      'The [option name] plan is already in your cart. Just confirm to get started.',
      'Most [target audience] start here. We have set this up as your starting point.'
    ],
    bestFor: ['calculator', 'quiz'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 68, name: 'Anchoring', category: 'simplicity',
    psychology: 'The first number people see becomes the anchor against which all subsequent numbers are compared.',
    strategy: 'Show the highest price or value first, then present the actual offer as a bargain.',
    templates: [
      'Regular price: [high price]. Today only: [low price]. Save [amount/percentage].',
      'Comparable solutions cost [high price]. [Solution] delivers the same results for [low price].',
      'That is less than [relatable daily expense] per day for [valuable result].'
    ],
    bestFor: ['advertorial', 'listicle', 'calculator'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 69, name: 'Framing', category: 'simplicity',
    psychology: 'The same information presented differently leads to different decisions. Frame positively for gains, negatively for losses.',
    strategy: 'Frame the offer in terms that make it feel like a no-brainer. Use daily cost, percentage savings, or ROI framing.',
    templates: [
      'For less than [daily equivalent], you get [comprehensive solution]. That is [relatable comparison].',
      '[Percentage]% of [target audience] see positive ROI within [time period]. That is not a promise, it is a pattern.',
      'Think of it this way: [reframed cost] versus [reframed value]. The math speaks for itself.'
    ],
    bestFor: ['advertorial', 'calculator'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 70, name: 'Decoy Effect', category: 'simplicity',
    psychology: 'An inferior third option makes one of the other two look much better by comparison.',
    strategy: 'Add a third option that makes the desired option look like the best value.',
    templates: [
      'Option 1: [basic] for [price]. Option 2: [best value] for [slightly higher price]. Option 3: [premium] for [much higher price]. Best value: Option 2.',
      'You could: A) [expensive alternative], B) [your solution at great value], or C) [doing nothing and losing out].',
      'Compare: [Competitor A] at [high price]. [Competitor B] at [medium price]. [Solution] at [best value price] with MORE features.'
    ],
    bestFor: ['calculator', 'listicle'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
  {
    id: 71, name: 'Simplicity Paradox', category: 'simplicity',
    psychology: 'Complex problems solved simply feel more valuable. The simpler the solution appears, the more powerful it seems.',
    strategy: 'Show the complexity of the problem, then present an elegantly simple solution.',
    templates: [
      '[Problem] is complicated. The solution does not have to be. [Solution] simplifies everything.',
      'We spent [time period] making [solution] this simple. One [action] is all it takes.',
      'Behind [solution]\'s simple interface is [complex technology]. You get the results without the complexity.'
    ],
    bestFor: ['advertorial', 'calculator'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 72, name: 'Lossless Simplification', category: 'simplicity',
    psychology: 'Removing unnecessary steps without losing value makes the experience feel premium.',
    strategy: 'Show what you have eliminated (unnecessary steps, hidden fees, complexity) while preserving all value.',
    templates: [
      'We removed [number] unnecessary steps from [process]. Same results, [percentage]% less effort.',
      'No [removed friction point]. No [removed friction point]. No [removed friction point]. Just [result].',
      'Traditional [process] has [number] steps. [Solution] has [fewer number]. Everything else is handled for you.'
    ],
    bestFor: ['advertorial', 'listicle', 'calculator'],
    awarenessLevels: ['solution_aware', 'product_aware']
  },
  {
    id: 73, name: 'Clear Call-to-Action', category: 'simplicity',
    psychology: 'When the next step is crystal clear, the brain can commit resources to action rather than figuring out what to do.',
    strategy: 'Make the CTA unmissable, specific, and low-friction. One clear action, one click.',
    templates: [
      'Click the button below to [specific immediate outcome]. Takes [time period]. No [common objection].',
      '[Action verb] now and get [specific deliverable] in your inbox within [time period].',
      'Ready? [CTA button text]. That is all it takes to start [benefit].'
    ],
    bestFor: ['advertorial', 'listicle', 'quiz', 'vip-signup', 'calculator'],
    awarenessLevels: ['product_aware', 'most_aware']
  },
];

// ============ STACKING FORMULAS ============
const STACKING_FORMULAS = {
  'nuclear-stack': {
    name: 'The Nuclear Stack',
    description: 'Maximum-impact combination for high-converting pages',
    triggers: [1, 4, 29, 35, 47, 68, 73], // FOMO + Urgency + Social Proof + Testimonials + Exclusivity + Anchoring + CTA
    sequence: 'Open with exclusivity → Build social proof → Stack testimonials → Anchor price high → Create urgency → Clear CTA'
  },
  'trust-builder': {
    name: 'Trust Builder Stack',
    description: 'For cold audiences who need maximum trust signals',
    triggers: [30, 31, 35, 40, 14, 64], // Authority + Expert + Testimonials + Consensus + Uncertainty Aversion + Cognitive Ease
    sequence: 'Lead with authority → Expert endorsement → Case studies → Show consensus → Remove uncertainty → Simple CTA'
  },
  'curiosity-converter': {
    name: 'Curiosity Converter Stack',
    description: 'Hook attention and maintain engagement through the entire page',
    triggers: [16, 19, 25, 17, 20, 73], // Info Gap + Open Loops + Question Framing + Mystery + Cognitive Dissonance + CTA
    sequence: 'Question hook → Open curiosity loop → Build mystery → Create dissonance → Resolve with solution → CTA'
  },
  'identity-play': {
    name: 'Identity Play Stack',
    description: 'Connect deeply with audience identity and aspirations',
    triggers: [44, 48, 47, 42, 37, 73], // Identity + Aspiration + Exclusivity + Community + Similarity + CTA
    sequence: 'Align with identity → Paint aspirational future → Create exclusivity → Build community → Show similar people → CTA'
  },
  'fear-to-action': {
    name: 'Fear to Action Stack',
    description: 'Move from fear awareness to confident action',
    triggers: [2, 9, 6, 14, 45, 73], // Loss Aversion + Resource Depletion + Mistake Prevention + Uncertainty → Self-Efficacy + CTA
    sequence: 'Show what they are losing → Quantify the drain → Show mistakes to avoid → Remove uncertainty → Build confidence → CTA'
  },
  'value-maximizer': {
    name: 'Value Maximizer Stack',
    description: 'Make the offer feel like an absolute no-brainer',
    triggers: [68, 61, 70, 56, 62, 73], // Anchoring + Perceived Value + Decoy + Instant Gratification + Surprise + CTA
    sequence: 'Anchor high price → Stack value → Show decoy option → Promise instant access → Surprise bonus → CTA'
  },
  'quiz-funnel-stack': {
    name: 'Quiz Funnel Stack',
    description: 'Optimized for interactive quiz pages',
    triggers: [60, 46, 59, 25, 23, 73], // Gamification + Personalization + Progress + Questions + Incompleteness + CTA
    sequence: 'Gamify the quiz → Personalize questions → Show progress → Ask engaging questions → Incomplete results → CTA to complete'
  },
  'calculator-stack': {
    name: 'Calculator Stack',
    description: 'Optimized for interactive calculator pages',
    triggers: [9, 50, 69, 68, 26, 73], // Resource Depletion + Autonomy + Framing + Anchoring + Juxtaposition + CTA
    sequence: 'Show the resource drain → Give control with calculator → Frame results dramatically → Anchor comparison → Juxtapose options → CTA'
  }
};

// ============ PLATFORM-SPECIFIC FORMULAS ============
const PLATFORM_FORMULAS = {
  'facebook-instagram': {
    name: 'Facebook/Instagram Formula',
    triggerOrder: ['Hook (1-3 seconds)', 'Social Proof', 'Benefit Stack', 'Urgency', 'CTA'],
    bestTriggers: [1, 29, 35, 4, 73]
  },
  'google-search': {
    name: 'Google Search Ad Formula',
    triggerOrder: ['Keyword Match', 'Specificity', 'Authority', 'Urgency', 'CTA'],
    bestTriggers: [64, 30, 4, 61, 73]
  },
  'linkedin': {
    name: 'LinkedIn Formula',
    triggerOrder: ['Professional Identity', 'Authority', 'Data/Results', 'Exclusivity', 'CTA'],
    bestTriggers: [44, 30, 35, 47, 73]
  },
  'tiktok': {
    name: 'TikTok Formula',
    triggerOrder: ['Pattern Interrupt', 'Curiosity', 'Story', 'Social Proof', 'CTA'],
    bestTriggers: [21, 16, 54, 29, 73]
  },
  'email': {
    name: 'Email Subject Line Formula',
    triggerOrder: ['Curiosity/FOMO', 'Personalization', 'Urgency', 'Benefit'],
    bestTriggers: [16, 46, 4, 56]
  },
  'youtube': {
    name: 'YouTube Pre-Roll Formula',
    triggerOrder: ['Hook (0-5 seconds)', 'Problem', 'Credibility', 'Solution', 'CTA'],
    bestTriggers: [25, 20, 30, 64, 73]
  }
};

// Helper: Get triggers for a specific page type
function getTriggersForPageType(pageType) {
  return TRIGGERS.filter(t => t.bestFor.includes(pageType));
}

// Helper: Get triggers for a specific awareness level
function getTriggersForAwareness(level) {
  return TRIGGERS.filter(t => t.awarenessLevels.includes(level));
}

// Helper: Get triggers by category
function getTriggersByCategory(category) {
  return TRIGGERS.filter(t => t.category === category);
}

// Helper: Get a specific stacking formula
function getStackingFormula(formulaKey) {
  const formula = STACKING_FORMULAS[formulaKey];
  if (!formula) return null;
  return {
    ...formula,
    triggerDetails: formula.triggers.map(id => TRIGGERS.find(t => t.id === id))
  };
}

// Helper: Build AI context string for a generation step
function buildTriggerContext(pageType, awarenessLevel, maxTriggers = 10) {
  const relevant = TRIGGERS.filter(t =>
    t.bestFor.includes(pageType) && t.awarenessLevels.includes(awarenessLevel)
  ).slice(0, maxTriggers);

  let context = `## Psychological Triggers to Apply\n\n`;
  relevant.forEach(t => {
    context += `### ${t.id}. ${t.name}\n`;
    context += `Psychology: ${t.psychology}\n`;
    context += `Strategy: ${t.strategy}\n`;
    context += `Template: "${t.templates[0]}"\n\n`;
  });

  return context;
}

// Helper: Get full context for strategy step
function getStrategyContext(pageType) {
  const stackKey = pageType === 'quiz' ? 'quiz-funnel-stack' :
                   pageType === 'calculator' ? 'calculator-stack' :
                   'nuclear-stack';
  const stack = getStackingFormula(stackKey);

  let context = `## Recommended Stacking Formula: ${stack.name}\n`;
  context += `${stack.description}\n`;
  context += `Sequence: ${stack.sequence}\n\n`;
  context += `## Triggers in this stack:\n`;
  stack.triggerDetails.forEach(t => {
    if (t) {
      context += `- ${t.id}. ${t.name}: ${t.strategy}\n`;
    }
  });

  return context;
}

export {
  TRIGGER_CATEGORIES,
  TRIGGERS,
  STACKING_FORMULAS,
  PLATFORM_FORMULAS,
  getTriggersForPageType,
  getTriggersForAwareness,
  getTriggersByCategory,
  getStackingFormula,
  buildTriggerContext,
  getStrategyContext
};
