// RunAds - Domains API (Vercel Serverless Function)
export const config = { maxDuration: 15 };
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.json([{ id: 'default', domain: 'runads-platform.vercel.app', type: 'vercel', active: true }]);
}