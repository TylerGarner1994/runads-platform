import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    // Verify page exists
    const { rows: pages } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
    if (pages.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const page = pages[0];

    if (req.method === 'GET') {
      // Get all domains for this page
      const { rows: domains } = await sql`
        SELECT * FROM custom_domains WHERE page_id = ${id} ORDER BY created_at DESC
      `;
      return res.status(200).json({ domains });
    }

    if (req.method === 'POST') {
      const { domain, type } = req.body;

      if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
      }

      // Check if domain already exists
      const { rows: existing } = await sql`
        SELECT * FROM custom_domains WHERE domain = ${domain}
      `;

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Domain already in use' });
      }

      // Determine domain type
      const domainType = type || (domain.includes('pages.runads.com.au') ? 'subdomain' : 'custom');

      // Insert new domain
      await sql`
        INSERT INTO custom_domains (page_id, domain, domain_type, ssl_status, dns_configured)
        VALUES (${id}, ${domain}, ${domainType}, ${domainType === 'subdomain' ? 'active' : 'pending'}, ${domainType === 'subdomain' ? 1 : 0})
      `;

      // Update the page's custom_domain field if it's not set
      if (!page.custom_domain) {
        await sql`UPDATE landing_pages SET custom_domain = ${domain} WHERE id = ${id}`;
      }

      const { rows: newDomain } = await sql`
        SELECT * FROM custom_domains WHERE domain = ${domain}
      `;

      return res.status(201).json({
        success: true,
        domain: newDomain[0],
        message: domainType === 'subdomain'
          ? 'Subdomain configured successfully'
          : 'Custom domain added. Please configure your DNS.'
      });
    }

    if (req.method === 'DELETE') {
      const { domain } = req.body;

      if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
      }

      // Delete the domain
      await sql`DELETE FROM custom_domains WHERE page_id = ${id} AND domain = ${domain}`;

      // If this was the page's primary custom_domain, clear it
      if (page.custom_domain === domain) {
        // Try to set another domain as primary, or null
        const { rows: remaining } = await sql`
          SELECT domain FROM custom_domains WHERE page_id = ${id} LIMIT 1
        `;
        const newPrimary = remaining.length > 0 ? remaining[0].domain : null;
        await sql`UPDATE landing_pages SET custom_domain = ${newPrimary} WHERE id = ${id}`;
      }

      return res.status(200).json({ success: true, message: 'Domain removed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Domain API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
