import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      client_id,
      page_type,
      template_id,
      target_audience,
      offer_details,
      website_url  // URL to research
    } = req.body;

    if (!page_type) {
      return res.status(400).json({ success: false, error: 'page_type is required' });
    }

    // Validate client exists if provided
    if (client_id) {
      const clientResult = await sql`SELECT id, research_status FROM clients WHERE id = ${client_id}`;
      if (clientResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }
    }

    // Validate template exists if provided
    if (template_id) {
      const templateResult = await sql`SELECT id FROM page_templates WHERE id = ${template_id}`;
      if (templateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }
    }

    // Create new job
    const jobId = uuidv4();
    const now = new Date().toISOString();

    // Determine initial step based on what data exists
    let initialStep = 'strategy';

    // If no client, we'll need to do research first
    if (!client_id) {
      initialStep = 'research';
    } else {
      // Check if client has research
      const clientData = await sql`SELECT research_status FROM clients WHERE id = ${client_id}`;
      if (clientData.rows[0]?.research_status !== 'completed') {
        initialStep = 'research';
      }
    }

    const stepOutputs = {
      research: null,
      brand: null,
      strategy: null,
      copy: null,
      design: null,
      factcheck: null,
      assembly: null
    };

    // Store website_url in step_outputs for research step to use
    if (website_url) {
      stepOutputs._config = { website_url };
    }

    await sql`
      INSERT INTO page_generation_jobs (
        id, client_id, page_type, template_id, target_audience, offer_details,
        status, current_step, step_outputs, created_at, updated_at
      )
      VALUES (
        ${jobId},
        ${client_id || null},
        ${page_type},
        ${template_id || null},
        ${target_audience || null},
        ${offer_details || null},
        'pending',
        ${initialStep},
        ${JSON.stringify(stepOutputs)}::jsonb,
        ${now},
        ${now}
      )
    `;

    const result = await sql`SELECT * FROM page_generation_jobs WHERE id = ${jobId}`;

    return res.status(201).json({
      success: true,
      job: {
        ...result.rows[0],
        step_outputs: stepOutputs
      },
      next_step: initialStep,
      pipeline_steps: ['research', 'brand', 'strategy', 'copy', 'design', 'factcheck', 'assembly']
    });
  } catch (error) {
    console.error('Generate start error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
