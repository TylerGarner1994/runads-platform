// RunAds - Authentication & Authorization
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
const DEV_MODE = !JWT_SECRET;

// In dev mode (no JWT_SECRET), all requests pass through
export function verifyAuth(req) {
  if (DEV_MODE) {
    return { id: 'dev', email: 'dev@runads.local', role: 'superadmin', name: 'Dev User' };
  }

  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function generateToken(user) {
  if (DEV_MODE) return 'dev-token';
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function hasRole(user, requiredRole) {
  const hierarchy = { marketer: 1, admin: 2, superadmin: 3 };
  return (hierarchy[user?.role] || 0) >= (hierarchy[requiredRole] || 999);
}

export function requireRole(role) {
  return (req) => {
    const user = verifyAuth(req);
    if (!user) return { error: 'Unauthorized', status: 401 };
    if (!hasRole(user, role)) return { error: 'Forbidden', status: 403 };
    return user;
  };
}

export default { verifyAuth, generateToken, hashPassword, verifyPassword, hasRole, requireRole };
