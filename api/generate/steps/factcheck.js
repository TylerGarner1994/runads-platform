import { sql } from '@vercel/postgres';

/**
 * Fact-Check Step - Verify all claims in the generated content
 * Compares against verified claims database and flags unverified content
 */
export async function runFactcheckStep({ job, stepOutputs, additionalInput, jobId }) {
  const html = stepOutputs.design?.result?.html || '';
  const copy = stepOutputs.copy?.result?.copy || {};
  const unverifiedFromCopy = stepOutputs.copy?.result?.unverified_claims || [];

  // Get verified claims for this client
  let verifiedClaims = [];
  let sourceContent = null;

  if (job.client_id) {
    const claimsResult = await sql`
      SELECT claim_text, claim_type, source_url, source_text
      FROM verified_claims
      WHERE client_id = ${job.client_id} AND verification_status = 'verified'
    `;
    verifiedClaims = claimsResult.rows;

    // Get source content for searching
    const clientResult = await sql`SELECT source_content FROM clients WHERE id = ${job.client_id}`;
    sourceContent = clientResult.rows[0]?.source_content;
  }

  // Extract claims from the HTML
  const extractedClaims = extractClaimsFromHtml(html);

  // Check each claim against verified database
  const factCheckResults = {
    verified: [],
    newly_verified: [],
    flagged: [],
    removed: []
  };

  for (const claim of extractedClaims) {
    const verification = verifyClaim(claim, verifiedClaims, sourceContent);

    if (verification.status === 'verified') {
      factCheckResults.verified.push({
        claim: claim.text,
        type: claim.type,
        source: verification.source
      });
    } else if (verification.status === 'found_in_source') {
      factCheckResults.newly_verified.push({
        claim: claim.text,
        type: claim.type,
        source: verification.source,
        confidence: verification.confidence
      });
    } else {
      factCheckResults.flagged.push({
        claim: claim.text,
        type: claim.type,
        reason: verification.reason,
        suggestion: verification.suggestion
      });
    }
  }

  // Add any claims that were marked as NEEDS VERIFICATION during copy generation
  for (const unverified of unverifiedFromCopy) {
    factCheckResults.flagged.push({
      claim: unverified,
      type: 'copy_flagged',
      reason: 'Marked as needing verification during copy generation',
      suggestion: 'Remove or replace with verified alternative'
    });
  }

  // Generate cleaned HTML if there are flagged claims
  let cleanedHtml = html;
  let changesApplied = [];

  if (factCheckResults.flagged.length > 0) {
    const cleanupResult = cleanFlaggedClaims(html, factCheckResults.flagged);
    cleanedHtml = cleanupResult.html;
    changesApplied = cleanupResult.changes;
    factCheckResults.removed = cleanupResult.removed;
  }

  // Store newly verified claims
  if (job.client_id && factCheckResults.newly_verified.length > 0) {
    const now = new Date().toISOString();
    for (const newClaim of factCheckResults.newly_verified) {
      if (newClaim.confidence > 0.7) {
        const claimId = crypto.randomUUID();
        await sql`
          INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, verification_status, confidence_score, verified_at, created_at)
          VALUES (${claimId}, ${job.client_id}, ${newClaim.claim}, ${newClaim.type}, ${newClaim.source}, 'verified', ${newClaim.confidence}, ${now}, ${now})
        `;
      }
    }
  }

  return {
    data: {
      fact_check_report: factCheckResults,
      total_claims_checked: extractedClaims.length,
      verified_count: factCheckResults.verified.length,
      newly_verified_count: factCheckResults.newly_verified.length,
      flagged_count: factCheckResults.flagged.length,
      changes_applied: changesApplied,
      cleaned_html: cleanedHtml,
      html_changed: cleanedHtml !== html
    },
    tokens_used: 0 // No API calls in this step
  };
}

