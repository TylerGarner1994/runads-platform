import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // List all templates with optional filtering
      const { type, industry, active_only } = req.query;

      // Get all active templates
      const result = await sql`
        SELECT *
        FROM page_templates
        WHERE is_active = true
        ORDER BY times_used DESC, created_at DESC
      `;

      let templates = result.rows;

      // Filter by type if specified
      if (type) {
        templates = templates.filter(t => t.type === type);
      }

      // Filter by industry if specified
      if (industry) {
        templates = templates.filter(t => {
          const industries = t.industries || [];
          return industries.includes(industry) || industries.includes('all');
        });
      }

      return res.status(200).json({
        success: true,
        templates: templates.map(t => ({
          ...t,
          section_structure: t.section_structure || null,
          industries: t.industries || [],
          conversion_goals: t.conversion_goals || []
        }))
      });
    }

    if (req.method === 'POST') {
      // Create new template
      const {
        name,
        type,
        description,
        section_structure,
        html_skeleton,
        css_base,
        industries,
        conversion_goals
      } = req.body;

      if (!name || !type) {
        return res.status(400).json({ success: false, error: 'Name and type are required' });
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      await sql`
        INSERT INTO page_templates (
          id, name, type, description, section_structure, html_skeleton, css_base,
          industries, conversion_goals, is_active, created_at, updated_at
        )
        VALUES (
          ${id},
          ${name},
          ${type},
          ${description || null},
          ${section_structure ? JSON.stringify(section_structure) : null}::jsonb,
          ${html_skeleton || null},
          ${css_base || null},
          ${industries ? JSON.stringify(industries) : '[]'}::jsonb,
          ${conversion_goals ? JSON.stringify(conversion_goals) : '[]'}::jsonb,
          true,
          ${now},
          ${now}
        )
      `;

      const result = await sql`SELECT * FROM page_templates WHERE id = ${id}`;

      return res.status(201).json({
        success: true,
        template: result.rows[0]
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Templates API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
