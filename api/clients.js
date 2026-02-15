// RunAds - Clients API (Vercel Serverless Function)
// Postgres-first storage via unified storage module

export const config = { maxDuration: 30 };

import { getClients, getClient, saveClient, updateClient, deleteClient, generateId } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pp = url.pathname.split('/').filter(Boolean);
    const cid = pp.length > 2 ? pp[2] : null;
    const sub = pp.length > 3 ? pp[3] : null;

    if (req.method === 'GET') {
      if (cid) {
        const c = await getClient(cid);
        return c ? res.json(c) : res.status(404).json({ error: 'Not found' });
      }
      const clients = await getClients();
      return res.json({ clients });
    }

    if (req.method === 'POST') {
      if (cid && sub) {
        // Add sub-collection item (claims, testimonials, products, audiences)
        const client = await getClient(cid);
        if (!client) return res.status(404).json({ error: 'Not found' });
        const collection = client[sub] || [];
        const item = { id: generateId(), ...req.body, created_at: new Date().toISOString() };
        collection.push(item);
        await updateClient(cid, { [sub]: collection });
        return res.json(item);
      }
      const { name, website, industry, description } = req.body;
      const id = generateId();
      const now = new Date().toISOString();
      const nc = { id, name: name || 'New Client', website: website || '', industry: industry || '', description: description || '', style_guide: null, claims: [], testimonials: [], products: [], audiences: [], created_at: now, updated_at: now };
      await saveClient(nc);
      return res.json({ id, message: 'Client created' });
    }

    if (req.method === 'PUT') {
      if (!cid) return res.status(400).json({ error: 'ID required' });
      if (sub === 'style-guide') {
        await updateClient(cid, { style_guide: req.body });
      } else {
        await updateClient(cid, req.body);
      }
      return res.json({ message: 'Updated' });
    }

    if (req.method === 'DELETE') {
      if (!cid) return res.status(400).json({ error: 'ID required' });
      const deleted = await deleteClient(cid);
      if (!deleted) return res.status(404).json({ error: 'Not found' });
      return res.json({ message: 'Deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Clients API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
