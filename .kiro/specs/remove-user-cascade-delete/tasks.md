# Implementation Plan: Remove User Cascade Delete

## Overview

This implementation plan breaks down the cascade deletion feature into discrete coding tasks. The feature modifies the existing `removeProjectMember` controller function to delete all project-scoped user data (Annotation_Comments, Annotations, Labels) before removing the ProjectMember record, ensuring referential integrity through a transactional approach.

## Tasks

- [x] 1. Set up testing infrastructure
  - Install fast-check property-based testing library: `npm install --save-dev fast-check`
  - Create test file: `backend/src/controllers/projectMemberController.test.ts`
  - Set up test database configuration and cleanup utilities
  - Import necessary testing dependencies (jest, prisma, fast-check)
  - _Requirements: 4.1, 10.1_

- [x] 2. Implement core cascade delete logic in removeProjectMember
  - [x] 2.1 Wrap existing logic in Prisma transaction block
    - Replace direct Prisma calls with `prisma.$transaction(async (tx) => { ... })`
    - Move all database operations inside transaction callback
    - _Requirements: 4.1, 4.2_
  
  - [x] 2.2 Add member existence verification
    - Query ProjectMember record within transaction before deletion
    - Throw custom error 'MEMBER_NOT_FOUND' if member doesn't exist
    - _Requirements: 9.2_
  
  - [x] 2.3 Add owner self-removal prevention check
    - Compare memberId with project.ownerId
    - Throw custom error 'CANNOT_REMOVE_OWNER' if they match
    - _Requirements: 9.3_
  
  - [x] 2.4 Implement project document ID fetching
    - Query all documents belonging to the project: `tx.document.findMany({ where: { projectId }, select: { id: true } })`
    - Extract document IDs into array for filtering annotations and comments
    - _Requirements: 2.2, 3.2_
  
  - [x] 2.5 Implement Annotation_Comment deletion
    - Delete comments where userId matches and annotation.docId is in project documents
    - Use nested where clause: `annotation: { docId: { in: docIds } }`
    - Store deletion count in variable
    - _Requirements: 3.1, 3.3, 3.4_
  
  - [x] 2.6 Implement Annotation deletion
    - Delete annotations where userId matches and docId is in project documents
    - Use where clause: `userId: memberId, docId: { in: docIds }`
    - Store deletion count in variable
    - _Requirements: 2.1, 2.3, 2.4_
  
  - [x] 2.7 Implement Label deletion
    - Delete labels where userId and projectId match
    - Use where clause: `userId: memberId, projectId`
    - Store deletion count in variable
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 2.8 Delete ProjectMember record
    - Delete using composite key: `projectId_userId: { projectId, userId: memberId }`
    - This is the final deletion in the transaction
    - _Requirements: 6.5_
  
  - [x] 2.9 Return deletion counts from transaction
    - Return object with labels, annotations, and comments counts
    - Format: `{ labels: number, annotations: number, comments: number }`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3. Implement error handling and logging
  - [x] 3.1 Add custom error handling for transaction errors
    - Catch errors thrown from transaction
    - Map 'PROJECT_NOT_FOUND' to 404 response
    - Map 'MEMBER_NOT_FOUND' to 404 response
    - Map 'CANNOT_REMOVE_OWNER' to 400 response
    - Map other errors to 500 response
    - _Requirements: 4.3, 8.2, 8.5, 9.2, 9.3, 9.5_
  
  - [x] 3.2 Add operation logging
    - Log successful operations at INFO level with projectId, memberId, requestedBy userId, and deletion counts
    - Log format: `Member removed from project. ProjectId: ${projectId}, MemberId: ${memberId}, RequestedBy: ${userId}, Deleted: ${JSON.stringify(result)}`
    - Log errors at ERROR level with error message
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 3.3 Update success response format
    - Return JSON with message and deleted counts
    - Format: `{ message: 'Member removed successfully', deleted: { labels, annotations, comments } }`
    - _Requirements: 7.5_

