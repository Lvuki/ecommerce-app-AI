// Simple in-memory rate limiter middleware
// Not suitable for multi-instance deployments; for production use a shared store (Redis) or express-rate-limit
module.exports = function rateLimit(options = {}) {
  const windowMs = options.windowMs || 60 * 60 * 1000; // 1 hour
  const max = options.max || 10; // max requests per window per IP
  const hits = new Map(); // ip -> [timestamps]

  // periodic cleanup to avoid memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, arr] of hits.entries()) {
      const filtered = arr.filter(t => now - t < windowMs);
      if (filtered.length) hits.set(ip, filtered);
      else hits.delete(ip);
    }
  }, Math.max(60000, Math.floor(windowMs / 10))).unref && setInterval(() => {}, 0);

  return (req, res, next) => {
    try {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();
      const arr = hits.get(ip) || [];
      // remove expired
      const windowed = arr.filter(t => now - t < windowMs);
      if (windowed.length >= max) {
        res.status(429).json({ error: 'Too many rating requests, please try again later' });
        return;
      }
      windowed.push(now);
      hits.set(ip, windowed);
      next();
    } catch (e) {
      // on error, allow the request (fail-open)
      next();
    }
  };
};
