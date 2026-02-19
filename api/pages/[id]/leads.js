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
    const { rows } = await sql`
      SELECT * FROM leads WHERE page_id = ${id} ORDER BY created_at DESC
    `;
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Leads Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
