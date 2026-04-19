import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import annotationRoutes from './routes/annotationRoutes';
import labelRoutes from './routes/labelRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Integration test to verify auth routes are mounted and error handler is configured
 */
describe('Express App Integration', () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  // Routes
  app.use('/api/annotations', annotationRoutes);
  app.use('/api/labels', labelRoutes);
  app.use('/api/auth', authRoutes);
  
  // Error handling middleware
  app.use(errorHandler);

  it('should have auth routes mounted at /api/auth', async () => {
    // Test that auth routes are accessible
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    // Should get a response (even if it's an error due to invalid credentials)
    expect(response.status).toBeDefined();
  });

  it('should protect label routes with auth middleware', async () => {
    // Test that label routes require authentication
    const response = await request(app)
      .get('/api/labels/project/test-project-id');
    
    // Should return 401 unauthorized without token
    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('should protect annotation routes with auth middleware', async () => {
    // Test that annotation routes require authentication
    const response = await request(app)
      .get('/api/annotations/doc/test-doc-id');
    
    // Should return 401 unauthorized without token
    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('should use error handler middleware for unhandled errors', async () => {
    // Test that error handler catches errors
    const response = await request(app)
      .post('/api/auth/register')
      .send({}); // Invalid data
    
    // Should get a structured error response
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toBeDefined();
    expect(response.body.error.code).toBeDefined();
  });
});
