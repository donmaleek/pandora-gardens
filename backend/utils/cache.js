/**
 * Redis-based caching middleware for Express applications
 * @module cachingMiddleware
 * @description Provides response caching layer with Redis integration
 */

const redis = require('redis');
const { promisify } = require('util');

/**
 * Redis client configuration
 * @constant {RedisClient} client
 * @description Configured Redis client using environment variables
 * 
 * @property {string} host - Redis server host
 * @property {number} port - Redis server port
 * @property {string} password - Redis authentication password
 * 
 * @see {@link https://github.com/redis/node-redis|Redis Node Client}
 */
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

// Handle Redis connection errors
client.on('error', (err) => console.error('Redis Client Error:', err));

/**
 * Promisified Redis commands
 * @namespace redisCommands
 * @property {Function} getAsync - Async GET command
 * @property {Function} setAsync - Async SET command
 */
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

/**
 * Cache middleware factory function
 * @function cacheMiddleware
 * @param {string} key - Redis cache key
 * @param {number} [ttl=3600] - Time-to-live in seconds (default: 1 hour)
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Cache products list for 30 minutes
 * router.get('/products', cacheMiddleware('products', 1800), getProducts);
 * 
 * @remarks
 * Caching Strategy:
 * 1. Check for cached data using provided key
 * 2. Return cached data immediately if exists
 * 3. Cache new responses automatically on send
 * 4. Override res.json to intercept responses
 * 
 * Error Handling:
 * - Fails gracefully (continues without caching)
 * - Never blocks request processing
 */
exports.cacheMiddleware = (key, ttl = 3600) => async (req, res, next) => {
  try {
    // Check cache
    const cachedData = await getAsync(key);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // Override response method to cache responses
    res.sendResponse = res.json;
    res.json = (body) => {
      setAsync(key, JSON.stringify(body), 'EX', ttl)
        .catch(err => console.error('Cache set error:', err));
      res.sendResponse(body);
    };

    next();
  } catch (err) {
    // Fail open on cache errors
    next();
  }
};

/**
 * Caching Architecture Documentation:
 * 
 * 1. Cache Key Management:
 *    - Requires explicit key definition
 *    - Should be unique per resource collection
 *    - Consider dynamic key generation for per-user caching
 * 
 * 2. Cache Invalidation:
 *    - Automatic expiration via TTL
 *    - Manual invalidation required for data changes
 *    - Consider cache versioning for breaking changes
 * 
 * 3. Performance:
 *    - Average Redis response time < 1ms
 *    - Serialization/deserialization overhead
 *    - Network latency considerations for remote Redis
 * 
 * Best Practices:
 * 1. Use meaningful cache keys (e.g., 'products:list')
 * 2. Set appropriate TTLs based on data volatility
 * 3. Implement cache busting on data mutations
 * 4. Monitor cache hit/miss ratios
 * 5. Use compression for large datasets
 * 
 * Security Considerations:
 * - Secure Redis connections (TLS in production)
 * - Restrict Redis network access
 * - Rotate Redis credentials regularly
 * - Sanitize cache keys to prevent injection
 * 
 * @see {@link module:errorHandlers|Error Handling}
 */

/**
 * Usage Example:
 * 
 * // Controller
 * const getProducts = async (req, res) => {
 *   const products = await Product.find();
 *   res.json(products);
 * };
 * 
 * // Route with caching
 * router.get('/products',
 *   cacheMiddleware('products:all', 600), // 10 minute cache
 *   getProducts
 * );
 * 
 * // Cache busting endpoint
 * router.post('/products', (req, res) => {
 *   // ... create product ...
 *   client.del('products:all'); // Manual invalidation
 * });
 */