import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // List all custom domains across all pages
      const { rows: domains } = await sql`
        SELECT
          cd.*,
          lp.name as page_name,
          lp.slug as page_slug
        FROM custom_domains cd
        LEFT JOIN landing_pages lp ON lp.id = cd.page_id
        ORDER BY cd.created_at DESC
      `;

      return res.status(200).json({
        success: true,
        domains,
        count: domains.length
      });
    }

    if (req.method === 'POST') {
      const { domain, page_id, type } = req.body;

      if (!domain) {
        return res.status(400).json({ success: false, error: 'Domain is required' });
      }

      // Check if domain already exists
      const { rows: existing } = await sql`
        SELECT * FROM custom_domains WHERE domain = ${domain}
      `;

      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Domain already in use' });
      }

      // If page_id provided, verify it exists
      if (page_id) {
        const { rows: pages } = await sql`SELECT id FROM landing_pages WHERE id = ${page_id}`;
        if (pages.length === 0) {
          return res.status(400).json({ success: false, error: 'Page not found' });
        }
      }

      // Determine domain type
      const domainType = type || (domain.includes('pages.runads.com.au') ? 'subdomain' : 'custom');

      // Insert domain
      await sql`
        INSERT INTO custom_domains (page_id, domain, domain_type, ssl_status, dns_configured)
        VALUES (${page_id || null}, ${domain}, ${domainType}, ${domainType === 'subdomain' ? 'active' : 'pending'}, ${domainType === 'subdomain'})
      `;

      const { rows: newDomain } = await sql`
        SELECT cd.*, lp.name as page_name, lp.slug as page_slug
        FROM custom_domains cd
        LEFT JOIN landing_pages lp ON lp.id = cd.page_id
        WHERE cd.domain = ${domain}
      `;

      return res.status(201).json({
        success: true,
        domain: newDomain[0],
        message: domainType === 'subdomain'
          ? 'Subdomain configured successfully'
          : 'Custom domain added. Please configure your DNS CNAME record to point to cname.vercel-dns.com'
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Domain ID is required' });
      }

      // Get domain info before deleting
      const { rows: domainRows } = await sql`SELECT * FROM custom_domains WHERE id = ${id}`;
      if (domainRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Domain not found' });
      }

      const domainRecord = domainRows[0];

      // Delete the domain
      await sql`DELETE FROM custom_domains WHERE id = ${id}`;

      // If this was a page's primary domain, clear it
      if (domainRecord.page_id) {
        const { rows: pages } = await sql`
          SELECT custom_domain FROM landing_pages WHERE id = ${domainRecord.page_id}
        `;
        if (pages.length > 0 && pages[0].custom_domain === domainRecord.domain) {
          const { rows: remaining } = await sql`
            SELECT domain FROM custom_domains WHERE page_id = ${domainRecord.page_id} LIMIT 1
          `;
          const newPrimary = remaining.length > 0 ? remaining[0].domain : null;
          await sql`UPDATE landing_pages SET custom_domain = ${newPrimary} WHERE id = ${domainRecord.page_id}`;
        }
      }

      return res.status(200).json({ success: true, message: 'Domain removed' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Domains API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
