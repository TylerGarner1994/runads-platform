import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: clientId } = req.query;

  if (!clientId) {
    return res.status(400).json({ success: false, error: 'Client ID is required' });
  }

  try {
    // Verify client exists
    const { rows: clients } = await sql`SELECT id FROM clients WHERE id = ${clientId}`;
    if (clients.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    if (req.method === 'GET') {
      // Get all verified claims for this client
      const { rows: claims } = await sql`
        SELECT *
        FROM verified_claims
        WHERE client_id = ${clientId}
        ORDER BY claim_type, created_at DESC
      `;

      // Group by type for the frontend
      const grouped = {
        claims: claims.filter(c => c.claim_type === 'claim'),
        testimonials: claims.filter(c => c.claim_type === 'testimonial'),
        statistics: claims.filter(c => c.claim_type === 'statistic')
      };

      return res.status(200).json({
        success: true,
        claims,
        grouped,
        total: claims.length
      });
    }

    if (req.method === 'POST') {
      // Add a new verified claim
      const { claim_text, claim_type, source_url, source_text, confidence_score } = req.body;

      if (!claim_text) {
        return res.status(400).json({ success: false, error: 'Claim text is required' });
      }

      const claimId = uuidv4();
      const now = new Date().toISOString();
      const type = claim_type || 'claim';
      const confidence = confidence_score || 1.0;

      await sql`
        INSERT INTO verified_claims (id, client_id, claim_text, claim_type, source_url, source_text, verification_status, confidence_score, verified_at, created_at)
        VALUES (${claimId}, ${clientId}, ${claim_text}, ${type}, ${source_url || null}, ${source_text || null}, 'verified', ${confidence}, ${now}, ${now})
      `;

      const { rows: newClaim } = await sql`SELECT * FROM verified_claims WHERE id = ${claimId}`;

      return res.status(201).json({
        success: true,
        claim: newClaim[0]
      });
    }

    if (req.method === 'PUT') {
      // Update an existing claim
      const { claim_id, claim_text, claim_type, source_url, verification_status, confidence_score } = req.body;

      if (!claim_id) {
        return res.status(400).json({ success: false, error: 'Claim ID is required' });
      }

      const updates = [];
      const values = [];

      if (claim_text !== undefined) {
        await sql`UPDATE verified_claims SET claim_text = ${claim_text} WHERE id = ${claim_id} AND client_id = ${clientId}`;
      }
      if (claim_type !== undefined) {
        await sql`UPDATE verified_claims SET claim_type = ${claim_type} WHERE id = ${claim_id} AND client_id = ${clientId}`;
      }
      if (source_url !== undefined) {
        await sql`UPDATE verified_claims SET source_url = ${source_url} WHERE id = ${claim_id} AND client_id = ${clientId}`;
      }
      if (verification_status !== undefined) {
        await sql`UPDATE verified_claims SET verification_status = ${verification_status} WHERE id = ${claim_id} AND client_id = ${clientId}`;
      }
      if (confidence_score !== undefined) {
        await sql`UPDATE verified_claims SET confidence_score = ${confidence_score} WHERE id = ${claim_id} AND client_id = ${clientId}`;
      }

      const { rows: updated } = await sql`SELECT * FROM verified_claims WHERE id = ${claim_id}`;

      return res.status(200).json({
        success: true,
        claim: updated[0]
      });
    }

    if (req.method === 'DELETE') {
      const { claim_id } = req.body || {};
      const queryClaimId = req.query.claim_id;
      const targetId = claim_id || queryClaimId;

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Claim ID is required' });
      }

      await sql`DELETE FROM verified_claims WHERE id = ${targetId} AND client_id = ${clientId}`;

      return res.status(200).json({ success: true, message: 'Claim deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Claims API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
