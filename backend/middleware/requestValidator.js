// Create a new file middleware/requestValidator.js
const { query } = require('express-validator');

const validateHistoryRequest = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1-100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Update the history endpoint in mpesaRoutes.js
router.get("/history/:phone", validateHistoryRequest, asyncHandler(async (req, res) => {
  // ... existing code ...
}));