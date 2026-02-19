import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // Total views
    const { rows: viewRows } = await sql`SELECT COUNT(*) as count FROM page_views WHERE page_id = ${id}`;
    const totalViews = parseInt(viewRows[0].count);

    // Total leads
    const { rows: leadRows } = await sql`SELECT COUNT(*) as count FROM leads WHERE page_id = ${id}`;
    const totalLeads = parseInt(leadRows[0].count);

    // Total conversions
    const { rows: convRows } = await sql`SELECT COUNT(*) as count FROM conversions WHERE page_id = ${id}`;
    const totalConversions = parseInt(convRows[0].count);

    // Views by day
    const { rows: viewsByDay } = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as views
      FROM page_views WHERE page_id = ${id}
      GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30
    `;

    // Views by source
    const { rows: viewsBySource } = await sql`
      SELECT COALESCE(utm_source, 'direct') as source, COUNT(*) as views
      FROM page_views WHERE page_id = ${id}
      GROUP BY utm_source ORDER BY views DESC LIMIT 10
    `;

    // Views by device
    const { rows: viewsByDevice } = await sql`
      SELECT device_type, COUNT(*) as views
      FROM page_views WHERE page_id = ${id}
      GROUP BY device_type
    `;

    const conversionRate = totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(2) : 0;

    return res.status(200).json({
      summary: {
        total_views: totalViews,
        total_leads: totalLeads,
        total_conversions: totalConversions,
        conversion_rate: conversionRate
      },
      views_by_day: viewsByDay,
      views_by_source: viewsBySource,
      views_by_device: viewsByDevice
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
