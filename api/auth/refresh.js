import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'runads-secret-change-in-production';

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, jwtSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // Check if session exists and is valid
    const sessionResult = await sql`
      SELECT s.*, u.email, u.name, u.role, u.is_active
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.refresh_token = ${refreshToken}
        AND s.expires_at > NOW()
    `;

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid'
      });
    }

    const session = sessionResult.rows[0];

    if (!session.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: session.user_id, email: session.email, role: session.role },
      jwtSecret,
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: session.user_id,
        email: session.email,
        name: session.name,
        role: session.role
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
