require('dotenv').config({ quiet: true });
const { createServer } = require('node:http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const api = require('./routes/api');
const realtime = require('./realtime');

const app = express();
const server = createServer(app);
const origin = new URL(process.env.CLIENT_ORIGIN || 'http://localhost:5173').origin;
const port = process.env.PORT || 5000;

app.disable('x-powered-by');
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
app.use(cors({ origin, credentials: true }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') && req.get('origin') !== origin) {
    return res.status(403).json({ error: 'Request origin is forbidden.' });
  }
  next();
});
app.use(express.json({ limit: '24kb' }));
app.locals.realtime = realtime(server, origin);
app.use('/api', api);
app.use((_req, res) => res.status(404).json({ error: 'Route unavailable.' }));
app.use((err, _req, res, _next) => {
  if (err.code === 11000) return res.status(409).json({ error: 'That email is already registered.' });
  const status = err.status || 500;
  if (status >= 500) {
    console.error('Request failed:', err.name);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
  res.status(status).json({ error: err.type ? 'Invalid request body.' : err.message });
});

async function start() {
  for (const key of ['MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN']) {
    if (!process.env[key]) throw new Error(key + ' is required');
  }
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all(['User', 'Conversation', 'Message', 'Session'].map(name => mongoose.model(name).init()));
  server.listen(port, '0.0.0.0', () => console.log('Relay API listening on port ' + port));
}

start().catch(error => {
  console.error('Unable to start Relay API:', error.name,
    error.message?.endsWith(' is required') ? error.message : '');
  process.exit(1);
});
