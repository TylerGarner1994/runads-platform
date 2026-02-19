import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const { rows } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const page = rows[0];

    // Simply mark as live - page is served directly from database via /p/[slug]
    await sql`UPDATE landing_pages SET status = 'live', deployed_at = CURRENT_TIMESTAMP WHERE id = ${id}`;

    // Use configured base URL or default to runads platform
    const baseUrl = process.env.PAGES_BASE_URL || 'https://runads-platform.vercel.app';
    const liveUrl = `${baseUrl}/p/${page.slug}`;

    const { rows: updated } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;

    return res.status(200).json({
      deployed: true,
      liveUrl,
      page: updated[0]
    });
  } catch (error) {
    console.error('Deploy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
