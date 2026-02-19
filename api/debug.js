export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  return res.status(200).json({
    hasClaudeKey: !!ANTHROPIC_API_KEY,
    keyPrefix: ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    keyLength: ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.length : 0,
    hasGeminiKey: !!GEMINI_API_KEY,
    nodeVersion: process.version,
    env: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('PASSWORD') && !k.includes('KEY') && !k.includes('TOKEN'))
  });
}
