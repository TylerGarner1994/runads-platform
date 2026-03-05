import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { client_id } = req.query;
      let result;
      if (client_id) {
        result = await sql`SELECT cb.*, c.name as client_name FROM campaign_briefs cb LEFT JOIN clients c ON cb.client_id = c.id WHERE cb.client_id = ${client_id} ORDER BY cb.updated_at DESC`;
      } else {
        result = await sql`SELECT cb.*, c.name as client_name FROM campaign_briefs cb LEFT JOIN clients c ON cb.client_id = c.id ORDER BY cb.updated_at DESC`;
      }
      return res.status(200).json({ success: true, briefs: result.rows });
    }

    if (req.method === 'POST') {
      const { client_id, name, objective, budget, timeline, target_audience, messaging, platforms, landing_page_id } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });

      const id = uuidv4();
      const now = new Date().toISOString();
      await sql`
        INSERT INTO campaign_briefs (id, client_id, name, objective, budget, timeline, target_audience, messaging, platforms, landing_page_id, created_at, updated_at)
        VALUES (${id}, ${client_id || null}, ${name}, ${objective || null}, ${JSON.stringify(budget || {})}::jsonb, ${JSON.stringify(timeline || {})}::jsonb, ${JSON.stringify(target_audience || [])}::jsonb, ${JSON.stringify(messaging || {})}::jsonb, ${JSON.stringify(platforms || [])}::jsonb, ${landing_page_id || null}, ${now}, ${now})
      `;

      const result = await sql`SELECT * FROM campaign_briefs WHERE id = ${id}`;
      return res.status(201).json({ success: true, brief: result.rows[0] });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Briefs API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
