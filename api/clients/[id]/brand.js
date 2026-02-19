import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query; // client_id

  if (!id) {
    return res.status(400).json({ success: false, error: 'Client ID is required' });
  }

  try {
    // Verify client exists
    const clientResult = await sql`SELECT id FROM clients WHERE id = ${id}`;
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    if (req.method === 'GET') {
      // Get brand guide for this client
      const result = await sql`
        SELECT * FROM brand_style_guides WHERE client_id = ${id}
      `;

      return res.status(200).json({
        success: true,
        brand_guide: result.rows[0] || null
      });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      // Update or create brand guide
      const {
        primary_color,
        secondary_color,
        accent_color,
        background_color,
        text_color,
        heading_font,
        body_font,
        font_weights,
        font_sizes,
        border_radius,
        spacing_unit,
        max_width,
        button_style,
        card_style,
        brand_voice,
        tone_keywords
      } = req.body;

      const now = new Date().toISOString();

      // Check if brand guide exists
      const existingResult = await sql`SELECT id FROM brand_style_guides WHERE client_id = ${id}`;

      if (existingResult.rows.length > 0) {
        // Update existing
        await sql`
          UPDATE brand_style_guides
          SET
            primary_color = COALESCE(${primary_color}, primary_color),
            secondary_color = COALESCE(${secondary_color}, secondary_color),
            accent_color = COALESCE(${accent_color}, accent_color),
            background_color = COALESCE(${background_color}, background_color),
            text_color = COALESCE(${text_color}, text_color),
            heading_font = COALESCE(${heading_font}, heading_font),
            body_font = COALESCE(${body_font}, body_font),
            font_weights = COALESCE(${font_weights ? JSON.stringify(font_weights) : null}::jsonb, font_weights),
            font_sizes = COALESCE(${font_sizes ? JSON.stringify(font_sizes) : null}::jsonb, font_sizes),
            border_radius = COALESCE(${border_radius}, border_radius),
            spacing_unit = COALESCE(${spacing_unit}, spacing_unit),
            max_width = COALESCE(${max_width}, max_width),
            button_style = COALESCE(${button_style ? JSON.stringify(button_style) : null}::jsonb, button_style),
            card_style = COALESCE(${card_style ? JSON.stringify(card_style) : null}::jsonb, card_style),
            brand_voice = COALESCE(${brand_voice}, brand_voice),
            tone_keywords = COALESCE(${tone_keywords ? JSON.stringify(tone_keywords) : null}::jsonb, tone_keywords),
            updated_at = ${now}
          WHERE client_id = ${id}
        `;
      } else {
        // Create new
        const brandGuideId = uuidv4();
        await sql`
          INSERT INTO brand_style_guides (
            id, client_id, primary_color, secondary_color, accent_color, background_color, text_color,
            heading_font, body_font, font_weights, font_sizes, border_radius, spacing_unit, max_width,
            button_style, card_style, brand_voice, tone_keywords, created_at, updated_at
          )
          VALUES (
            ${brandGuideId}, ${id},
            ${primary_color || null},
            ${secondary_color || null},
            ${accent_color || null},
            ${background_color || '#ffffff'},
            ${text_color || '#1f2937'},
            ${heading_font || 'system-ui, -apple-system, sans-serif'},
            ${body_font || 'system-ui, -apple-system, sans-serif'},
            ${font_weights ? JSON.stringify(font_weights) : '{}'}::jsonb,
            ${font_sizes ? JSON.stringify(font_sizes) : '{}'}::jsonb,
            ${border_radius || '8px'},
            ${spacing_unit || '4px'},
            ${max_width || '1200px'},
            ${button_style ? JSON.stringify(button_style) : '{}'}::jsonb,
            ${card_style ? JSON.stringify(card_style) : '{}'}::jsonb,
            ${brand_voice || null},
            ${tone_keywords ? JSON.stringify(tone_keywords) : '[]'}::jsonb,
            ${now}, ${now}
          )
        `;
      }

      // Return updated brand guide
      const result = await sql`SELECT * FROM brand_style_guides WHERE client_id = ${id}`;

      return res.status(200).json({
        success: true,
        brand_guide: result.rows[0]
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Brand guide API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
