import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Client ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get single client
      const { rows: clients } = await sql`SELECT * FROM clients WHERE id = ${id}`;

      if (clients.length === 0) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      const client = clients[0];

      // Parse JSON fields
      if (typeof client.business_research === 'string') {
        try { client.business_research = JSON.parse(client.business_research); } catch(e) { client.business_research = {}; }
      }
      client.business_research = client.business_research || {};

      if (typeof client.source_content === 'string') {
        try { client.source_content = JSON.parse(client.source_content); } catch(e) { client.source_content = {}; }
      }

      // Get brand guide
      const { rows: brandGuides } = await sql`
        SELECT * FROM brand_style_guides WHERE client_id = ${id} LIMIT 1
      `;

      // Get verified claims
      const { rows: verifiedClaims } = await sql`
        SELECT * FROM verified_claims WHERE client_id = ${id} ORDER BY created_at DESC
      `;

      // Get landing pages
      const { rows: landingPages } = await sql`
        SELECT id, name, slug, status, page_type, created_at
        FROM landing_pages WHERE client_id = ${id}
        ORDER BY created_at DESC
      `;

      // Get recent jobs (if table exists)
      let recentJobs = [];
      try {
        const { rows: jobs } = await sql`
          SELECT * FROM page_generation_jobs WHERE client_id = ${id}
          ORDER BY created_at DESC LIMIT 10
        `;
        recentJobs = jobs;
      } catch (e) {
        // Table might not exist yet
      }

      return res.status(200).json({
        success: true,
        client,
        brand_guide: brandGuides[0] || null,
        verified_claims: verifiedClaims,
        landing_pages: landingPages,
        recent_jobs: recentJobs
      });
    }

    if (req.method === 'PUT') {
      // Update client
      const { name, website_url, industry, business_research, verified_facts, testimonials, research_status } = req.body;

      // Normalize URL - ensure protocol prefix
      let normalizedUrl = website_url ? website_url.trim() : null;
      if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      const now = new Date().toISOString();

      await sql`
        UPDATE clients
        SET name = COALESCE(${name || null}, name),
            website_url = COALESCE(${normalizedUrl}, website_url),
            industry = COALESCE(${industry || null}, industry),
            business_research = COALESCE(${business_research ? JSON.stringify(business_research) : null}, business_research),
            research_status = COALESCE(${research_status || null}, research_status),
            updated_at = ${now}
        WHERE id = ${id}
      `;

      // Fetch updated client
      const { rows: updatedClients } = await sql`SELECT * FROM clients WHERE id = ${id}`;
      const client = updatedClients[0];

      if (client && typeof client.business_research === 'string') {
        try { client.business_research = JSON.parse(client.business_research); } catch(e) { client.business_research = {}; }
      }

      return res.status(200).json({
        success: true,
        client
      });
    }

    if (req.method === 'DELETE') {
      // Delete verified claims first (foreign key)
      await sql`DELETE FROM verified_claims WHERE client_id = ${id}`;

      // Delete brand guide (foreign key)
      await sql`DELETE FROM brand_style_guides WHERE client_id = ${id}`;

      // Delete the client
      await sql`DELETE FROM clients WHERE id = ${id}`;

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
