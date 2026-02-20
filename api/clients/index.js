import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // List all clients
      const { rows } = await sql`
        SELECT
          c.*,
          (SELECT COUNT(*) FROM landing_pages WHERE client_id = c.id) as page_count,
          (SELECT COUNT(*) FROM verified_claims WHERE client_id = c.id) as claim_count
        FROM clients c
        ORDER BY c.created_at DESC
      `;

      // Parse JSON fields for each client
      const clients = rows.map(row => ({
        ...row,
        business_research: typeof row.business_research === 'string'
          ? (() => { try { return JSON.parse(row.business_research); } catch(e) { return {}; } })()
          : row.business_research || {},
        claims: typeof row.claims === 'string'
          ? (() => { try { return JSON.parse(row.claims); } catch(e) { return []; } })()
          : row.claims || [],
        testimonials_data: typeof row.testimonials_data === 'string'
          ? (() => { try { return JSON.parse(row.testimonials_data); } catch(e) { return []; } })()
          : row.testimonials_data || [],
        products_data: typeof row.products_data === 'string'
          ? (() => { try { return JSON.parse(row.products_data); } catch(e) { return []; } })()
          : row.products_data || [],
        audiences: typeof row.audiences === 'string'
          ? (() => { try { return JSON.parse(row.audiences); } catch(e) { return []; } })()
          : row.audiences || []
      }));

      return res.status(200).json({
        success: true,
        clients
      });
    }

    if (req.method === 'POST') {
      // Create new client
      const { name, website_url, industry } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }

      // Normalize URL - ensure protocol prefix
      let normalizedUrl = website_url ? website_url.trim() : null;
      if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      await sql`
        INSERT INTO clients (id, name, website_url, industry, created_at, updated_at)
        VALUES (${id}, ${name}, ${normalizedUrl}, ${industry || null}, ${now}, ${now})
      `;

      const { rows } = await sql`SELECT * FROM clients WHERE id = ${id}`;
      const newClient = rows[0];

      // Auto-trigger research if client has a website URL
      if (normalizedUrl) {
        // Fire-and-forget: trigger research in the background
        // Don't await — let it run async so client creation returns fast
        const baseUrl = `https://${req.headers.host}`;
        fetch(`${baseUrl}/api/clients/${id}/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).then(r => {
          if (r.ok) console.log(`[Auto-Research] Started for ${name} (${id})`);
          else console.warn(`[Auto-Research] Failed to trigger for ${id}: ${r.status}`);
        }).catch(err => {
          console.warn(`[Auto-Research] Error triggering for ${id}:`, err.message);
        });

        // Mark research as pending so the UI knows it's running
        await sql`UPDATE clients SET research_status = 'pending' WHERE id = ${id}`;
        newClient.research_status = 'pending';
      }

      return res.status(201).json({
        success: true,
        client: newClient,
        research_triggered: !!normalizedUrl
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Clients API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
