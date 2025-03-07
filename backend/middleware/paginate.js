/**
 * Database pagination middleware for API endpoints
 * @function paginateResults
 * @description Provides standardized pagination for MongoDB queries
 * @param {mongoose.Model} model - Mongoose model to paginate
 * @returns {Function} Async middleware function
 * 
 * @example
 * // In route handler
 * router.get('/users', paginateResults(User), (req, res) => {
 *   res.json(res.paginatedResults);
 * });
 * 
 * @remarks
 * Pagination Features:
 * - Page number and limit from query params
 * - Default values (page=1, limit=10)
 * - Previous/next page metadata
 * - Total count and page numbers
 * - Consistent response format
 */
exports.paginateResults = (model) => async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    
    try {
      const results = {};
      
      // Total documents count
      results.total = await model.countDocuments();
      results.totalPages = Math.ceil(results.total / limit);
      
      // Previous page metadata
      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit
        };
      }
      
      // Next page metadata
      if (startIndex + limit < results.total) {
        results.next = {
          page: page + 1,
          limit
        };
      }
      
      // Paginated data
      results.data = await model.find().limit(limit).skip(startIndex);
      
      // Attach to response object
      res.paginatedResults = results;
      next();
    } catch (err) {
      next(new AppError('Pagination failed', 500));
    }
  };
  
  /**
   * Pagination Response Structure:
   * @typedef {Object} PaginationResult
   * @property {number} total - Total number of documents
   * @property {number} totalPages - Total number of pages
   * @property {Object} [previous] - Previous page details
   * @property {number} previous.page - Previous page number
   * @property {number} previous.limit - Results per page
   * @property {Object} [next] - Next page details
   * @property {number} next.page - Next page number
   * @property {number} next.limit - Results per page
   * @property {Array} data - Paginated results array
   */
  
  /**
   * Best Practices:
   * 1. Add index sorting for consistent pagination
   * 2. Implement maximum limit restriction
   * 3. Include filtering parameters in pagination links
   * 4. Cache frequent pagination queries
   * 5. Add performance metrics for large datasets
   * 
   * Security Considerations:
   * - Validate limit/page parameters
   * - Set reasonable maximum limits
   * - Sanitize query parameters
   * - Use lean() for read-only operations
   * 
   * @see {@link module:errorHandlers.AppError|AppError}
   * @see {@link https://mongoosejs.com/docs/pagination.html|Mongoose Pagination}
   */
  
  /**
   * Usage Notes:
   * 1. Access paginated results via res.paginatedResults
   * 2. Combine with filtering middleware:
   *    router.get('/posts', filterPosts, paginateResults(Post), ...)
   * 3. Add sorting parameter support:
   *    .sort(req.query.sort || '-createdAt')
   * 
   * Example Response:
   * {
   *   "total": 100,
   *   "totalPages": 10,
   *   "previous": { "page": 1, "limit": 10 },
   *   "next": { "page": 3, "limit": 10 },
   *   "data": [...] // 10 items
   * }
   */