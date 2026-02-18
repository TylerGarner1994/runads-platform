// RunAds - Gemini API Wrapper
// Uses Google Gemini 2.0 Flash for fast, cost-effective research extraction
// Falls back gracefully if GEMINI_API_KEY is not configured

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Call Gemini 2.0 Flash for text generation
 * @param {string} prompt - The user prompt
 * @param {object} options - { systemInstruction, maxTokens, temperature }
 * @returns {{ text: string, tokensUsed: number }}
 */
export async function callGemini(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = options.model || 'gemini-2.0-flash';
  const maxTokens = options.maxTokens || 8192;
  const temperature = options.temperature ?? 0.3;

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      responseMimeType: 'text/plain'
    }
  };

  // Add system instruction if provided
  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const resp = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      throw new Error(`Gemini API error ${resp.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await resp.json();

    // Extract text from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract token usage
    const usage = data.usageMetadata || {};
    const tokensUsed = (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0);

    return { text, tokensUsed };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check if Gemini is available (API key configured)
 */
export function isGeminiAvailable() {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Extract structured business data from website content using Gemini
 * This is the primary research extraction function — cheaper and faster than Claude for this task
 * @param {string} content - Combined website text content
 * @param {string} url - The website URL for context
 * @returns {{ data: object, tokensUsed: number }}
 */
export async function extractBusinessDataWithGemini(content, url) {
  const systemInstruction = `You are an expert market researcher. Extract structured business intelligence from website content. Return ONLY valid JSON — no markdown, no explanation, no code fences. If a field cannot be determined, use null or empty array.`;

  const prompt = `Analyze this website content and extract comprehensive business data.

Website URL: ${url}

WEBSITE CONTENT:
${content.substring(0, 30000)}

Return a JSON object with these EXACT fields:
{
  "company_name": "string",
  "industry": "string",
  "tagline": "string or null",
  "description": "string (2-3 sentence summary of the business)",
  "value_propositions": ["string (customer-centric, benefit-focused)", ...],
  "unique_differentiators": ["string (what makes this mechanically different?)", ...],
  "products_services": [{"name": "string", "description": "string", "price": "string or null", "features": ["string"], "benefits": ["string"]}],
  "testimonials": [{"quote": "string (exact quote from website)", "author": "string or null", "role": "string or null", "specificity": "string (specific result mentioned)"}],
  "statistics": [{"text": "string (exact stat from website)", "context": "string"}],
  "trust_signals": ["string (certifications, awards, media mentions, partnerships)"],
  "target_audiences": [{"name": "string", "demographics": "string", "pain_points": ["string"], "desires": ["string"]}],
  "brand_voice": {"tone": "string (formal/casual/authoritative/friendly/etc)", "keywords": ["string (recurring brand terms)"]},
  "pricing_info": "string or null",
  "cta_patterns": ["string (call-to-action text found on the site)"],
  "key_objections": ["string (what might prevent someone from buying?)"]
}`;

  const { text, tokensUsed } = await callGemini(prompt, {
    systemInstruction,
    maxTokens: 8192,
    temperature: 0.2,
    timeout: 25000
  });

  // Parse JSON from response (handle potential markdown wrapping)
  let data;
  try {
    // Try direct parse first
    data = JSON.parse(text);
  } catch {
    // Try extracting from code fence
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[1].trim());
    } else {
      // Try finding first { to last }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        data = JSON.parse(text.substring(start, end + 1));
      } else {
        throw new Error('Gemini returned non-JSON response');
      }
    }
  }

  return { data, tokensUsed };
}
