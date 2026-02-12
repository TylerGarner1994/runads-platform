// RunAds - Debug Endpoint
export default function handler(req, res) {
  res.json({
    status: 'ok',
    version: '1.0.0',
    node_version: process.version,
    api_key_configured: !!process.env.ANTHROPIC_API_KEY,
    github_configured: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER),
    database: process.env.POSTGRES_URL ? 'postgres' : 'sqlite',
    timestamp: new Date().toISOString()
  });
}
