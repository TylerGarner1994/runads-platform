import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'Page ID required' });

  try {
    if (req.method === 'POST') {
      const { action, traffic_split } = req.body;

      if (action === 'start') {
        const page = await sql`SELECT variants FROM landing_pages WHERE id = ${id}`;
        if (!page.rows[0]) return res.status(404).json({ success: false, error: 'Page not found' });

        const variants = page.rows[0].variants || [];
        if (variants.length === 0) return res.status(400).json({ success: false, error: 'No variants to test' });

        const now = new Date().toISOString();
        await sql`
          UPDATE landing_pages SET
            ab_test_active = true,
            generation_metadata = jsonb_set(
              COALESCE(generation_metadata, '{}'::jsonb),
              '{ab_test}',
              ${JSON.stringify({ started_at: now, traffic_split: traffic_split || { control: 50, variant: 50 } })}::jsonb
            ),
            updated_at = ${now}
          WHERE id = ${id}
        `;
        return res.status(200).json({ success: true, message: 'A/B test started' });
      }

      if (action === 'stop') {
        const now = new Date().toISOString();
        await sql`
          UPDATE landing_pages SET ab_test_active = false, updated_at = ${now} WHERE id = ${id}
        `;
        return res.status(200).json({ success: true, message: 'A/B test stopped' });
      }

      return res.status(400).json({ success: false, error: 'action must be start or stop' });
    }

    if (req.method === 'GET') {
      const page = await sql`SELECT id, name, ab_test_active, variants, generation_metadata FROM landing_pages WHERE id = ${id}`;
      if (!page.rows[0]) return res.status(404).json({ success: false, error: 'Page not found' });

      const views = await sql`
        SELECT variant_id, COUNT(*) as view_count
        FROM page_views WHERE page_id = ${id}
        GROUP BY variant_id
      `;

      const conversions = await sql`
        SELECT variant_id, COUNT(*) as conversion_count
        FROM conversions WHERE page_id = ${id}
        GROUP BY variant_id
      `;

      const viewMap = {};
      views.rows.forEach(r => { viewMap[r.variant_id || 'control'] = parseInt(r.view_count); });
      const convMap = {};
      conversions.rows.forEach(r => { convMap[r.variant_id || 'control'] = parseInt(r.conversion_count); });

      const results = {
        control: {
          views: viewMap['control'] || viewMap[null] || 0,
          conversions: convMap['control'] || convMap[null] || 0
        }
      };
      results.control.conversion_rate = results.control.views > 0
        ? ((results.control.conversions / results.control.views) * 100).toFixed(2)
        : '0.00';

      (page.rows[0].variants || []).forEach(v => {
        results[v.id] = {
          name: v.name,
          views: viewMap[v.id] || 0,
          conversions: convMap[v.id] || 0
        };
        results[v.id].conversion_rate = results[v.id].views > 0
          ? ((results[v.id].conversions / results[v.id].views) * 100).toFixed(2)
          : '0.00';
      });

      return res.status(200).json({
        success: true,
        page_id: id,
        ab_test_active: page.rows[0].ab_test_active || false,
        test_config: page.rows[0].generation_metadata?.ab_test || null,
        results
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('A/B test error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
