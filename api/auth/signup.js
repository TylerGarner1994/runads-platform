import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
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
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES (${userId}, ${email.toLowerCase()}, ${passwordHash}, ${name}, 'marketer', ${now}, ${now})
    `;

    // Generate tokens
    const jwtSecret = process.env.JWT_SECRET || 'runads-secret-change-in-production';

    const accessToken = jwt.sign(
      { userId, email: email.toLowerCase(), role: 'marketer' },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Store refresh token
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO user_sessions (id, user_id, refresh_token, expires_at, ip_address, user_agent, created_at)
      VALUES (${sessionId}, ${userId}, ${refreshToken}, ${expiresAt}, ${req.headers['x-forwarded-for'] || 'unknown'}, ${req.headers['user-agent'] || 'unknown'}, ${now})
    `;

    return res.status(201).json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name,
        role: 'marketer'
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
