import db, { query } from '../../lib/database.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (\!id) {
    return res.status(400).json({ success: false, error: 'Client ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get single client with all related data
      const client = await db.getClientById(id);

      if (\!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      // Get brand guide
      const brandResult = await query(
        'SELECT * FROM brand_style_guides WHERE client_id = $1',
        [id]
      );

      // Get verified claims
      const claimsResult = await query(
        'SELECT * FROM verified_claims WHERE client_id = $1 ORDER BY created_at DESC',
        [id]
      );

      // Get landing pages
      const pagesResult = await query(
        'SELECT id, name, slug, status, created_at FROM landing_pages WHERE client_id = $1 ORDER BY created_at DESC',
        [id]
      );

      // Get recent jobs (if table exists)
      let jobsResult = { rows: [] };
      try {
        jobsResult = await query(
          'SELECT * FROM page_generation_jobs WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10',
          [id]
        );
      } catch (e) {
        // Table might not exist in SQLite
      }

      return res.status(200).json({
        success: true,
        client,
        brand_guide: brandResult.rows[0] || null,
        verified_claims: claimsResult.rows,
        landing_pages: pagesResult.rows,
        recent_jobs: jobsResult.rows
      });
    }

    if (req.method === 'PUT') {
      // Update client
      const { name, website_url, industry, business_research, verified_facts, testimonials, research_status } = req.body;

      const client = await db.updateClient(id, {
        name,
        website_url,
        industry,
        business_research,
        verified_facts,
        testimonials,
        research_status
      });

      return res.status(200).json({
        success: true,
        client
      });
    }

    if (req.method === 'DELETE') {
      // Delete client (cascades to brand_guide, verified_claims)
      await query('DELETE FROM clients WHERE id = $1', [id]);

      return res.status(200).json({
        success: true,
        message: 'Client deleted successfully'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Client API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
