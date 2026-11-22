const { Server } = require('socket.io');
const { authenticate } = require('./middleware/auth');

function realtime(server, origin) {
  const io = new Server(server, {
    cors: { origin, credentials: true },
    allowRequest: (req, callback) => callback(null, !req.headers.origin || req.headers.origin === origin),
  });

  io.use(async (socket, next) => {
    try {
      const auth = await authenticate(socket.request.headers.cookie);
      if (!auth) return next(new Error('Unauthorized'));
      socket.data.auth = auth;
      next();
    } catch {
      next(new Error('Connection unavailable'));
    }
  });

  const online = new Map();
  io.on('connection', socket => {
    const { id, sessionId, expiresAt } = socket.data.auth;
    socket.join(['user:' + id, 'session:' + sessionId]);
    const count = online.get(id) ?? 0;
    online.set(id, count + 1);
    socket.emit('presence:list', [...online.keys()]);
    if (!count) socket.broadcast.emit('presence:change', { id, online: true });

    let expiry;
    function scheduleExpiry() {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) return socket.disconnect();
      expiry = setTimeout(scheduleExpiry, Math.min(remaining, 2 ** 31 - 1));
    }
    socket.on('disconnect', () => {
      clearTimeout(expiry);
      const remaining = online.get(id) - 1;
      if (remaining) online.set(id, remaining);
      else {
        online.delete(id);
        socket.broadcast.emit('presence:change', { id, online: false });
      }
    });
    scheduleExpiry();
  });

  return {
    emit(members, event, payload) {
      io.to(members.map(member => 'user:' + member)).emit(event, payload);
    },
    disconnectSession(id) {
      io.in('session:' + id).disconnectSockets();
    },
  };
}

module.exports = realtime;
