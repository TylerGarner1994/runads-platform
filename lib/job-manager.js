// RunAds - Job Manager for 7-Step Generation Pipeline
// Manages job lifecycle: create, update steps, track progress, handle errors

import { initDb, getSql, isPgAvailable } from './postgres.js';

const PIPELINE_STEPS = ['research', 'brand', 'strategy', 'copy', 'design', 'factcheck', 'assembly'];

const STEP_LABELS = {
  pending: 'Waiting to start...',
  research: 'Deep Research: Analyzing website and extracting business info',
  brand: 'Brand Extraction: Extracting colors, fonts, and style guide',
  strategy: 'Page Strategy: Creating page outline and messaging',
  copy: 'Copy Generation: Writing compelling copy',
  design: 'Design Generation: Building beautiful, on-brand HTML',
  factcheck: 'Fact Checking: Verifying all claims and statistics',
  assembly: 'Final Assembly: QA checks and page finalization',
  complete: 'Generation complete!',
  failed: 'Generation failed'
};

// GitHub fallback storage
const GITHUB_API = 'https://api.github.com';

async function getGitHubFile(path) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!resp.ok) return { data: null, sha: null };
  const file = await resp.json();
  const content = Buffer.from(file.content, 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: file.sha };
}

async function saveGitHubFile(path, data, sha, message) {
  const owner = process.env.GITHUB_OWNER || 'TylerGarner1994';
  const repo = process.env.GITHUB_REPO || 'runads-platform';
  const token = process.env.GITHUB_TOKEN;
  const body = {
    message: message || `Update ${path}`,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
  };
  if (sha) body.sha = sha;
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return resp.ok;
}

// Create a new generation job
async function createJob({ clientId, pageType, inputData }) {
  const jobId = 'job_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  const job = {
    id: jobId,
    client_id: clientId || null,
    page_type: pageType,
    current_step: 'pending',
    status: 'pending',
    input_data: inputData || {},
    research_data: {},
    brand_data: {},
    strategy_data: {},
    copy_data: {},
    design_data: {},
    factcheck_data: {},
    assembly_data: {},
    result_html: null,
    result_page_id: null,
    expert_scores: {},
    error: null,
    tokens_used: 0,
    created_at: now,
    updated_at: now,
    completed_at: null
  };

  await initDb();

  if (isPgAvailable()) {
    const sql = getSql();
    await sql`
      INSERT INTO page_generation_jobs (id, client_id, page_type, current_step, status, input_data, created_at, updated_at)
      VALUES (${jobId}, ${clientId}, ${pageType}, 'pending', 'pending', ${JSON.stringify(inputData || {})}, NOW(), NOW())
    `;
  } else {
    // GitHub fallback: store in data/jobs.json
    const { data: jobs, sha } = await getGitHubFile('data/jobs.json');
    const jobList = jobs || [];
    jobList.push(job);
    await saveGitHubFile('data/jobs.json', jobList, sha, `Create job ${jobId}`);
  }

  return job;
}

// Get a job by ID
async function getJob(jobId) {
  await initDb();

  if (isPgAvailable()) {
    const sql = getSql();
    const result = await sql`SELECT * FROM page_generation_jobs WHERE id = ${jobId}`;
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      input_data: typeof row.input_data === 'string' ? JSON.parse(row.input_data) : row.input_data,
      research_data: typeof row.research_data === 'string' ? JSON.parse(row.research_data) : row.research_data,
      brand_data: typeof row.brand_data === 'string' ? JSON.parse(row.brand_data) : row.brand_data,
      strategy_data: typeof row.strategy_data === 'string' ? JSON.parse(row.strategy_data) : row.strategy_data,
      copy_data: typeof row.copy_data === 'string' ? JSON.parse(row.copy_data) : row.copy_data,
      design_data: typeof row.design_data === 'string' ? JSON.parse(row.design_data) : row.design_data,
      factcheck_data: typeof row.factcheck_data === 'string' ? JSON.parse(row.factcheck_data) : row.factcheck_data,
      assembly_data: typeof row.assembly_data === 'string' ? JSON.parse(row.assembly_data) : row.assembly_data,
      expert_scores: typeof row.expert_scores === 'string' ? JSON.parse(row.expert_scores) : row.expert_scores,
    };
  } else {
    const { data: jobs } = await getGitHubFile('data/jobs.json');
    if (!jobs) return null;
    return jobs.find(j => j.id === jobId) || null;
  }
}

