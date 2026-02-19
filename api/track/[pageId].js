import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageId } = req.query;

  try {
    const { variant_id, session_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = req.body;

    const ua = req.headers['user-agent'] || '';
    const deviceType = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop';
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.headers['x-real-ip'] || '';

    await sql`
      INSERT INTO page_views (page_id, variant_id, session_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, ip_address, user_agent, referrer, device_type)
      VALUES (${pageId}, ${variant_id || null}, ${session_id || null}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_term || null}, ${utm_content || null}, ${ip}, ${ua}, ${req.headers.referer || null}, ${deviceType})
    `;

    return res.status(200).json({ tracked: true });
  } catch (error) {
    console.error('Track Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
