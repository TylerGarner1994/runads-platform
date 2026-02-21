import { sql } from '@vercel/postgres';

// Import step handlers
import { runResearchStep } from '../../../generate/steps/research.js';
import { runBrandStep } from '../../../generate/steps/brand-extract.js';
import { runStrategyStep } from '../../../generate/steps/strategy.js';
import { runCopyStep } from '../../../generate/steps/copy.js';
import { runDesignStep } from '../../../generate/steps/design.js';
import { runFactcheckStep } from '../../../generate/steps/factcheck.js';
import { runAssemblyStep } from '../../../generate/steps/assembly.js';

const STEP_HANDLERS = {
  research: runResearchStep,
  brand: runBrandStep,
  strategy: runStrategyStep,
  copy: runCopyStep,
  design: runDesignStep,
  factcheck: runFactcheckStep,
  assembly: runAssemblyStep
};

const STEP_ORDER = ['research', 'brand', 'strategy', 'copy', 'design', 'factcheck', 'assembly'];

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

  const { jobId, stepName } = req.query;

  if (!jobId || !stepName) {
    return res.status(400).json({ success: false, error: 'Job ID and step name are required' });
  }

  if (!STEP_HANDLERS[stepName]) {
    return res.status(400).json({
      success: false,
      error: `Invalid step name: ${stepName}. Valid steps: ${STEP_ORDER.join(', ')}`
    });
  }

  try {
    // Get the job - use specific columns to avoid JOIN overwrites
    const jobResult = await sql`
      SELECT
        j.id as job_id,
        j.client_id,
        j.page_id,
        j.page_type,
        j.template_id,
        j.target_audience,
        j.offer_details,
        j.status,
        j.current_step,
        j.step_outputs,
        j.error_message,
        j.tokens_used,
        j.estimated_cost,
        c.name as client_name,
        c.website_url,
        c.business_research,
        c.source_content,
        bsg.id as brand_guide_id,
        bsg.primary_color,
        bsg.secondary_color,
        bsg.heading_font,
        bsg.body_font,
        bsg.brand_voice
      FROM page_generation_jobs j
      LEFT JOIN clients c ON c.id = j.client_id
      LEFT JOIN brand_style_guides bsg ON bsg.client_id = c.id
      WHERE j.id = ${jobId}
    `;

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const jobData = jobResult.rows[0];
    // Rename job_id back to id for consistency
    jobData.id = jobData.job_id;

    // Allow re-running steps on completed/failed jobs with ?force=true
    const forceRerun = req.query.force === 'true';

    if (jobData.status === 'completed' && !forceRerun) {
      return res.status(400).json({ success: false, error: 'Job is already completed. Use ?force=true to re-run a step.' });
    }

    if (jobData.status === 'failed' && !forceRerun) {
      return res.status(400).json({ success: false, error: 'Job has failed. Use ?force=true to re-run a step.' });
    }

    // Update job status to running
    const now = new Date().toISOString();
    await sql`
      UPDATE page_generation_jobs
      SET status = 'running', current_step = ${stepName}, updated_at = ${now}
      WHERE id = ${jobId}
    `;

    // Get step outputs - may need to parse if stored as string
    let stepOutputs = jobData.step_outputs || {};
    console.log('Raw step_outputs from DB:', {
      type: typeof stepOutputs,
      value: JSON.stringify(stepOutputs)?.substring(0, 500),
      isNull: stepOutputs === null,
      isUndefined: stepOutputs === undefined
    });

    if (typeof stepOutputs === 'string') {
      try {
        stepOutputs = JSON.parse(stepOutputs);
        console.log('Parsed step_outputs from string:', Object.keys(stepOutputs));
      } catch (e) {
        console.log('Failed to parse step_outputs:', e.message);
        stepOutputs = {};
      }
    }

    // Additional input from request body (for manual overrides)
    const additionalInput = req.body || {};

    // Debug log to help troubleshoot
    console.log('Step execution debug:', {
      stepName,
      jobId,
      hasStepOutputs: !!stepOutputs,
      stepOutputsKeys: Object.keys(stepOutputs),
      configUrl: stepOutputs._config?.website_url,
      configObject: stepOutputs._config,
      jobWebsiteUrl: jobData.website_url,
      additionalInputUrl: additionalInput.url
    });

    // Run the step
    const stepHandler = STEP_HANDLERS[stepName];
    const startTime = Date.now();

    let stepResult;
    try {
      stepResult = await stepHandler({
        job: jobData,
        stepOutputs,
        additionalInput,
        jobId
      });
    } catch (stepError) {
      // Step failed
      await sql`
        UPDATE page_generation_jobs
        SET status = 'failed', error_message = ${stepError.message}, updated_at = ${new Date().toISOString()}
        WHERE id = ${jobId}
      `;

      return res.status(500).json({
        success: false,
        error: `Step '${stepName}' failed: ${stepError.message}`,
        step: stepName
      });
    }

    const duration = Date.now() - startTime;

    // Update step outputs
    stepOutputs[stepName] = {
      result: stepResult.data,
      tokens_used: stepResult.tokens_used || 0,
      duration_ms: duration,
      completed_at: new Date().toISOString()
    };

    // Determine next step
    const currentIndex = STEP_ORDER.indexOf(stepName);
    const nextStep = currentIndex < STEP_ORDER.length - 1 ? STEP_ORDER[currentIndex + 1] : null;
    const isComplete = stepName === 'assembly';

    // Calculate total tokens used
    const totalTokens = Object.values(stepOutputs).reduce((sum, step) => {
      return sum + (step?.tokens_used || 0);
    }, 0);

    // Estimate cost (rough: $3/1M input + $15/1M output for Sonnet)
    const estimatedCost = (totalTokens / 1000000) * 9; // Average of input/output

    // Update job
    await sql`
      UPDATE page_generation_jobs
      SET
        status = ${isComplete ? 'completed' : 'pending'},
        current_step = ${nextStep || stepName},
        step_outputs = ${JSON.stringify(stepOutputs)}::jsonb,
        tokens_used = ${totalTokens},
        estimated_cost = ${estimatedCost},
        page_id = ${stepResult.page_id || null},
        completed_at = ${isComplete ? new Date().toISOString() : null},
        updated_at = ${new Date().toISOString()}
      WHERE id = ${jobId}
    `;

    return res.status(200).json({
      success: true,
      step: stepName,
      result: stepResult.data,
      tokens_used: stepResult.tokens_used || 0,
      duration_ms: duration,
      next_step: nextStep,
      is_complete: isComplete,
      progress: {
        completed: currentIndex + 1,
        total: STEP_ORDER.length,
        percentage: Math.round(((currentIndex + 1) / STEP_ORDER.length) * 100)
      }
    });
  } catch (error) {
    console.error('Step execution error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
