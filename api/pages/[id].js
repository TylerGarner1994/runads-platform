import { sql } from '@vercel/postgres';
import { injectTrackingScript } from '../../lib/tracking.js';
import { deletePage as deleteFromGitHub } from '../../lib/github.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const { name, slug, client_name, html_content, meta_title, meta_description, tracking_pixel, status } = req.body;

      const { rows: existing } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }

      let processedHtml = html_content || existing[0].html_content;
      if (html_content && html_content !== existing[0].html_content) {
        processedHtml = injectTrackingScript(html_content, id);
      }

      await sql`
        UPDATE landing_pages SET
          name = ${name || existing[0].name},
          slug = ${slug || existing[0].slug},
          client_name = ${client_name ?? existing[0].client_name},
          html_content = ${processedHtml},
          meta_title = ${meta_title ?? existing[0].meta_title},
          meta_description = ${meta_description ?? existing[0].meta_description},
          tracking_pixel = ${tracking_pixel ?? existing[0].tracking_pixel},
          status = ${status || existing[0].status},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      const { rows } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const { rows } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const page = rows[0];

      // Try to delete from GitHub if deployed
      if (page.status === 'live' && process.env.GITHUB_TOKEN) {
        try {
          await deleteFromGitHub(page.slug);
        } catch (error) {
          console.log('Could not delete from GitHub:', error.message);
        }
      }

      await sql`DELETE FROM landing_pages WHERE id = ${id}`;
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
