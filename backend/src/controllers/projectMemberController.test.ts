import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import * as fc from 'fast-check';
import prisma from '../config/db';
import { removeProjectMember } from './projectMemberController';

/**
 * Test suite for projectMemberController cascade deletion functionality
 * 
 * This test file validates the cascade deletion of user data when a project member is removed.
 * It includes:
 * - Unit tests for specific scenarios and edge cases
 * - Property-based tests for universal invariants
 * - Integration tests for end-to-end flows
 * 
 * Requirements tested: 1.1-10.5 (see requirements.md)
 */

describe('ProjectMemberController - Cascade Delete', () => {
  // Store created resource IDs for cleanup
  const createdUserIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdDocumentIds: string[] = [];
  const createdLabelIds: string[] = [];
  const createdAnnotationIds: string[] = [];
  const createdCommentIds: string[] = [];
  const createdMemberIds: string[] = [];

  /**
   * Helper function to create a test user
   */
  async function createTestUser(email: string, username: string): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: 'hashedpassword123',
      },
    });
    createdUserIds.push(user.id);
    return user.id;
  }

  /**
   * Helper function to create a test project
   */
  async function createTestProject(ownerId: string, name: string): Promise<string> {
    const project = await prisma.project.create({
      data: {
        name,
        ownerId,
      },
    });
    createdProjectIds.push(project.id);
    return project.id;
  }

  /**
   * Helper function to create a test document
   */
  async function createTestDocument(projectId: string, title: string): Promise<string> {
    const document = await prisma.document.create({
      data: {
        title,
        projectId,
        kind: 'text',
        content: 'Test content',
      },
    });
    createdDocumentIds.push(document.id);
    return document.id;
  }

  /**
   * Helper function to create a test label
   */
  async function createTestLabel(
    projectId: string,
    userId: string,
    name: string
  ): Promise<string> {
    const label = await prisma.label.create({
      data: {
        name,
        color: '#FF0000',
        projectId,
        userId,
      },
    });
    createdLabelIds.push(label.id);
    return label.id;
  }

  /**
   * Helper function to create a test annotation
   */
  async function createTestAnnotation(
    docId: string,
    labelId: string,
    userId: string
  ): Promise<string> {
    const annotation = await prisma.annotation.create({
      data: {
        docId,
        labelId,
        userId,
        content: 'Test annotation',
        startOffset: 0,
        endOffset: 10,
      },
    });
    createdAnnotationIds.push(annotation.id);
    return annotation.id;
  }

  /**
   * Helper function to create a test comment
   */
  async function createTestComment(
    annotationId: string,
    userId: string
  ): Promise<string> {
    const comment = await prisma.annotationComment.create({
      data: {
        annotationId,
        userId,
        content: 'Test comment',
      },
    });
    createdCommentIds.push(comment.id);
    return comment.id;
  }

  /**
   * Helper function to add a project member
   */
  async function addProjectMember(
    projectId: string,
    userId: string,
    role: 'VIEWER' | 'EDITOR' = 'VIEWER'
  ): Promise<string> {
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });
    createdMemberIds.push(member.id);
    return member.id;
  }

  /**
   * Helper function to create a mock Express request
   */
  function createMockRequest(
    userId: string | undefined,
    projectId: string,
    memberId: string
  ): Partial<Request> {
    return {
      user: userId ? { userId, email: 'test@example.com', username: 'testuser' } : undefined,
      params: { projectId, memberId },
    };
  }

  /**
   * Helper function to create a mock Express response
   */
  function createMockResponse(): {
    res: Partial<Response>;
    jsonMock: ReturnType<typeof vi.fn>;
    statusMock: ReturnType<typeof vi.fn>;
  } {
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const res: Partial<Response> = {
      json: jsonMock,
      status: statusMock,
    };

    return { res, jsonMock, statusMock };
  }

  /**
   * Clean up all test data after each test
   */
  afterEach(async () => {
    // Delete in reverse order of dependencies
    if (createdCommentIds.length > 0) {
      await prisma.annotationComment.deleteMany({
        where: { id: { in: createdCommentIds } },
      });
      createdCommentIds.length = 0;
    }

    if (createdAnnotationIds.length > 0) {
      await prisma.annotation.deleteMany({
        where: { id: { in: createdAnnotationIds } },
      });
      createdAnnotationIds.length = 0;
    }

    if (createdLabelIds.length > 0) {
      await prisma.label.deleteMany({
        where: { id: { in: createdLabelIds } },
      });
      createdLabelIds.length = 0;
    }

    if (createdMemberIds.length > 0) {
      await prisma.projectMember.deleteMany({
        where: { id: { in: createdMemberIds } },
      });
      createdMemberIds.length = 0;
    }

    if (createdDocumentIds.length > 0) {
      await prisma.document.deleteMany({
        where: { id: { in: createdDocumentIds } },
      });
      createdDocumentIds.length = 0;
    }

    if (createdProjectIds.length > 0) {
      await prisma.project.deleteMany({
        where: { id: { in: createdProjectIds } },
      });
      createdProjectIds.length = 0;
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }

    vi.clearAllMocks();
  });

  describe('Unit Tests - Core Functionality', () => {
    it('should be defined', () => {
      expect(removeProjectMember).toBeDefined();
    });

    it('should verify fast-check is working', () => {
      // Simple property test to verify fast-check is properly configured
      fc.assert(
        fc.property(fc.integer(), (n) => {
          return n + 0 === n;
        })
      );
    });

    /**
     * Test: Member not found
     * Validates Requirement 9.2
     * Task 2.2: Add member existence verification
     */
    it('should return 404 when member does not exist', async () => {
      // Setup: Create project with owner
      const ownerId = await createTestUser('owner@test.com', 'owner');
      const projectId = await createTestProject(ownerId, 'Test Project');
      const nonExistentMemberId = 'non-existent-user-id';

      // Action: Attempt to remove non-existent member
      const req = createMockRequest(ownerId, projectId, nonExistentMemberId);
      const { res, jsonMock, statusMock } = createMockResponse();

      await removeProjectMember(req as Request, res as Response);

      // Assert: 404 error with "Member not found"
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Member not found' });
    });

    /**
     * Test: Return deletion counts from transaction
     * Validates Requirements 7.1, 7.2, 7.3, 7.4
     * Task 2.9: Return deletion counts from transaction
     */
    it('should return deletion counts in correct format', async () => {
      // Setup: Create project with owner, member, and data
      const ownerId = await createTestUser('owner2@test.com', 'owner2');
      const memberId = await createTestUser('member2@test.com', 'member2');
      const projectId = await createTestProject(ownerId, 'Test Project 2');
      const docId = await createTestDocument(projectId, 'Test Document');
      
      // Add member to project
      await addProjectMember(projectId, memberId);
      
      // Create labels, annotations, and comments for the member
      const labelId1 = await createTestLabel(projectId, memberId, 'Label 1');
      const labelId2 = await createTestLabel(projectId, memberId, 'Label 2');
      
      const annotationId1 = await createTestAnnotation(docId, labelId1, memberId);
      const annotationId2 = await createTestAnnotation(docId, labelId2, memberId);
      const annotationId3 = await createTestAnnotation(docId, labelId1, memberId);
      
      const commentId1 = await createTestComment(annotationId1, memberId);
      const commentId2 = await createTestComment(annotationId2, memberId);

      // Action: Remove member as project owner
      const req = createMockRequest(ownerId, projectId, memberId);
      const { res, jsonMock, statusMock } = createMockResponse();

      await removeProjectMember(req as Request, res as Response);

      // Assert: Success response with correct deletion counts
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Member removed successfully',
        deleted: {
          labels: 2,
          annotations: 3,
          comments: 2,
        },
      });

      // Verify member was actually removed
      const memberExists = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: memberId,
          },
        },
      });
      expect(memberExists).toBeNull();

      // Verify all data was deleted
      const remainingLabels = await prisma.label.count({
        where: { userId: memberId, projectId },
      });
      const remainingAnnotations = await prisma.annotation.count({
        where: { userId: memberId, docId },
      });
      const remainingComments = await prisma.annotationComment.count({
        where: { userId: memberId },
      });

      expect(remainingLabels).toBe(0);
      expect(remainingAnnotations).toBe(0);
      expect(remainingComments).toBe(0);
    });
  });

  describe('Property-Based Tests', () => {
    it.todo('Property-based tests will be added in subsequent tasks');
  });

  describe('Integration Tests', () => {
    it.todo('Integration tests will be added in subsequent tasks');
  });
});
