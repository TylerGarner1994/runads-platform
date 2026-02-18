// RunAds - Industry-Specific Ad Templates
// 6 industry packages with complete primary text, headline, description, and CTA templates
// Each template is pre-built for the most common awareness levels in that industry

export const INDUSTRY_TEMPLATES = {
  ecommerce: {
    name: 'E-Commerce / DTC',
    keywords: ['ecommerce', 'e-commerce', 'dtc', 'direct to consumer', 'shopify', 'retail', 'store', 'product', 'shop'],
    templates: {
      cold_traffic: {
        primary_text: [
          'We didn\'t set out to build a [product category] company. We set out to solve [specific problem]. After [time/research], we realized [insight]. That\'s why every [product] is [unique mechanism]. Try it risk-free — if you don\'t [specific outcome], we\'ll refund every penny.',
          'You wouldn\'t settle for [inferior alternative] in your [context]. So why are you settling for [industry standard] when it comes to [product category]? [Number]+ [target audience] made the switch. Here\'s what they discovered.',
          'Most [product category] products are designed to [common approach]. Ours is designed to [unique approach]. The result? [Specific outcome] in [timeframe]. See the reviews yourself.'
        ],
        headline: [
          '[Product] That Actually [Bold Claim]',
          'Finally, [Product Category] That [Desired Outcome]',
          'The [Adjective] [Product] [Number]+ People Love'
        ],
        description: [
          'Free shipping + [guarantee]. Join [number]+ happy customers.',
          'Rated [rating] stars by [number]+ real customers. Try risk-free.',
          '[Percentage]% [ingredient/material]. [Benefit]. Ships free today.'
        ],
        cta: ['Shop Now', 'Try Risk-Free', 'Get Yours', 'Claim Offer']
      },
      retargeting: {
        primary_text: [
          'Still thinking about it? Here\'s what [number]+ customers said after trying [product]: "[Short testimonial]." Your [guarantee] is waiting.',
          'You were THIS close. Don\'t let [product] sell out before you grab yours. [Number] left in stock. [Guarantee] included.',
          'Forgot something? Your [product] is still in your cart. Use code [CODE] for [discount]% off — but only for the next [time period].'
        ],
        headline: [
          'Your Cart Misses You',
          'Still Thinking? Read This',
          '[Discount]% Off Ends [Timeframe]'
        ],
        description: [
          'Complete your order and save [amount]. Limited time.',
          '[Number]+ 5-star reviews. See why everyone\'s switching.',
          'Last chance — this offer expires [timeframe].'
        ],
        cta: ['Complete Order', 'Claim Discount', 'Get It Now']
      }
    },
    keyMetrics: ['ROAS', 'CPA', 'AOV', 'Conversion Rate'],
    commonObjections: ['Price too high', 'Not sure about quality', 'Already have a similar product', 'Shipping concerns'],
    proofTypes: ['Customer reviews', 'Before/after photos', 'Unboxing videos', 'Ingredient/material sourcing']
  },

  health: {
    name: 'Health & Wellness',
    keywords: ['health', 'wellness', 'supplement', 'fitness', 'nutrition', 'weight', 'medical', 'skin', 'beauty', 'vitamin', 'probiotic', 'collagen'],
    templates: {
      cold_traffic: {
        primary_text: [
          'Your [body/health area] isn\'t broken — it\'s missing [key ingredient/approach]. [Research/Study] shows that [finding]. That\'s why [product] was formulated with [mechanism]. No [common negative]. Just [desired outcome]. [Guarantee].',
          'If [common health struggle] feels like your daily reality, it\'s not your fault. [Number]% of [target audience] deal with [symptom] because of [hidden cause]. [Product] addresses the [root cause], not just the symptoms.',
          'I\'m a [credential] and I\'ve spent [time] researching [health topic]. The one thing I recommend to every [patient/client]? [Product/ingredient]. Here\'s why it works when [other solutions] don\'t.'
        ],
        headline: [
          '[Outcome] Starts From Within',
          'The [Ingredient] Your Body is Missing',
          '[Number] Weeks to Feel the Difference'
        ],
        description: [
          '[Credential]-recommended. [Number]+ success stories. Try today.',
          'Backed by [number] studies. [Guarantee]. Free shipping.',
          'Clean ingredients. Real results. [Number]-day money back.'
        ],
        cta: ['Try Risk-Free', 'Start Your Journey', 'Get Started', 'Learn More']
      },
      retargeting: {
        primary_text: [
          '"I noticed a difference in just [timeframe]." — [Name], verified customer. Join [number]+ who finally found what works for [problem]. [Guarantee] means zero risk.',
          'You researched [topic]. You compared options. [Product] checked every box. [Number]+ [target audience] agree. Ready to feel the difference?',
          'Your body is waiting for the right support. [Product] delivers [amount] of [key ingredient] in every [serving]. [Number]+ 5-star reviews. [Guarantee].'
        ],
        headline: [
          'Ready to Feel the Difference?',
          'Your Body Will Thank You',
          '[Percentage]% Saw Results in [Timeframe]'
        ],
        description: [
          'Join [number]+ who transformed their [health area].',
          '[Guarantee]. If it doesn\'t work, you pay nothing.',
          'Subscribe and save [percentage]%. Cancel anytime.'
        ],
        cta: ['Start Now', 'Claim Offer', 'Try It Free']
      }
    },
    keyMetrics: ['CPA', 'LTV', 'Subscription Rate', 'Repeat Purchase Rate'],
    commonObjections: ['Skeptical of claims', 'Already taking something', 'Too expensive for daily use', 'Not sure it\'ll work for me'],
    proofTypes: ['Clinical studies', 'Doctor endorsements', 'Before/after', 'Lab test results', 'Customer transformation stories'],
    complianceNotes: 'Avoid disease claims. Use structure/function claims only. "Supports" not "cures". Disclaimers required.'
  },

  saas: {
    name: 'SaaS / Software',
    keywords: ['saas', 'software', 'app', 'platform', 'tool', 'api', 'dashboard', 'crm', 'automation', 'cloud', 'ai'],
    templates: {
      cold_traffic: {
        primary_text: [
          'Your team spends [number] hours per [time period] on [manual task]. [Product] automates it in [timeframe]. That\'s [number]+ hours back for [high-value activity]. [Number]+ teams already made the switch.',
          'We asked [number]+ [job titles] their biggest frustration. #1 answer: [pain point]. So we built [product] — the only [category] that [unique differentiator]. See why [notable company] switched.',
          'Stop paying for [number] tools that don\'t talk to each other. [Product] replaces [tool 1] + [tool 2] + [tool 3] in one platform. [Price comparison]. Start free.'
        ],
        headline: [
          '[Task] on Autopilot',
          'Replace [Number] Tools With One',
          'The [Category] Built for [Job Title]'
        ],
        description: [
          'Free trial. No credit card. Setup in [timeframe].',
          'Trusted by [number]+ companies including [notable name].',
          '[Percentage]% faster than [alternative]. See the demo.'
        ],
        cta: ['Start Free Trial', 'See Demo', 'Try Free', 'Get Started']
      },
      retargeting: {
        primary_text: [
          'You checked out [product]. Here\'s what happens when teams actually switch: [specific metric improvement]. Book a [timeframe] demo and see it with your own data.',
          'Still comparing options? Here\'s why [number]+ teams chose [product] over [competitor]: [differentiator 1], [differentiator 2], and [differentiator 3]. Plus, we migrate you for free.',
          '"[Testimonial about ROI or time savings]" — [Name], [Title] at [Company]. Your team deserves the same results. [Offer].'
        ],
        headline: [
          'See [Product] With Your Data',
          'Why [Number]+ Teams Switched',
          'Your Free Migration Awaits'
        ],
        description: [
          'Book a [timeframe] demo. No commitment.',
          '[Percentage]% of trials convert. See why.',
          'Special offer: [discount/bonus] for teams who start this [time period].'
        ],
        cta: ['Book Demo', 'Start Trial', 'Talk to Sales']
      }
    },
    keyMetrics: ['CAC', 'LTV', 'Trial-to-Paid %', 'Monthly Churn'],
    commonObjections: ['Integration concerns', 'Migration hassle', 'Team adoption', 'Security requirements', 'Already using competitor'],
    proofTypes: ['G2/Capterra reviews', 'Case studies with metrics', 'Logo walls', 'Security certifications']
  },

  education: {
    name: 'Education / Courses',
    keywords: ['course', 'education', 'training', 'coaching', 'workshop', 'masterclass', 'program', 'certification', 'learn', 'bootcamp'],
    templates: {
      cold_traffic: {
        primary_text: [
          'I spent [time/money] learning [skill] the hard way. If I could start over, I\'d want someone to hand me [the framework/system]. That\'s exactly what [program] is. [Number] students. [Outcome metric]. [Guarantee].',
          'The [industry] is changing fast. [Job title/role] who don\'t [key skill] will be left behind in [timeframe]. [Program] teaches you [skill] in [timeframe], even if you\'re starting from [starting point].',
          'Stop watching YouTube tutorials and hoping for the best. [Program] gives you the exact [framework/system] used by [notable practitioners/companies]. [Number]+ graduates. [Outcome].'
        ],
        headline: [
          'Learn [Skill] in [Timeframe]',
          'From [Starting Point] to [Outcome]',
          'The [Skill] Blueprint [Number]+ Use'
        ],
        description: [
          '[Number]+ graduates. [Average outcome]. Enroll today.',
          'Lifetime access. [Guarantee]. Start learning now.',
          'Next cohort starts [date]. [Number] spots remaining.'
        ],
        cta: ['Enroll Now', 'Start Learning', 'Join the Program', 'Get the Course']
      },
      retargeting: {
        primary_text: [
          '"Before [program], I was [struggle]. Now I [achievement]." — [Graduate name]. Enrollment closes [date]. Don\'t wait another [time period] to start.',
          'You watched the webinar. You read the testimonials. You know [program] works. The only question is: how much longer will you wait to [desired outcome]?',
          'Quick reminder: [program] enrollment closes [date]. After that, the price goes to [higher price]. Lock in [current price] and get [bonus] free.'
        ],
        headline: [
          'Enrollment Closes [Date]',
          'Your Future Self Will Thank You',
          'Last Chance: [Offer]'
        ],
        description: [
          '[Guarantee]. If you don\'t [outcome], get your money back.',
          '[Number] students can\'t be wrong. Join them.',
          'Save [amount] before [date]. Includes [bonus].'
        ],
        cta: ['Enroll Now', 'Claim Your Spot', 'Join Today']
      }
    },
    keyMetrics: ['Enrollment Rate', 'Completion Rate', 'Student Outcomes', 'NPS'],
    commonObjections: ['Too expensive', 'No time', 'Can learn free online', 'Not sure it\'ll work for my situation', 'Tried courses before'],
    proofTypes: ['Student transformations', 'Income/outcome metrics', 'Graduate testimonials', 'Before/after portfolios']
  },

  local_services: {
    name: 'Local Services',
    keywords: ['local', 'plumber', 'dentist', 'lawyer', 'contractor', 'salon', 'restaurant', 'clinic', 'repair', 'cleaning', 'landscaping', 'realtor'],
    templates: {
      cold_traffic: {
        primary_text: [
          'Looking for a [service] in [area] you can actually trust? [Number]+ [area] [residents/businesses] chose [company] because [differentiator]. [Rating] stars on [review platform]. Book your [consultation/estimate] — it\'s free.',
          '[Problem] in [area]? Don\'t call the first [service provider] you find on Google. [Number]+ of your neighbors trust [company] for [service]. Here\'s why: [differentiator]. [Offer].',
          'Most [service providers] in [area] charge you [pain point]. At [company], we [differentiator]. That\'s why [number]+ families choose us. [CTA with offer].'
        ],
        headline: [
          '[Area]\'s Most Trusted [Service]',
          'Free [Consultation/Estimate] Today',
          '[Rating] Stars From [Number]+ Reviews'
        ],
        description: [
          'Licensed, insured, [number]+ years experience. Call now.',
          'Same-day service available. [Offer]. Book online.',
          '[Number]+ 5-star reviews. Serving [area] since [year].'
        ],
        cta: ['Book Now', 'Get Free Quote', 'Call Now', 'Schedule Today']
      },
      retargeting: {
        primary_text: [
          'Still need [service]? [Company] has an opening [this week/today]. Book now and get [offer]. [Number]+ [area] families trust us.',
          'You were looking at [service] in [area]. Here\'s what [recent customer] said: "[Short review]." Ready to experience the same? [Offer].',
          'Don\'t put off [service] any longer — [consequence of waiting]. [Company] can fit you in [timeframe]. [Offer]. Call or book online.'
        ],
        headline: [
          'Opening Available [Timeframe]',
          'Don\'t Wait — Book Today',
          '[Offer] This [Time Period] Only'
        ],
        description: [
          'Limited availability. Book your spot before it\'s gone.',
          '[Guarantee]. If you\'re not happy, we\'ll make it right.',
          'Call [phone] or book online in 30 seconds.'
        ],
        cta: ['Book Now', 'Call Now', 'Get Quote']
      }
    },
    keyMetrics: ['Cost Per Lead', 'Booking Rate', 'Average Ticket', 'Customer Lifetime Value'],
    commonObjections: ['Price comparison', 'Trust/reliability', 'Scheduling flexibility', 'Quality concerns'],
    proofTypes: ['Google/Yelp reviews', 'Before/after photos', 'Local awards', 'Years in business', 'License/certification']
  },

  coaching: {
    name: 'Coaching / Consulting',
    keywords: ['coach', 'coaching', 'consulting', 'mentor', 'advisor', 'strategy', 'transformation', 'mindset', 'business coach', 'life coach'],
    templates: {
      cold_traffic: {
        primary_text: [
          'I\'ve helped [number]+ [target audience] go from [pain state] to [desired state]. The difference wasn\'t [common belief] — it was [unique mechanism]. In my [program/offer], I give you the exact [framework/system] I use with my [price point] clients. [Offer].',
          'You don\'t need another [common solution]. You need a [unique approach] that addresses WHY you\'re stuck. After [experience/credentials], I\'ve identified the [number] [barriers/patterns] that keep [target audience] from [goal]. [CTA].',
          'My clients don\'t pay me for [obvious deliverable]. They pay me because after [number] [time period] together, they [transformation]. Here\'s a free [resource] to get started.'
        ],
        headline: [
          'The [Skill/Outcome] Accelerator',
          'Stop [Pain]. Start [Desired State].',
          '[Number] [Target Audience] Transformed'
        ],
        description: [
          '[Number]+ success stories. [Guarantee]. Apply now.',
          'Free [resource/call]. No obligation. Real strategy.',
          'Limited to [number] clients per [time period]. Apply today.'
        ],
        cta: ['Apply Now', 'Book Free Call', 'Get Started', 'Watch Free Training']
      },
      retargeting: {
        primary_text: [
          'You watched my [content]. You know the [framework/method] works. The question is: will you keep trying to figure it out alone, or let me show you the shortcut? [Number] spots left this [time period].',
          '"[Transformation testimonial]" — [Client name]. You could be the next success story. Book your free strategy call before [deadline].',
          'I don\'t take everyone. But if you\'re a [ideal client description] who\'s ready to [desired outcome], I want to talk. [Number] spots open for [time period]. [CTA].'
        ],
        headline: [
          'Ready for Your Breakthrough?',
          '[Number] Spots Left This [Period]',
          'Your Strategy Call Awaits'
        ],
        description: [
          'Apply for a free strategy session. [Number] accepted per [period].',
          '[Guarantee]. Real results or [refund policy].',
          'Join [number]+ who\'ve made the leap.'
        ],
        cta: ['Apply Now', 'Book Call', 'Claim Your Spot']
      }
    },
    keyMetrics: ['Cost Per Application', 'Application-to-Close %', 'Client LTV', 'Referral Rate'],
    commonObjections: ['Can I do this myself?', 'Is this person legit?', 'What if it doesn\'t work for my situation?', 'Too expensive', 'Bad experience with coaches before'],
    proofTypes: ['Client transformation stories', 'Revenue/outcome screenshots', 'Video testimonials', 'Credentials/certifications', 'Media features']
  }
};

/**
 * Find the best industry match for a client
 */
export function matchIndustry(clientIndustry) {
  if (!clientIndustry) return null;
  const lower = clientIndustry.toLowerCase();

  for (const [key, industry] of Object.entries(INDUSTRY_TEMPLATES)) {
    if (industry.keywords.some(kw => lower.includes(kw))) {
      return { key, ...industry };
    }
  }
  return null;
}

/**
 * Get templates for a specific industry and traffic temperature
 */
export function getIndustryTemplates(industryKey, trafficTemp = 'cold_traffic') {
  const industry = INDUSTRY_TEMPLATES[industryKey];
  if (!industry) return null;
  return industry.templates[trafficTemp] || industry.templates.cold_traffic;
}

/**
 * Get all industry keys
 */
export function getIndustryKeys() {
  return Object.keys(INDUSTRY_TEMPLATES);
}
