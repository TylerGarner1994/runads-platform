import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { jobId } = req.query;

  if (!jobId) {
    return res.status(400).json({ success: false, error: 'Job ID is required' });
  }

  try {
    const result = await sql`
      SELECT
        j.*,
        c.name as client_name,
        c.website_url as client_website,
        t.name as template_name
      FROM page_generation_jobs j
      LEFT JOIN clients c ON c.id = j.client_id
      LEFT JOIN page_templates t ON t.id = j.template_id
      WHERE j.id = ${jobId}
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const job = result.rows[0];
    const stepOutputs = job.step_outputs || {};

    // Determine completed steps and progress
    const allSteps = ['research', 'brand', 'strategy', 'copy', 'design', 'factcheck', 'assembly'];
    const completedSteps = allSteps.filter(step => stepOutputs[step] !== null);
    const progress = Math.round((completedSteps.length / allSteps.length) * 100);

    // Determine next step
    let nextStep = null;
    if (job.status !== 'completed' && job.status !== 'failed') {
      const currentIndex = allSteps.indexOf(job.current_step);
      if (currentIndex < allSteps.length - 1) {
        nextStep = allSteps[currentIndex + 1];
      }
    }

    return res.status(200).json({
      success: true,
      job: {
        ...job,
        step_outputs: stepOutputs
      },
      progress: {
        percentage: progress,
        completed_steps: completedSteps,
        current_step: job.current_step,
        next_step: nextStep,
        all_steps: allSteps
      }
    });
  } catch (error) {
    console.error('Job status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
