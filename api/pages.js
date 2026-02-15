// RunAds - Pages API (Vercel Serverless Function)
// Postgres-first storage via unified storage module

export const config = { maxDuration: 30 };

import { getPages, getPage, savePage, updatePage, deletePage, generateId } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const pageId = pathParts.length > 2 ? pathParts[2] : null;
    const subRoute = pathParts.length > 3 ? pathParts[3] : null;

    if (req.method === 'GET') {
      if (pageId) {
        const page = await getPage(pageId);
        if (!page) return res.status(404).json({ error: 'Page not found' });
        if (subRoute === 'analytics') {
          return res.json({ pageId: page.id, views: page.views || 0, leads: page.leads || 0, conversions: 0, conversionRate: '0.0', dailyViews: [], topSources: [] });
        }
        if (subRoute === 'variants') {
          return res.json(page.variants || []);
        }
        return res.json(page);
      }
      const pages = await getPages(false);
      const pageList = pages.map(({ html_content, ...rest }) => {
        let url = rest.url || `/p/${rest.slug}`;
        if (url && !url.startsWith('/p/') && !url.startsWith('http')) url = `/p/${url}`;
        return { ...rest, url, clientName: rest.client_name || rest.clientName || '' };
      });
      return res.json({ pages: pageList });
    }

    if (req.method === 'POST') {
      if (pageId && subRoute === 'deploy') {
        const updated = await updatePage(pageId, { status: 'published', deployed_at: new Date().toISOString() });
        return res.json({ message: 'Page deployed', url: `/p/${updated.slug}` });
      }
      if (pageId && subRoute === 'variants') {
        const page = await getPage(pageId);
        if (!page) return res.status(404).json({ error: 'Page not found' });
        const variant = { id: generateId(), ...req.body, created_at: new Date().toISOString() };
        const variants = [...(page.variants || []), variant];
        await updatePage(pageId, { variants });
        return res.json(variant);
      }
      const { name, slug, html_content, client_id, client_name, page_type, template_type, meta_title, meta_description } = req.body;
      const id = generateId();
      const pageSlug = slug || (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const now = new Date().toISOString();
      const newPage = { id, name: name || 'Untitled Page', slug: pageSlug, html_content: html_content || '', client_id: client_id || null, client_name: client_name || '', page_type: page_type || 'custom', template_type: template_type || null, status: 'draft', meta_title: meta_title || name || '', meta_description: meta_description || '', views: 0, leads: 0, custom_domain: null, url: `/p/${pageSlug}`, variants: [], expert_scores: {}, created_at: now, updated_at: now, deployed_at: null };
      await savePage(newPage);
      return res.json({ id, slug: pageSlug, message: 'Page created' });
    }

    if (req.method === 'PUT') {
      if (!pageId) return res.status(400).json({ error: 'Page ID required' });
      if (subRoute === 'domain') {
        await updatePage(pageId, { custom_domain: req.body.domain });
        return res.json({ message: 'Domain updated' });
      }
      await updatePage(pageId, req.body);
      return res.json({ message: 'Page updated' });
    }

    if (req.method === 'DELETE') {
      if (!pageId) return res.status(400).json({ error: 'Page ID required' });
      const deleted = await deletePage(pageId);
      if (!deleted) return res.status(404).json({ error: 'Page not found' });
      return res.json({ message: 'Page deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Pages API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
