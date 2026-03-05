import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'Brief ID is required' });

  try {
    if (req.method === 'GET') {
      const result = await sql`SELECT cb.*, c.name as client_name FROM campaign_briefs cb LEFT JOIN clients c ON cb.client_id = c.id WHERE cb.id = ${id}`;
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Brief not found' });
      return res.status(200).json({ success: true, brief: result.rows[0] });
    }

    if (req.method === 'PUT') {
      const { name, status, objective, budget, timeline, target_audience, messaging, platforms, landing_page_id, ad_sets } = req.body;
      const now = new Date().toISOString();

      await sql`
        UPDATE campaign_briefs SET
          name = COALESCE(${name || null}, name),
          status = COALESCE(${status || null}, status),
          objective = COALESCE(${objective || null}, objective),
          budget = COALESCE(${budget ? JSON.stringify(budget) : null}::jsonb, budget),
          timeline = COALESCE(${timeline ? JSON.stringify(timeline) : null}::jsonb, timeline),
          target_audience = COALESCE(${target_audience ? JSON.stringify(target_audience) : null}::jsonb, target_audience),
          messaging = COALESCE(${messaging ? JSON.stringify(messaging) : null}::jsonb, messaging),
          platforms = COALESCE(${platforms ? JSON.stringify(platforms) : null}::jsonb, platforms),
          landing_page_id = COALESCE(${landing_page_id || null}, landing_page_id),
          ad_sets = COALESCE(${ad_sets ? JSON.stringify(ad_sets) : null}::jsonb, ad_sets),
          updated_at = ${now}
        WHERE id = ${id}
      `;

      const result = await sql`SELECT cb.*, c.name as client_name FROM campaign_briefs cb LEFT JOIN clients c ON cb.client_id = c.id WHERE cb.id = ${id}`;
      return res.status(200).json({ success: true, brief: result.rows[0] });
    }

    if (req.method === 'DELETE') {
      const result = await sql`DELETE FROM campaign_briefs WHERE id = ${id} RETURNING id`;
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Brief not found' });
      return res.status(200).json({ success: true, message: 'Brief deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Brief API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
