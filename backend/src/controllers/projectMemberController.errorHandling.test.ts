import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { removeProjectMember } from './projectMemberController';
import prisma from '../config/db';

/**
 * Test suite for Task 3.1: Custom error handling for transaction errors
 * 
 * This test file validates that the removeProjectMember function properly handles
 * and maps transaction errors to appropriate HTTP status codes.
 * 
 * Requirements tested: 4.3, 8.2, 8.5, 9.2, 9.3, 9.5
 */

// Mock the prisma client
vi.mock('../config/db', () => ({
  default: {
    $transaction: vi.fn(),
    project: {
      findFirst: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Task 3.1: Error Handling for Transaction Errors', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock response
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Setup mock request with authenticated user
    mockRequest = {
      user: {
        userId: 'owner-user-id',
        email: 'owner@test.com',
        username: 'owner',
      },
      params: {
        projectId: 'test-project-id',
        memberId: 'test-member-id',
      },
    };
  });

  it('should map PROJECT_NOT_FOUND error to 404 response', async () => {
    // Mock transaction to throw PROJECT_NOT_FOUND error
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('PROJECT_NOT_FOUND'));

    await removeProjectMember(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Project not found or unauthorized' });
  });

  it('should map MEMBER_NOT_FOUND error to 404 response', async () => {
    // Mock transaction to throw MEMBER_NOT_FOUND error
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('MEMBER_NOT_FOUND'));

    await removeProjectMember(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Member not found' });
  });

  it('should map CANNOT_REMOVE_OWNER error to 400 response', async () => {
    // Mock transaction to throw CANNOT_REMOVE_OWNER error
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('CANNOT_REMOVE_OWNER'));

    await removeProjectMember(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Cannot remove project owner' });
  });

  it('should map other errors to 500 response', async () => {
    // Mock transaction to throw a generic database error
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Database connection failed'));

    await removeProjectMember(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to remove member' });
  });

  it('should return 401 when user is not authenticated', async () => {
    // Remove user from request
    mockRequest.user = undefined;

    await removeProjectMember(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'User not authenticated' });
  });

  it('should catch errors thrown from transaction', async () => {
    // Mock transaction to throw an error
    const testError = new Error('Test transaction error');
    vi.mocked(prisma.$transaction).mockRejectedValue(testError);

    // Should not throw - error should be caught and handled
    await expect(
      removeProjectMember(mockRequest as Request, mockResponse as Response)
    ).resolves.not.toThrow();

    // Should return 500 for unrecognized errors
    expect(statusMock).toHaveBeenCalledWith(500);
  });
});
