import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { page_type, industry, conversion_goal } = req.query;

    if (!page_type) {
      return res.status(400).json({ success: false, error: 'page_type is required' });
    }

    // Get all matching templates
    const result = await sql`
      SELECT *
      FROM page_templates
      WHERE type = ${page_type}
        AND is_active = true
      ORDER BY times_used DESC, avg_conversion_rate DESC NULLS LAST
    `;

    let templates = result.rows;

    // Score templates based on match criteria
    const scoredTemplates = templates.map(template => {
      let score = template.times_used || 0;

      // Boost for industry match
      const industries = template.industries || [];
      if (industry && (industries.includes(industry) || industries.includes('all'))) {
        score += 50;
      }

      // Boost for conversion goal match
      const goals = template.conversion_goals || [];
      if (conversion_goal && goals.includes(conversion_goal)) {
        score += 30;
      }

      // Boost for higher conversion rate
      if (template.avg_conversion_rate) {
        score += template.avg_conversion_rate * 10;
      }

      return {
        ...template,
        recommendation_score: score,
        section_structure: template.section_structure || null,
        industries: industries,
        conversion_goals: goals
      };
    });

    // Sort by score and return top 5
    scoredTemplates.sort((a, b) => b.recommendation_score - a.recommendation_score);
    const recommendations = scoredTemplates.slice(0, 5);

    return res.status(200).json({
      success: true,
      recommendations,
      total_matching: templates.length
    });
  } catch (error) {
    console.error('Template recommendation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
