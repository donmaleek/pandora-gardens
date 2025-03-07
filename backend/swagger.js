/**
 * API documentation configuration using OpenAPI 3.0
 * @module apiDocs
 * @description Configures Swagger UI for API documentation and exploration
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * OpenAPI specification options
 * @constant {Object} options
 * @property {Object} definition - OpenAPI metadata and structure
 * @property {string[]} apis - Path to route files containing JSDoc annotations
 * 
 * @see {@link https://swagger.io/specification/|OpenAPI Specification}
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pandora Gardens API',
      version: '1.0.0',
      description: 'API for managing garden properties and users',
    },
    servers: [{ 
      url: 'http://localhost:5000/api/v1',
      description: 'Development server' 
    }],
    components: {
      securitySchemes: {
        /**
         * JWT Authentication configuration
         * @typedef {Object} SecurityScheme
         * @property {string} type - HTTP authentication scheme
         * @property {string} scheme - Bearer token type
         * @property {string} bearerFormat - JWT format indication
         */
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js'] // Scan routes for JSDoc comments
};

/**
 * Generated OpenAPI specification
 * @constant {Object} specs
 * @description Compiled API documentation from JSDoc annotations
 */
const specs = swaggerJsdoc(options);

/**
 * Swagger UI setup middleware
 * @function
 * @param {Object} app - Express application instance
 * 
 * @example
 * // In main app file:
 * const setupDocs = require('./config/swagger');
 * setupDocs(app);
 */
module.exports = (app) => {
  /**
   * Swagger UI endpoint
   * @route {GET} /api-docs
   * @description Interactive API documentation portal
   */
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};

/**
 * API Documentation Architecture:
 * 
 * 1. Specification:
 *    - OpenAPI 3.0 standard
 *    - Auto-generated from JSDoc comments
 *    - Integrated security scheme definitions
 * 
 * 2. Live Documentation Features:
 *    - Interactive endpoint testing
 *    - Schema visualization
 *    - Authentication testing
 *    - Response format examples
 * 
 * 3. Security Integration:
 *    - JWT bearer token support
 *    - Global security scheme definition
 *    - Auth headers auto-injected in Swagger UI
 * 
 * Best Practices:
 * 1. Keep description fields updated
 * 2. Maintain accurate response schemas
 * 3. Document all error responses
 * 4. Use @openapi tags in route handlers
 * 5. Protect docs endpoint in production
 * 
 * @see {@link module:routes/authRoutes|Authentication Routes}
 * @see {@link module:securityMiddlewares|Security Middlewares}
 */

/**
 * Usage Example:
 * 
 * // In route file:
 * /**
 *  * @openapi
 *  * /gardens:
 *  *   get:
 *  *     summary: Get all gardens
 *  *     security:
 *  *       - bearerAuth: []
 *  *     responses:
 *  *       200:
 *  *         description: List of gardens
 *  *\/
 * router.get('/gardens', controller.getGardens);
 * 
 * Access documentation at:
 * http://localhost:5000/api-docs/
 */

/**
 * Environment Considerations:
 * - Production server URL should be configured
 * - Disable docs in production if not needed
 * - Add rate limiting to docs endpoint
 * - Consider basic auth for docs access
 */