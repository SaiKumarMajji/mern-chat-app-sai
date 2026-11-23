const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const cookieName = 'relay_session';
const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
  secure: process.env.NODE_ENV === 'production', 
  path: '/',
};

async function authenticate(cookieHeader = '') {
  const token = cookieHeader.split(';').map(part => part.trim())
    .find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'relay' });
  } catch {
    return null;
  }
  const session = await Session.findOne({
    _id: claims.jti, user: claims.sub, expiresAt: { $gt: new Date() },
  }).lean();
  return session && { id: claims.sub, sessionId: claims.jti, expiresAt: claims.exp * 1000 };
}

async function requireAuth(req, res, next) {
  req.auth = await authenticate(req.headers.cookie);
  if (!req.auth) return res.status(401).json({ error: 'Please sign in to continue.' });
  next();
}

module.exports = { authenticate, requireAuth, cookieName, cookieOptions };
