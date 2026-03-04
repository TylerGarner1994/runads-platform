// RunAds - Shared Claude API Utility
// Unified wrapper for all Claude API calls with retry logic

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_RETRIES = 2;

/**
 * Call Claude API with retry logic and consistent error handling.
 * No custom timeout — Vercel's 300s function limit handles that.
 *
 * @param {Object} options
 * @param {string|null} options.systemPrompt - System prompt (null to omit)
 * @param {string} options.userPrompt - User message content
 * @param {string} [options.model] - Model ID (default: claude-sonnet-4-6)
 * @param {number} [options.maxTokens] - Max tokens (default: 8192)
 * @param {number} [options.temperature] - Temperature (omitted by default)
 * @param {number} [options.retries] - Number of retries for 429/5xx (default: 2)
 * @returns {Promise<{text: string, tokensUsed: number, stopReason: string, json: object|null}>}
 */
export async function callClaude({
  systemPrompt = null,
  userPrompt,
  model = DEFAULT_MODEL,
  maxTokens = DEFAULT_MAX_TOKENS,
  temperature,
  retries = DEFAULT_RETRIES
} = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const body = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userPrompt }]
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });

      // Retry on 429 (rate limit) or 5xx (server error)
      if ((resp.status === 429 || resp.status >= 500) && attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s
        console.warn(`Claude API ${resp.status}, retry ${attempt + 1}/${retries} in ${backoffMs}ms`);
        await sleep(backoffMs);
        lastError = new Error(`Claude API error: ${resp.status}`);
        continue;
      }

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Claude API error: ${resp.status} - ${errText}`);
      }

      const rawText = await resp.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(`Claude API returned invalid JSON: ${rawText.substring(0, 200)}`);
      }
      const text = data.content?.[0]?.text || '';
      const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
      const stopReason = data.stop_reason || 'end_turn';

      return {
        text,
        tokensUsed,
        stopReason,
        json: parseJsonResponse(text)
      };
    } catch (err) {
      lastError = err;

      if (attempt >= retries) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Parse JSON from Claude's text response.
 * Tries multiple strategies: direct parse, code-block extraction, brace matching.
 *
 * @param {string} text - Raw text from Claude
 * @returns {object|null} Parsed JSON or null if not parseable
 */
export function parseJsonResponse(text) {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();

  // Strategy 1: Direct parse
  try {
    return JSON.parse(trimmed);
  } catch (e) { /* continue */ }

  // Strategy 2: Extract from markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) { /* continue */ }
  }

  // Strategy 3: Find outermost braces using indexOf/lastIndexOf
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
    } catch (e) { /* continue */ }
  }

  // Strategy 4: Try array brackets
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.substring(firstBracket, lastBracket + 1));
    } catch (e) { /* continue */ }
  }

  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
