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
    const { email, name, phone, company, _variant_id, _session_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, ...otherFields } = req.body;

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.headers['x-real-ip'] || '';
    const ua = req.headers['user-agent'] || '';

    // Insert lead
    const { rows } = await sql`
      INSERT INTO leads (page_id, variant_id, email, name, phone, company, form_data, utm_source, utm_medium, utm_campaign, utm_term, utm_content, ip_address, user_agent, referrer)
      VALUES (${pageId}, ${_variant_id || null}, ${email || null}, ${name || null}, ${phone || null}, ${company || null}, ${JSON.stringify(otherFields)}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_term || null}, ${utm_content || null}, ${ip}, ${ua}, ${req.headers.referer || null})
      RETURNING id
    `;

    const leadId = rows[0].id;

    // Record conversion
    await sql`
      INSERT INTO conversions (page_id, variant_id, session_id, conversion_type, lead_id)
      VALUES (${pageId}, ${_variant_id || null}, ${_session_id || null}, 'form_submit', ${leadId})
    `;

    return res.status(200).json({
      success: true,
      lead_id: leadId,
      message: 'Thank you for your submission!'
    });
  } catch (error) {
    console.error('Submit Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