function extractClaimsFromHtml(html) {
  const claims = [];

  // Extract statistics (percentages, numbers with context)
  const statPatterns = [
    /(\d+(?:\.\d+)?%\s+[^<.]+)/gi,
    /(\d+(?:,\d{3})*\+?\s+(?:customers?|users?|people|clients?|reviews?|sales?|orders?))/gi,
    /(saved?\s+\$?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(\d+x\s+[^<.]+)/gi,
    /(#\d+\s+[^<.]+)/gi,
    /(\$\d+(?:,\d{3})*(?:\.\d{2})?\s+(?:saved?|earned?|made?|revenue|sales?))/gi
  ];

  for (const pattern of statPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      claims.push({
        text: match[1].trim(),
        type: 'statistic',
        position: match.index
      });
    }
  }

  // Extract testimonial quotes
  const quotePatterns = [
    /"([^"]{20,300})"/g,
    /'([^']{20,300})'/g,
    /["\u201C\u201D]([^"\u201C\u201D]{20,300})["\u201C\u201D]/g
  ];

  for (const pattern of quotePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const quote = match[1].trim();
      // Filter out likely non-testimonials
      if (!quote.includes('{') && !quote.includes('<') &&
          (quote.includes('I ') || quote.includes('my ') || quote.includes('we ') ||
           quote.includes('best') || quote.includes('love') || quote.includes('recommend'))) {
        claims.push({
          text: quote,
          type: 'testimonial',
          position: match.index
        });
      }
    }
  }

  // Extract specific claims (awards, certifications, rankings)
  const claimPatterns = [
    /(award[- ]?winning|#1|best[- ]?selling|top[- ]?rated|certified|verified|proven)/gi,
    /(as seen (?:on|in) [^<.]+)/gi,
    /(featured (?:on|in|by) [^<.]+)/gi
  ];

  for (const pattern of claimPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      claims.push({
        text: match[1].trim(),
        type: 'claim',
        position: match.index
      });
    }
  }

  // Deduplicate
  const seen = new Set();
  return claims.filter(claim => {
    const key = claim.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function verifyClaim(claim, verifiedClaims, sourceContent) {
  const claimLower = claim.text.toLowerCase();

  // Check against verified claims database
  for (const verified of verifiedClaims) {
    const verifiedLower = verified.claim_text.toLowerCase();

    // Direct match or contains match
    if (claimLower === verifiedLower ||
        claimLower.includes(verifiedLower) ||
        verifiedLower.includes(claimLower)) {
      return {
        status: 'verified',
        source: verified.source_url || 'verified claims database'
      };
    }

    // Fuzzy number match with context overlap
    // Requires matching numbers AND overlapping context words to avoid false positives
    // (e.g., "5 minutes" should NOT match "5 stars" just because both contain "5")
    const claimNumbers = claimLower.match(/\d+(?:\.\d+)?/g);
    const verifiedNumbers = verifiedLower.match(/\d+(?:\.\d+)?/g);

    if (claimNumbers && verifiedNumbers) {
      const matchingNumbers = claimNumbers.filter(n => verifiedNumbers.includes(n));
      if (matchingNumbers.length > 0 && claim.type === verified.claim_type) {
        // Extract context words around each matching number for both claim and verified text
        const getContextWords = (text, num) => {
          const regex = new RegExp(`(\\S+\\s+)?\\S*${num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\S*(?:\\s+\\S+)?`, 'i');
          const match = text.match(regex);
          if (!match) return [];
          return match[0].toLowerCase().split(/\s+/).filter(w => w !== num && w.length > 2);
        };

        const hasContextOverlap = matchingNumbers.some(num => {
          const claimContext = getContextWords(claimLower, num);
          const verifiedContext = getContextWords(verifiedLower, num);
          return claimContext.some(w => verifiedContext.includes(w));
        });

        if (hasContextOverlap) {
          return {
            status: 'verified',
            source: verified.source_url || 'verified claims database'
          };
        }
      }
    }
  }

  // Check against source content
  if (sourceContent) {
    const sourceText = JSON.stringify(sourceContent).toLowerCase();

    if (sourceText.includes(claimLower)) {
      return {
        status: 'found_in_source',
        source: 'scraped website content',
        confidence: 0.8
      };
    }

    // Check for numbers in source with adjacent word context
    // Requires the number AND at least 3 adjacent words from the claim to appear in the source
    // to avoid false positives (e.g., "1" appears in almost any text)
    const claimNumbers = claimLower.match(/\d+(?:\.\d+)?/g);
    if (claimNumbers) {
      const claimWords = claimLower.split(/\s+/).filter(w => w.length > 2);
      for (const num of claimNumbers) {
        if (sourceText.includes(num)) {
          // Count how many adjacent words from the claim also appear near the number in source
          const adjacentWordsInSource = claimWords.filter(w => w !== num && sourceText.includes(w));
          if (adjacentWordsInSource.length >= 3) {
            return {
              status: 'found_in_source',
              source: 'scraped website content',
              confidence: 0.6
            };
          }
        }
      }
    }
  }

  // Not verified
  return {
    status: 'unverified',
    reason: 'Claim not found in verified database or source content',
    suggestion: claim.type === 'statistic'
      ? 'Replace with benefit-focused language or remove'
      : claim.type === 'testimonial'
        ? 'Use only verified customer quotes'
        : 'Remove or verify with client'
  };
}

function cleanFlaggedClaims(html, flaggedClaims) {
  let cleanedHtml = html;
  const changes = [];
  const removed = [];

  for (const flagged of flaggedClaims) {
    // For statistics, replace with generic benefit language
    if (flagged.type === 'statistic') {
      const pattern = new RegExp(escapeRegex(flagged.claim), 'gi');

      if (cleanedHtml.match(pattern)) {
        // Replace with a placeholder that's clearly marked
        cleanedHtml = cleanedHtml.replace(pattern, '[STAT REMOVED - UNVERIFIED]');
        changes.push(`Removed unverified statistic: "${flagged.claim}"`);
        removed.push(flagged.claim);
      }
    }

    // For testimonials, remove the quote
    if (flagged.type === 'testimonial') {
      const pattern = new RegExp(`["'\u201C\u201D]${escapeRegex(flagged.claim)}["'\u201C\u201D]`, 'gi');

      if (cleanedHtml.match(pattern)) {
        cleanedHtml = cleanedHtml.replace(pattern, '[TESTIMONIAL REMOVED - UNVERIFIED]');
        changes.push(`Removed unverified testimonial: "${flagged.claim.substring(0, 50)}..."`);
        removed.push(flagged.claim);
      }
    }
  }

  return { html: cleanedHtml, changes, removed };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
