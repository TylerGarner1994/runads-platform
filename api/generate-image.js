// RunAds - Nano Banana Pro Image Generator
// Uses Google Gemini 3 Pro Image API to generate ad images from prompts

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured. Add it in Vercel environment variables.' });
  }

  const { prompt, aspect_ratio = '4:5' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing required field: prompt' });
  }

  try {
    // Call Nano Banana Pro (Gemini 3 Pro Image) via Google's REST API
    const model = 'gemini-2.5-flash-preview-image-generation';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: aspect_ratio
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Gemini API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    // Extract the generated image from the response
    // Response format: candidates[0].content.parts[].inlineData.data (base64)
    const candidates = data.candidates || [];
    if (!candidates.length) {
      return res.status(500).json({ error: 'No image generated - empty response from Gemini' });
    }

    const parts = candidates[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);

    if (!imagePart) {
      // Sometimes the model returns text instead of an image (safety filter, etc.)
      const textPart = parts.find(p => p.text);
      return res.status(500).json({
        error: 'No image in response',
        message: textPart?.text || 'The model did not generate an image. Try adjusting your prompt.'
      });
    }

    // Return the base64 image data
    return res.status(200).json({
      success: true,
      image: {
        data: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png'
      }
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return res.status(500).json({ error: 'Image generation failed', message: error.message });
  }
}