- [x] 4. Checkpoint - Ensure implementation compiles and basic structure is correct
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Write unit tests for core functionality
  - [ ]* 5.1 Write test: Successful cascade delete
    - Setup: Create project, member, labels (3), annotations (5), comments (2)
    - Action: Remove member as project owner
    - Assert: All project-scoped data deleted, member removed, correct counts returned
    - _Requirements: 1.1, 2.1, 3.1, 7.1_
  
  - [ ]* 5.2 Write test: Authorization - Non-owner cannot remove
    - Setup: Create project with owner and member, authenticate as different user
    - Action: Attempt to remove member
    - Assert: 404 error, no data deleted, member still exists
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 5.3 Write test: Owner cannot remove self
    - Setup: Create project with owner
    - Action: Owner attempts to remove self
    - Assert: 400 error with "Cannot remove project owner", owner remains
    - _Requirements: 9.3_
  
  - [ ]* 5.4 Write test: Member not found
    - Setup: Create project
    - Action: Attempt to remove non-existent member
    - Assert: 404 error with "Member not found"
    - _Requirements: 9.2_
  
  - [ ]* 5.5 Write test: Project not found
    - Setup: None
    - Action: Attempt to remove member from non-existent project
    - Assert: 404 error
    - _Requirements: 8.4, 8.5_
  
  - [ ]* 5.6 Write test: Empty data set
    - Setup: Create project and member with no labels/annotations/comments
    - Action: Remove member
    - Assert: Success with zero counts for all categories
    - _Requirements: 9.1_
  
  - [ ]* 5.7 Write test: Transaction rollback on error
    - Setup: Create project with member and data, mock database error during annotation deletion
    - Action: Attempt to remove member
    - Assert: All data remains unchanged, member still exists, 500 error returned
    - _Requirements: 4.2, 4.3_

- [ ]* 6. Write property-based tests for correctness properties
  - [ ]* 6.1 Write property test for Project Scope Isolation
    - **Property 1: Project Scope Isolation (Invariant)**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - Generate: User, ProjectA, ProjectB, data in both projects
    - Action: Remove user from ProjectA
    - Assert: All data in ProjectB unchanged (labels, annotations, comments)
    - Use fast-check to generate random data amounts
  
  - [ ]* 6.2 Write property test for Complete Cascade
    - **Property 2: Complete Cascade (Invariant)**
    - **Validates: Requirements 1.1, 2.1, 3.1, 6.1, 6.2, 6.3**
    - Generate: User, project, random amounts of labels/annotations/comments
    - Action: Remove user from project
    - Assert: All counts are zero for that user in that project
    - Use fast-check to generate random data amounts (0-50 of each type)
  
  - [ ]* 6.3 Write property test for Deletion Count Accuracy
    - **Property 6: Deletion Count Accuracy (Metamorphic)**
    - **Validates: Requirements 7.2, 7.3, 7.4**
    - Generate: User, project, random data
    - Action: Count before, remove user, count after
    - Assert: Response counts match actual deletion counts
    - Use fast-check to generate random data amounts

- [ ]* 7. Write integration tests
  - [ ]* 7.1 Write integration test: End-to-end cascade delete via HTTP
    - Setup: Start test server, create project with member and data via API
    - Action: Send DELETE request to `/api/projects/:projectId/members/:memberId`
    - Assert: 200 response, correct deletion counts, verify database state
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 4.5_
  
  - [ ]* 7.2 Write integration test: Multi-user project scenario
    - Setup: Create project with 3 members, each with labels/annotations/comments
    - Action: Remove one member
    - Assert: Only removed member's data deleted, other members' data intact
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 7.3 Write integration test: Concurrent removal attempts
    - Setup: Create project with member
    - Action: Send two simultaneous DELETE requests for same member
    - Assert: One succeeds with 200, one fails with 404
    - _Requirements: 9.4_

- [x] 8. Final checkpoint - Verify all functionality and run full test suite
  - Run all unit tests: `npm test projectMemberController.test.ts`
  - Run all integration tests: `npm test integration.test.ts`
  - Verify no regressions in existing functionality
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses TypeScript with Prisma ORM
- All database operations are wrapped in a transaction for atomicity
- Property-based tests use fast-check library to validate universal properties
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end HTTP request/response flows
- Deletion order (Comments → Annotations → Labels → ProjectMember) respects foreign key constraints
- The existing authorization check (project owner verification) is preserved
