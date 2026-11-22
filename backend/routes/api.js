const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/auth');
const chat = require('../controllers/chat');
const { requireAuth } = require('../middleware/auth');

const router = Router();
const authLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 25,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again later.' },
});

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.post('/auth/signup', authLimit, auth.signup);
router.post('/auth/login', authLimit, auth.login);
router.use(requireAuth);
router.get('/auth/me', auth.me);
router.post('/auth/logout', auth.logout);
router.get('/users', chat.users);
router.get('/conversations', chat.conversations);
router.post('/conversations/direct', chat.direct);
router.post('/conversations/group', chat.group);
router.put('/conversations/:id/members/:userId', chat.changeMember);
router.delete('/conversations/:id/members/:userId', chat.changeMember);
router.get('/conversations/:id/messages', chat.history);
router.post('/conversations/:id/messages', chat.send);
router.post('/conversations/:id/read', chat.read);

module.exports = router;
