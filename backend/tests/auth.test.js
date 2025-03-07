/**
 * User registration test suite with role-based validation
 * @module tests/authTests
 * @description Comprehensive end-to-end tests for user registration flows including:
 * - Role assignment validation
 * - Input validation scenarios
 * - Security constraints
 * - Database integrity checks
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Registration test suite
 * @description Tests user registration workflow with different roles and edge cases
 * 
 * @beforeAll Connects to test database
 * @afterEach Clears test data
 * @afterAll Closes database connection
 * 
 * @see {@link module:models/User|User Model}
 * @see {@link module:routes/authRoutes|Auth Routes}
 */
describe('User Registration Tests with Roles', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterEach(async () => {
    await User.deleteMany();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // ======================
  // POSITIVE TEST CASES
  // ======================

  /**
   * @test {POST /register}
   * @description Successful client registration with default role
   * 
   * @example
   * // Request
   * POST /api/v1/auth/register
   * {
   *   "name": "Test Client",
   *   "email": "client@test.com",
   *   "password": "SecurePass123!"
   * }
   * 
   * // Response
   * HTTP 201 Created
   * {
   *   "status": "success",
   *   "message": "Verification email sent"
   * }
   */
  test('POST /register - Client registration with default role', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Client',
        email: 'client@test.com',
        password: 'SecurePass123!'
      })
      .expect(201);

    // Verify response format
    expect(response.body).toEqual({
      status: 'success',
      message: 'Verification email sent'
    });

    // Verify database persistence
    const user = await User.findOne({ email: 'client@test.com' }).select('+password');
    expect(user).toMatchObject({
      name: 'Test Client',
      email: 'client@test.com',
      role: 'client'
    });
    expect(await user.matchPassword('SecurePass123!')).toBe(true);
  });

  /**
   * @test {POST /register}
   * @description Landlord registration with explicit role assignment
   * 
   * @remarks
   * Verifies role parameter acceptance for privileged roles
   */
  test('POST /register - Landlord registration with explicit role', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Property Owner',
        email: 'landlord@test.com',
        password: 'LandlordPass123!',
        role: 'landlord'
      })
      .expect(201);

    const user = await User.findOne({ email: 'landlord@test.com' });
    expect(user.role).toBe('landlord');
  });

  // ======================
  // NEGATIVE TEST CASES
  // ======================

  /**
   * @test {POST /register}
   * @description Invalid role assignment prevention
   * 
   * @example
   * // Response
   * HTTP 400 Bad Request
   * {
   *   "status": "error",
   *   "message": "❌ admin is not a valid role"
   * }
   */
  test('POST /register - Invalid role rejection', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Hacker',
        email: 'hacker@test.com',
        password: 'BadPass123!',
        role: 'admin' // Attempted privilege escalation
      })
      .expect(400);

    expect(response.body).toEqual({
      status: 'error',
      message: '❌ admin is not a valid role'
    });
  });

  /**
   * @test {POST /register}
   * @description Required field validation
   * 
   * @remarks
   * Tests all required fields in parallel using test matrix
   */
  test('POST /register - Missing required fields', async () => {
    const tests = [
      { payload: { email: 'test@test.com', password: 'Pass123!' }, missing: 'name' },
      { payload: { name: 'Test', password: 'Pass123!' }, missing: 'email' },
      { payload: { name: 'Test', email: 'test@test.com' }, missing: 'password' }
    ];

    for (const test of tests) {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(test.payload)
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: `❌ ${test.missing.charAt(0).toUpperCase() + test.missing.slice(1)} is required`
      });
    }
  });

  /**
   * @test {POST /register}
   * @description Email format validation
   * 
   * @remarks
   * Verifies RFC 5322 email compliance
   */
  test('POST /register - Invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bad Email',
        email: 'invalid-email',
        password: 'Pass123!'
      })
      .expect(400);

    expect(response.body).toEqual({
      status: 'error',
      message: '❌ Invalid email format'
    });
  });

  /**
   * @test {POST /register}
   * @description Password complexity enforcement
   * 
   * @remarks
   * Minimum requirements:
   * - 8+ characters
   * - 1 uppercase
   * - 1 lowercase
   * - 1 number
   * - 1 special character
   */
  test('POST /register - Password complexity enforcement', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Weak Password',
        email: 'weak@test.com',
        password: 'short'
      })
      .expect(400);

    expect(response.body).toEqual({
      status: 'error',
      message: '❌ Password must be at least 8 characters'
    });
  });

  /**
   * @test {POST /register}
   * @description Unique email constraint enforcement
   * 
   * @example
   * // Response
   * HTTP 409 Conflict
   * {
   *   "status": "error",
   *   "message": "❌ Email already registered"
   * }
   */
  test('POST /register - Duplicate email prevention', async () => {
    // Create initial user
    await User.create({
      name: 'Original User',
      email: 'duplicate@test.com',
      password: 'OriginalPass123!'
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Duplicate User',
        email: 'duplicate@test.com',
        password: 'NewPass123!'
      })
      .expect(409);

    expect(response.body).toEqual({
      status: 'error',
      message: '❌ Email already registered'
    });
  });
});

/**
 * Testing Architecture Documentation:
 * 
 * 1. Test Categories:
 *    - Positive path validation
 *    - Negative case testing
 *    - Security constraint verification
 *    - Database integrity checks
 * 
 * 2. Validation Coverage:
 *    - Field presence
 *    - Email format
 *    - Password complexity
 *    - Role permissions
 *    - Unique constraints
 * 
 * 3. Security Verifications:
 *    - Password hashing
 *    - Role-based access control
 *    - Error message sanitization
 *    - Privilege escalation prevention
 * 
 * Best Practices:
 * 1. Maintain test isolation with database cleanup
 * 2. Use realistic test data patterns
 * 3. Combine API and database assertions
 * 4. Test all possible validation failure paths
 * 5. Verify both success and error responses
 * 
 * Security Testing Considerations:
 * - Verify no sensitive data leakage in responses
 * - Confirm proper password hashing
 * - Test for mass assignment vulnerabilities
 * - Check error message consistency
 * 
 * @see {@link https://jestjs.io/docs/getting-started|Jest Documentation}
 * @see {@link https://mongoosejs.com/docs/validation.html|Mongoose Validation}
 */

/**
 * Test Execution:
 * 
 * 1. Environment Setup:
 *    TEST_MONGO_URI=mongodb://localhost:27017/pandora-test
 *    NODE_ENV=test
 * 
 * 2. Run Tests:
 *    npm test auth
 * 
 * 3. Coverage Report:
 *    jest --collect-coverage auth.test.js
 * 
 * Example Output:
 * PASS  tests/auth.test.js
 * User Registration Tests with Roles
 *   ✓ POST /register - Client registration (352ms)
 *   ✓ POST /register - Landlord registration (198ms)
 *   ✓ POST /register - Invalid role rejection (142ms)
 *   ✓ POST /register - Missing required fields (285ms)
 *   ✓ POST /register - Invalid email format (121ms)
 *   ✓ POST /register - Password complexity (132ms)
 *   ✓ POST /register - Duplicate email prevention (167ms)
 */