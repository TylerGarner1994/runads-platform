import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

/**
 * Assembly Step - Final page assembly and QA
 * Combines all outputs into production-ready page
 */
export async function runAssemblyStep({ job, stepOutputs, additionalInput, jobId }) {
  const factCheckResult = stepOutputs.factcheck?.result || {};
  const designResult = stepOutputs.design?.result || {};
  const copyResult = stepOutputs.copy?.result || {};
  const researchData = stepOutputs.research?.result?.business_research || {};

  // Use cleaned HTML from fact-check, or original from design
  let html = factCheckResult.cleaned_html || designResult.html || '';

  // QA Checks
  const qaResults = {
    passed: [],
    warnings: [],
    errors: []
  };

  // 1. Check for required meta tags
  if (html.includes('<title>') && !html.includes('<title></title>')) {
    qaResults.passed.push('Page title present');
  } else {
    qaResults.warnings.push('Missing or empty page title');
  }

  if (html.includes('meta name="description"')) {
    qaResults.passed.push('Meta description present');
  } else {
    qaResults.warnings.push('Missing meta description');
  }

  // 2. Check for mobile viewport
  if (html.includes('viewport')) {
    qaResults.passed.push('Viewport meta tag present');
  } else {
    // Add viewport tag
    html = html.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    qaResults.passed.push('Viewport meta tag added');
  }

  // 3. Check for form tracking
  if (html.includes('{{PAGE_ID}}')) {
    qaResults.passed.push('Form tracking placeholder present');
  } else if (html.includes('<form')) {
    qaResults.warnings.push('Form present but no tracking placeholder');
  }

  // 4. Check for CTA
  if (html.includes('button') || html.includes('btn') || html.includes('cta')) {
    qaResults.passed.push('CTA elements present');
  } else {
    qaResults.warnings.push('No obvious CTA elements found');
  }

  // 5. Check for alt tags on images
  const imgWithoutAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
  if (imgWithoutAlt > 0) {
    qaResults.warnings.push(`${imgWithoutAlt} images missing alt tags`);
  } else {
    qaResults.passed.push('All images have alt tags');
  }

  // 6. Check for removed content markers
  if (html.includes('[STAT REMOVED') || html.includes('[TESTIMONIAL REMOVED')) {
    qaResults.errors.push('Unverified content markers need to be resolved');
    // Clean up the markers for now (in production, this should be reviewed)
    html = html.replace(/\[STAT REMOVED[^\]]*\]/g, '');
    html = html.replace(/\[TESTIMONIAL REMOVED[^\]]*\]/g, '');
  }

  // 7. Check responsive CSS
  if (html.includes('@media') || html.includes('flex') || html.includes('grid')) {
    qaResults.passed.push('Responsive CSS patterns detected');
  } else {
    qaResults.warnings.push('No responsive CSS patterns detected');
  }

  // 8. Strip any em dashes that slipped through
  html = html.replace(/\u2014/g, ' - ');
  html = html.replace(/&mdash;/g, ' - ');

  // 9. Auto-repair truncated HTML if needed
  if (!html.includes('</body>')) {
    const openCounts = {};
    const closeCounts = {};
    for (const tag of ['div', 'section', 'article', 'main', 'aside', 'footer', 'header', 'nav']) {
      const openMatches = html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || [];
      const closeMatches = html.match(new RegExp(`</${tag}>`, 'gi')) || [];
      openCounts[tag] = openMatches.length;
      closeCounts[tag] = closeMatches.length;
    }
    for (const tag of ['div', 'section', 'article', 'main', 'aside', 'footer', 'header', 'nav']) {
      const unclosed = (openCounts[tag] || 0) - (closeCounts[tag] || 0);
      for (let i = 0; i < unclosed; i++) {
        html += `</${tag}>`;
      }
    }
    html += '\n</body>\n</html>';
  }

  // 10. Add tracking script if not present
  if (!html.includes('runads-tracking')) {
    const trackingScript = `
<script data-id="runads-tracking">
// RunAds Platform Tracking
(function() {
  var pageId = '{{PAGE_ID}}';
  var sessionId = Math.random().toString(36).substring(7);

  // Track page view
  fetch('https://runads-platform.vercel.app/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'view',
      page_id: pageId,
      session_id: sessionId,
      referrer: document.referrer,
      url: window.location.href
    })
  }).catch(function() {});

  // Track form submissions
  document.querySelectorAll('form').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      var formData = new FormData(form);
      formData.append('page_id', pageId);
      formData.append('session_id', sessionId);

      fetch('https://runads-platform.vercel.app/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead',
          page_id: pageId,
          session_id: sessionId,
          form_data: Object.fromEntries(formData)
        })
      }).catch(function() {});
    });
  });

  // Track CTA clicks
  document.querySelectorAll('a[href], button').forEach(function(el) {
    el.addEventListener('click', function() {
      fetch('https://runads-platform.vercel.app/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'click',
          page_id: pageId,
          session_id: sessionId,
          element: el.textContent ? el.textContent.substring(0, 50) : ''
        })
      }).catch(function() {});
    });
  });
})();
</script>
`;
    html = html.replace('</body>', trackingScript + '\n</body>');
    qaResults.passed.push('Tracking script added');
  }

  // 11. Trim excessive whitespace
  html = html.replace(/\n\s*\n/g, '\n').trim();

  // Generate slug
  const companyName = researchData.company_name || 'page';
  const pageType = job.page_type || 'landing';
  const baseSlug = `${companyName}-${pageType}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  // Check for existing slug and make unique
  const existingSlugs = await sql`SELECT slug FROM landing_pages WHERE slug LIKE ${baseSlug + '%'}`;
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.rows.some(r => r.slug === slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create the landing page record
  const pageId = uuidv4();
  const now = new Date().toISOString();

  // Replace page ID placeholder
  html = html.replace(/\{\{PAGE_ID\}\}/g, pageId);

  const metaTitle = copyResult.copy?.meta?.title || `${researchData.company_name} - ${job.page_type}`;
  const metaDescription = copyResult.copy?.meta?.description || '';

  await sql`
    INSERT INTO landing_pages (
      id, name, slug, client_name, client_id, template_id, job_id,
      generation_metadata, html_content, status,
      meta_title, meta_description, created_at, updated_at
    )
    VALUES (
      ${pageId},
      ${metaTitle},
      ${slug},
      ${researchData.company_name || null},
      ${job.client_id || null},
      ${job.template_id || null},
      ${jobId},
      ${JSON.stringify({
        page_type: job.page_type,
        tokens_used: Object.values(stepOutputs).reduce((sum, s) => sum + (s?.tokens_used || 0), 0),
        steps_completed: Object.keys(stepOutputs).filter(k => stepOutputs[k]).length,
        fact_check_summary: {
          verified: factCheckResult.verified_count || 0,
          flagged: factCheckResult.flagged_count || 0
        }
      })}::jsonb,
      ${html},
      'draft',
      ${metaTitle},
      ${metaDescription},
      ${now},
      ${now}
    )
  `;

  // Update job with page_id
  await sql`
    UPDATE page_generation_jobs
    SET page_id = ${pageId}, completed_at = ${now}
    WHERE id = ${jobId}
  `;

  // Update template usage count if applicable
  if (job.template_id) {
    await sql`
      UPDATE page_templates
      SET times_used = times_used + 1
      WHERE id = ${job.template_id}
    `;
  }

  return {
    data: {
      page_id: pageId,
      slug,
      status: 'draft',
      qa_results: qaResults,
      html_length: html.length,
      ready_to_deploy: qaResults.errors.length === 0,
      preview_url: `https://runads-platform.vercel.app/p/${slug}`,
      fact_check_summary: {
        verified: factCheckResult.verified_count || 0,
        newly_verified: factCheckResult.newly_verified_count || 0,
        flagged: factCheckResult.flagged_count || 0,
        changes_applied: factCheckResult.changes_applied?.length || 0
      }
    },
    page_id: pageId,
    tokens_used: 0 // No API calls in assembly
  };
}
