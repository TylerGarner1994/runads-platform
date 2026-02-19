import { sql } from '@vercel/postgres';
import { nanoid } from 'nanoid';
import { injectTrackingScript } from '../../lib/tracking.js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all pages with stats - exclude html_content for performance
      const { rows } = await sql`
        SELECT
          lp.id, lp.name, lp.slug, lp.client_id, lp.client_name, lp.status,
          lp.page_type, lp.template_type, lp.views, lp.leads,
          lp.custom_domain, lp.meta_title, lp.meta_description, lp.og_image,
          lp.created_at, lp.updated_at, lp.deployed_at,
          lp.generation_metadata, lp.job_id, lp.tracking_pixel,
          (SELECT COUNT(*) FROM page_views WHERE page_id = lp.id) as view_count,
          (SELECT COUNT(*) FROM leads WHERE page_id = lp.id) as lead_count,
          (SELECT COUNT(*) FROM conversions WHERE page_id = lp.id) as conversion_count
        FROM landing_pages lp
        ORDER BY created_at DESC
      `;

      // Add computed fields the frontend expects
      const pages = rows.map(page => ({
        ...page,
        url: `/p/${page.slug}`,
        clientName: page.client_name || '',
        ab_test_active: false,
        generation_job_id: page.job_id || null,
        factcheck_score: page.generation_metadata?.fact_check_summary?.verified || null,
        expert_scores: {},
        variants: []
      }));

      return res.status(200).json(pages);
    }

    if (req.method === 'POST') {
      const { name, slug, client_name, html_content, client_id, page_type, template_type, meta_title, meta_description, tracking_pixel } = req.body;

      if (!name || !html_content) {
        return res.status(400).json({ error: 'Name and HTML content are required' });
      }

      const id = nanoid(10);
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const processedHtml = injectTrackingScript(html_content, id);

      await sql`
        INSERT INTO landing_pages (id, name, slug, client_name, client_id, page_type, template_type, html_content, meta_title, meta_description, tracking_pixel)
        VALUES (${id}, ${name}, ${finalSlug}, ${client_name || null}, ${client_id || null}, ${page_type || 'custom'}, ${template_type || null}, ${processedHtml}, ${meta_title || name || null}, ${meta_description || null}, ${tracking_pixel || null})
      `;

      const { rows } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
      return res.status(201).json({ id, slug: finalSlug, message: 'Page created' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    if (error.message?.includes('duplicate key')) {
      return res.status(400).json({ error: 'A page with this slug already exists' });
    }
    return res.status(500).json({ error: error.message });
  }
}
