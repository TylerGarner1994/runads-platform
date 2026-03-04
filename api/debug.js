export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  return res.status(200).json({
    hasClaudeKey: !!ANTHROPIC_API_KEY,
    hasGeminiKey: !!GEMINI_API_KEY,
    nodeVersion: process.version
  });
}
