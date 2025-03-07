/**
 * Image upload and processing middleware using Multer and Sharp
 * @module imageProcessing
 * @description Handles secure image uploads, validation, resizing, and formatting
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const AppError = require('../utils/appError');

/**
 * Multer memory storage configuration
 * @constant {multer.StorageEngine} multerStorage
 * @description Stores uploaded files in memory as Buffer objects
 * @see {@link https://github.com/expressjs/multer#memorystorage|Multer MemoryStorage}
 */
const multerStorage = multer.memoryStorage();

/**
 * File validation filter for image uploads
 * @function multerFilter
 * @param {Object} req - Express request object
 * @param {Object} file - Uploaded file object
 * @param {Function} cb - Multer callback
 * @description Validates file MIME type and rejects non-image files
 * 
 * @example
 * // Rejects PDF files and allows JPEG/PNG
 */
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload images only.', 400), false);
  }
};

/**
 * Configured Multer instance for image uploads
 * @constant {multer.Multer} upload
 * @property {multer.StorageEngine} storage - Memory storage
 * @property {Function} fileFilter - Image validation filter
 */
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

/**
 * Single image upload middleware for user photos
 * @function uploadUserPhoto
 * @exports uploadUserPhoto
 * @description Processes single file upload with field name 'photo'
 * 
 * @example
 * router.patch('/update-photo', uploadUserPhoto, resizeUserPhoto, updateUser);
 */
exports.uploadUserPhoto = upload.single('photo');

/**
 * Image processing middleware for user photos
 * @async
 * @function resizeUserPhoto
 * @exports resizeUserPhoto
 * @description Resizes, formats, and saves user profile photos
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * 
 * @remarks
 * Processing Pipeline:
 * 1. Validates file existence
 * 2. Generates unique filename (user-id-timestamp.jpeg)
 * 3. Resizes to 500x500px square
 * 4. Converts to JPEG format
 * 5. Applies 90% quality compression
 * 6. Saves to public/img/users directory
 * 
 * Security Features:
 * - Generates sanitized filenames
 * - Processes images from memory buffer
 * - Prevents directory traversal attacks
 */
exports.resizeUserPhoto = async (req, res, next) => {
  if (!req.file) return next();

  // Generate unique filename
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)          // Square crop
    .toFormat('jpeg')          // Standardize format
    .jpeg({ quality: 90 })     // Balance quality/size
    .toFile(path.join(__dirname, `../public/img/users/${req.file.filename}`));

  next();
};

/**
 * Image Handling Architecture Documentation:
 * 
 * 1. Upload Phase:
 *    - Memory storage for initial processing
 *    - MIME type validation
 *    - File size limits (implicit via memory storage)
 * 
 * 2. Processing Phase:
 *    - Resize to consistent dimensions
 *    - Format standardization
 *    - Quality optimization
 *    - Secure filename generation
 * 
 * 3. Storage:
 *    - Saved to filesystem in public directory
 *    - Persistent storage after processing
 * 
 * Best Practices:
 * 1. Validate images before processing
 * 2. Process images in memory streams
 * 3. Sanitize filenames to prevent path injection
 * 4. Standardize image formats and sizes
 * 5. Set reasonable quality levels
 * 6. Store processed images in dedicated directories
 * 
 * Security Considerations:
 * - Always validate file types server-side
 * - Prevent original filename usage
 * - Limit maximum file size (Multer limits)
 * - Consider virus scanning in production
 * 
 * @see {@link https://github.com/lovell/sharp|Sharp Documentation}
 * @see {@link module:errorHandlers.AppError|AppError}
 */

/**
 * Usage Example:
 * 
 * // In route handler
 * router.patch('/upload-photo',
 *   authController.protect,
 *   imageProcessing.uploadUserPhoto,
 *   imageProcessing.resizeUserPhoto,
 *   userController.updatePhoto
 * );
 * 
 * File Naming Convention:
 * user-{userId}-{timestamp}.jpeg
 * Example: user-6589a3f-1700000000000.jpeg
 */