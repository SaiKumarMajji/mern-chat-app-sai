const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');
const User = require('../models/User');
const Session = require('../models/Session');
const { cookieName, cookieOptions } = require('../middleware/auth');

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function startSession(res, user, status) {
  const id = new Types.ObjectId();
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(user._id),
    jwtid: String(id),
    issuer: 'relay',
    algorithm: 'HS256',
    expiresIn: /^\d+$/.test(process.env.JWT_EXPIRES_IN)
      ? Number(process.env.JWT_EXPIRES_IN) : process.env.JWT_EXPIRES_IN,
  });
  const expiresAt = new Date(jwt.decode(token).exp * 1000);
  await Session.create({ _id: id, user: user._id, expiresAt });
  res.cookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
  res.status(status).json({ _id: user._id, name: user.name });
}

async function signup(req, res) {
  const { name, email, password } = req.body ?? {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const address = normalizeEmail(email);
  if (cleanName.length < 2 || cleanName.length > 50) {
    return res.status(400).json({ error: 'Enter a name between 2 and 50 characters.' });
  }
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Use at least 8 characters and at most 72 bytes for your password.' });
  }
  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({ name: cleanName, email: address, password: hash });
  await startSession(res, user, 201);
}

const fallbackHash = bcrypt.hash('unused-for-authentication', 12);

async function login(req, res) {
  const { email, password } = req.body ?? {};
  const address = normalizeEmail(email);
  const invalid = { error: 'Invalid email or password.' };
  if (!address || address.length > 254 || typeof password !== 'string' || Buffer.byteLength(password) > 72) {
    return res.status(401).json(invalid);
  }
  const user = await User.findOne({ email: address }).select('+password');
  const matches = await bcrypt.compare(password, user?.password ?? await fallbackHash);
  if (!matches || !user) return res.status(401).json(invalid);
  await startSession(res, user, 200);
}

async function me(req, res) {
  const user = await User.findById(req.auth.id).select('name').lean();
  if (!user) return res.status(401).json({ error: 'Account unavailable.' });
  res.json(user);
}

async function logout(req, res) {
  await Session.deleteOne({ _id: req.auth.sessionId });
  req.app.locals.realtime.disconnectSession(req.auth.sessionId);
  res.clearCookie(cookieName, cookieOptions).sendStatus(204);
}

module.exports = { signup, login, me, logout };
