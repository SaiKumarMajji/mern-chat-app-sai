# Relay

Relay is a MERN messaging app with direct and group conversations, online presence, and persistent chat history. Direct conversations also show when a recipient has read a message.

## Run locally

Use Node.js 22.13+ or Node.js 24 and a reachable MongoDB database.

1. Keep your existing environment variables in `backend/.env` or export them in the backend process. Set `MONGO_URI` to your MongoDB connection string, `JWT_SECRET` to a strong random secret, and `JWT_EXPIRES_IN` to a duration such as `7d` or a number of seconds. The API defaults to port 5000.
2. In one terminal, run `cd backend && npm ci && npm run dev`.
3. In a second terminal, run `cd frontend/chat-app && npm ci && npm run dev`.
4. Open the URL Vite prints. Use separate browser profiles or an incognito window to try messaging between two accounts.

Vite proxies `/api` and `/socket.io` to the backend. If you use a different frontend origin in development, set `CLIENT_ORIGIN` to that exact origin.

## Production

Build the frontend with `npm run build` in `frontend/chat-app`. Serve `dist` over HTTPS and proxy `/api` and `/socket.io` to the Node service on the same origin. Enable WebSocket upgrades. Start the backend with `NODE_ENV=production`, set `CLIENT_ORIGIN` to the public HTTPS origin, and use `npm start`. If deployed behind a reverse proxy, set `TRUST_PROXY_HOPS` to the actual trusted hop count so the authentication rate limiter uses the client IP. A different same-site API origin can be configured at build time with `VITE_API_URL`.

Sessions are stored in MongoDB and revoked on sign-out. Online presence and rate limiting use process memory, so run one backend instance. Horizontal scaling requires shared presence and rate-limit stores, a Socket.IO adapter, and sticky sessions if long polling is enabled.

Group owners control membership. Current group members can see the whole conversation history. Removing a member revokes access to group history and new messages.

Run `npm run lint` and `npm run build` inside `frontend/chat-app` to verify the frontend.
