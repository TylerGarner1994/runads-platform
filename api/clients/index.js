import { v4 as uuidv4 } from 'uuid';
import db from '../../lib/database.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // List all clients
      const clients = await db.getClients();

      return res.status(200).json({
        success: true,
        clients
      });
    }

    if (req.method === 'POST') {
      // Create new client
      const { name, website_url, industry } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }

      const id = uuidv4();
      const client = await db.createClient({ id, name, website_url, industry });

      return res.status(201).json({
        success: true,
        client
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Clients API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