// Update a job's step data and transition to next step
async function updateJobStep(jobId, stepName, stepData, tokensUsed = 0) {
  await initDb();
  const dataField = `${stepName}_data`;
  const nextStep = getNextStep(stepName);

  if (isPgAvailable()) {
    const sql = getSql();
    const stepDataJson = JSON.stringify(stepData);
    const newStep = nextStep || 'complete';
    const newStatus = nextStep ? 'processing' : 'complete';

    // Use separate queries per step to avoid nested sql template issues
    if (stepName === 'research') {
      await sql`UPDATE page_generation_jobs SET research_data = ${stepDataJson}, current_step = ${newStep}, status = ${newStatus}, tokens_used = tokens_used + ${tokensUsed}, updated_at = NOW() WHERE id = ${jobId}`;
    } else if (stepName === 'brand') {
      await sql`UPDATE page_generation_jobs SET brand_data = ${stepDataJson}, current_step = ${newStep}, status = ${newStatus}, tokens_used = tokens_used + ${tokensUsed}, updated_at = NOW() WHERE id = ${jobId}`;
    } else if (stepName === 'strategy') {
      await sql`UPDATE page_generation_jobs SET strategy_data = ${stepDataJson}, current_step = ${newStep}, status = ${newStatus}, tokens_used = tokens_used + ${tokensUsed}, updated_at = NOW() WHERE id = ${jobId}`;
    } else if (stepName === 'copy') {
      await sql`UPDATE page_generation_jobs SET copy_data = ${stepDataJson}, current_step = ${newStep}, status = ${newStatus}, tokens_used = tokens_used + ${tokensUsed}, updated_at = NOW() WHERE id = ${jobId}`;
    } else if (stepName === 'design') {
      await sql`UPDATE page_generation_jobs SET design_data = ${stepDataJson}, current_step = ${newStep}, status = ${newStatus}, tokens_used = tokens_used + ${tokensUsed}, updated_at = NOW() WHERE id = ${jobId}`;
    } else if (stepName === 'factcheck') {
      await sql`UPDATE page_generation_jobs SET factcheck_data = ${stepDataJson}, current_step = ${newStep}, status = ${newStatus}, tokens_used = tokens_used + ${tokensUsed}, updated_at = NOW() WHERE id = ${jobId}`;
    } else if (stepName === 'assembly') {
      await sql`UPDATE page_generation_jobs SET assembly_data = ${stepDataJson}, result_html = ${stepData.html || null}, result_page_id = ${stepData.pageId || null}, current_step = 'complete', status = 'complete', tokens_used = tokens_used + ${tokensUsed}, updated_at = NOW(), completed_at = NOW() WHERE id = ${jobId}`;
    }
  } else {
    // GitHub fallback
    const { data: jobs, sha } = await getGitHubFile('data/jobs.json');
    if (!jobs) return;
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    job[dataField] = stepData;
    job.current_step = nextStep || 'complete';
    job.status = nextStep ? 'processing' : 'complete';
    job.tokens_used = (job.tokens_used || 0) + tokensUsed;
    job.updated_at = new Date().toISOString();
    if (!nextStep) job.completed_at = new Date().toISOString();
    if (stepName === 'assembly') {
      job.result_html = stepData.html || null;
      job.result_page_id = stepData.pageId || null;
    }
    await saveGitHubFile('data/jobs.json', jobs, sha, `Update job ${jobId} step ${stepName}`);
  }
}

// Mark a job step as in-progress
async function startJobStep(jobId, stepName) {
  await initDb();

  if (isPgAvailable()) {
    const sql = getSql();
    await sql`
      UPDATE page_generation_jobs
      SET current_step = ${stepName}, status = 'processing', updated_at = NOW()
      WHERE id = ${jobId}
    `;
  } else {
    const { data: jobs, sha } = await getGitHubFile('data/jobs.json');
    if (!jobs) return;
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    job.current_step = stepName;
    job.status = 'processing';
    job.updated_at = new Date().toISOString();
    await saveGitHubFile('data/jobs.json', jobs, sha, `Start job ${jobId} step ${stepName}`);
  }
}

// Mark a job as failed
async function failJob(jobId, error) {
  await initDb();

  if (isPgAvailable()) {
    const sql = getSql();
    await sql`
      UPDATE page_generation_jobs
      SET status = 'failed', error = ${error}, updated_at = NOW()
      WHERE id = ${jobId}
    `;
  } else {
    const { data: jobs, sha } = await getGitHubFile('data/jobs.json');
    if (!jobs) return;
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    job.status = 'failed';
    job.error = error;
    job.updated_at = new Date().toISOString();
    await saveGitHubFile('data/jobs.json', jobs, sha, `Fail job ${jobId}`);
  }
}

// Get the next step in the pipeline
function getNextStep(currentStep) {
  const idx = PIPELINE_STEPS.indexOf(currentStep);
  if (idx === -1 || idx === PIPELINE_STEPS.length - 1) return null;
  return PIPELINE_STEPS[idx + 1];
}

// Get progress percentage (0-100)
function getProgress(currentStep, status) {
  if (status === 'complete') return 100;
  if (status === 'failed') return 0;
  if (currentStep === 'pending') return 0;
  const idx = PIPELINE_STEPS.indexOf(currentStep);
  if (idx === -1) return 0;
  // Each step is ~14% (100/7), in-progress step counts as half
  return Math.round(((idx) / PIPELINE_STEPS.length) * 100);
}

// Get step label for UI
function getStepLabel(step) {
  return STEP_LABELS[step] || step;
}

export {
  PIPELINE_STEPS,
  STEP_LABELS,
  createJob,
  getJob,
  updateJobStep,
  startJobStep,
  failJob,
  getNextStep,
  getProgress,
  getStepLabel
};
