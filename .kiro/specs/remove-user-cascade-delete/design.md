# Design Document

## Overview

This design document specifies the implementation approach for cascade deletion of user data when a project member is removed. The solution modifies the existing `removeProjectMember` controller function to delete all project-scoped data (Annotation_Comments, Annotations, Labels) before removing the ProjectMember record, ensuring referential integrity and data consistency.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    removeProjectMember                       │
│                     (Controller Layer)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Prisma Transaction Block                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Verify Authorization (Project Owner)               │  │
│  │ 2. Verify Member Exists                               │  │
│  │ 3. Prevent Owner Self-Removal                         │  │
│  │ 4. Delete Annotation_Comments (project-scoped)        │  │
│  │ 5. Delete Annotations (project-scoped)                │  │
│  │ 6. Delete Labels (project-scoped)                     │  │
│  │ 7. Delete ProjectMember record (removes permissions)  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Return Deletion Summary                         │
│  { message, deleted: { labels, annotations, comments } }    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Request**: DELETE `/api/projects/:projectId/members/:memberId`
2. **Authorization**: Verify requesting user is project owner
3. **Validation**: Check member exists and is not the project owner
4. **Cascade Delete**: Within a transaction, delete in order:
   - Annotation_Comments (where userId matches and annotation belongs to project)
   - Annotations (where userId matches and document belongs to project)
   - Labels (where userId and projectId match)
   - ProjectMember record (removes all permissions)
5. **Response**: Return deletion counts

## Implementation Details

### Modified Function: `removeProjectMember`

**Location**: `backend/src/controllers/projectMemberController.ts`

**Current Implementation Issues**:
- Only deletes ProjectMember record
- Leaves orphaned Labels, Annotations, and Annotation_Comments
- No transaction handling
- No deletion summary returned

**New Implementation**:

```typescript
export const removeProjectMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const memberId = req.params.memberId as string;

    // Execute all operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify ownership
      const project = await tx.project.findFirst({
        where: { id: projectId, ownerId: userId },
      });

      if (!project) {
        throw new Error('PROJECT_NOT_FOUND');
      }

      // 2. Verify member exists
      const member = await tx.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: memberId,
          },
        },
      });

      if (!member) {
        throw new Error('MEMBER_NOT_FOUND');
      }

      // 3. Prevent owner self-removal
      if (memberId === project.ownerId) {
        throw new Error('CANNOT_REMOVE_OWNER');
      }

      // 4. Delete Annotation_Comments (project-scoped)
      // Find all annotations in documents belonging to this project
      const projectDocuments = await tx.document.findMany({
        where: { projectId },
        select: { id: true },
      });
      const docIds = projectDocuments.map(doc => doc.id);

      const deletedComments = await tx.annotationComment.deleteMany({
        where: {
          userId: memberId,
          annotation: {
            docId: { in: docIds },
          },
        },
      });

      // 5. Delete Annotations (project-scoped)
      const deletedAnnotations = await tx.annotation.deleteMany({
        where: {
          userId: memberId,
          docId: { in: docIds },
        },
      });

      // 6. Delete Labels (project-scoped)
      const deletedLabels = await tx.label.deleteMany({
        where: {
          userId: memberId,
          projectId,
        },
      });

      // 7. Delete ProjectMember record (removes all permissions)
      await tx.projectMember.delete({
        where: {
          projectId_userId: {
            projectId,
            userId: memberId,
          },
        },
      });

      return {
        labels: deletedLabels.count,
        annotations: deletedAnnotations.count,
        comments: deletedComments.count,
      };
    });

    // Log the operation
    console.log(`Member removed from project. ProjectId: ${projectId}, MemberId: ${memberId}, RequestedBy: ${userId}, Deleted: ${JSON.stringify(result)}`);

    res.json({
      message: 'Member removed successfully',
      deleted: result,
    });
  } catch (error: any) {
    console.error('Error removing member:', error);

    // Handle specific error cases
    if (error.message === 'PROJECT_NOT_FOUND') {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }
    if (error.message === 'MEMBER_NOT_FOUND') {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    if (error.message === 'CANNOT_REMOVE_OWNER') {
      res.status(400).json({ error: 'Cannot remove project owner' });
      return;
    }

    res.status(500).json({ error: 'Failed to remove member' });
  }
};
```

### Key Design Decisions

#### 1. Transaction Boundary
- **Decision**: Use Prisma's `$transaction` API to wrap all operations
- **Rationale**: Ensures atomicity - either all deletions succeed or none do
- **Alternative Considered**: Individual delete operations - rejected due to lack of rollback capability

#### 2. Deletion Order
- **Decision**: Delete in order: Comments → Annotations → Labels → ProjectMember
- **Rationale**: Respects foreign key constraints (child records before parent records)
- **Database Support**: Prisma schema already has `onDelete: Cascade` for most relations, but explicit deletion provides better control and counting

#### 3. Project-Scoped Deletion Query Strategy
- **Decision**: For Annotation_Comments and Annotations, first fetch all document IDs in the project, then filter by userId and docId
- **Rationale**: 
  - Annotation_Comments don't have direct projectId field
  - Annotations don't have direct projectId field
  - Must traverse: Project → Documents → Annotations → Comments
- **Performance**: Single query to fetch document IDs, then filtered deletes

#### 4. Error Handling Strategy
- **Decision**: Use custom error messages thrown within transaction, caught and mapped to HTTP status codes
- **Rationale**: Allows transaction to rollback while providing specific error responses
- **Error Types**:
  - `PROJECT_NOT_FOUND` → 404
  - `MEMBER_NOT_FOUND` → 404
  - `CANNOT_REMOVE_OWNER` → 400
  - Other errors → 500

#### 5. Logging Strategy
- **Decision**: Log at INFO level for successful operations, ERROR level for failures
- **Information Logged**: ProjectId, MemberId, RequestedBy UserId, Deletion counts
- **Rationale**: Provides audit trail for member removal operations

#### 6. Response Format
- **Decision**: Return deletion counts in response body
- **Format**: `{ message: string, deleted: { labels: number, annotations: number, comments: number } }`
- **Rationale**: Provides transparency and verification capability for project owners

## Database Considerations

### Existing Schema Constraints

From `backend/prisma/schema.prisma`:

```prisma
model ProjectMember {
  id                         String   @id @default(uuid())
  projectId                  String
  userId                     String
  role                       Role     @default(VIEWER)
  canViewOthersAnnotations   Boolean  @default(false)
  canAnnotate                Boolean  @default(false)
  canViewAdminAnnotations    Boolean  @default(false)
  
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
}

model Label {
  id        String   @id @default(uuid())
  projectId String
  userId    String
  
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  annotations Annotation[]
}

model Annotation {
  id          String   @id @default(uuid())
  docId       String
  labelId     String
  userId      String
  
  user     User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  label    Label              @relation(fields: [labelId], references: [id], onDelete: Cascade)
  comments AnnotationComment[]
}

model AnnotationComment {
  id           String     @id @default(uuid())
  annotationId String
  userId       String
  
  annotation   Annotation @relation(fields: [annotationId], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Cascade Behavior Analysis

**Existing Database Cascades**:
- If User is deleted → all Labels, Annotations, Comments cascade delete
- If Project is deleted → all Labels cascade delete
- If Label is deleted → all Annotations cascade delete
- If Annotation is deleted → all Comments cascade delete

**Why Explicit Deletion is Needed**:
- ProjectMember deletion does NOT trigger cascades to Labels/Annotations/Comments
- ProjectMember only has foreign keys to Project and User, not to the data entities
- Must explicitly delete project-scoped data before removing ProjectMember

### Query Performance

**Expected Query Pattern**:
1. `SELECT` project (1 query) - verify ownership
2. `SELECT` member (1 query) - verify exists
3. `SELECT` documents (1 query) - get all doc IDs for project
4. `DELETE` comments (1 query) - filtered by userId and docId IN (...)
5. `DELETE` annotations (1 query) - filtered by userId and docId IN (...)
6. `DELETE` labels (1 query) - filtered by userId and projectId
7. `DELETE` projectMember (1 query)

**Total**: 7 queries within a single transaction

**Performance Characteristics**:
- All queries use indexed fields (userId, projectId, docId)
- DELETE operations are filtered, not full table scans
- Transaction overhead is minimal for this operation count
- Expected completion time: < 1 second for typical projects

## Testing Strategy

### Unit Tests

**Test File**: `backend/src/controllers/projectMemberController.test.ts` (new file)

**Test Cases**:

1. **Successful Cascade Delete**
   - Setup: Create project, member, labels, annotations, comments
   - Action: Remove member
   - Assert: All project-scoped data deleted, member removed, correct counts returned

2. **Authorization - Non-Owner Cannot Remove**
   - Setup: Create project with owner and member
   - Action: Non-owner attempts to remove member
   - Assert: 403 error, no data deleted

3. **Authorization - Owner Cannot Remove Self**
   - Setup: Create project with owner
   - Action: Owner attempts to remove self
   - Assert: 400 error with "Cannot remove project owner"

4. **Member Not Found**
   - Setup: Create project
   - Action: Attempt to remove non-existent member
   - Assert: 404 error with "Member not found"

5. **Project Not Found**
   - Setup: None
   - Action: Attempt to remove member from non-existent project
   - Assert: 404 error

6. **Preserve Data from Other Projects**
   - Setup: Create 2 projects, user is member of both, has data in both
   - Action: Remove user from project 1
   - Assert: Only project 1 data deleted, project 2 data intact

7. **Empty Data Set**
   - Setup: Create project and member with no labels/annotations/comments
   - Action: Remove member
   - Assert: Success with zero counts

8. **Transaction Rollback on Error**
   - Setup: Create project with member and data
   - Action: Simulate database error during deletion
   - Assert: All data remains, member still exists

9. **Concurrent Removal Attempts**
   - Setup: Create project with member
   - Action: Two simultaneous removal requests
   - Assert: One succeeds, one returns 404 (member not found)

### Integration Tests

**Test File**: `backend/src/integration.test.ts` (add to existing)

**Test Cases**:

1. **End-to-End Cascade Delete**
   - Full HTTP request/response cycle
   - Verify database state after operation
   - Verify response format matches specification

2. **Multi-User Project Scenario**
   - Project with multiple members, each with data
   - Remove one member
   - Verify other members' data unaffected

## API Contract

### Endpoint

```
DELETE /api/projects/:projectId/members/:memberId
```

### Request

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Path Parameters**:
- `projectId` (string, UUID): The project ID
- `memberId` (string, UUID): The user ID of the member to remove

### Response

**Success (200)**:
```json
{
  "message": "Member removed successfully",
  "deleted": {
    "labels": 5,
    "annotations": 12,
    "comments": 3
  }
}
```

**Error Responses**:

- **401 Unauthorized**: User not authenticated
  ```json
  { "error": "User not authenticated" }
  ```

- **403 Forbidden**: Requesting user is not project owner
  ```json
  { "error": "Project not found or unauthorized" }
  ```

- **404 Not Found**: Member not found
  ```json
  { "error": "Member not found" }
  ```

- **400 Bad Request**: Attempting to remove project owner
  ```json
  { "error": "Cannot remove project owner" }
  ```

- **500 Internal Server Error**: Database or transaction error
  ```json
  { "error": "Failed to remove member" }
  ```

## Migration Plan

### Phase 1: Implementation
1. Modify `removeProjectMember` function in `projectMemberController.ts`
2. Add comprehensive error handling
3. Add logging statements

### Phase 2: Testing
1. Create unit test file with all test cases
2. Add integration tests
3. Run full test suite

### Phase 3: Deployment
1. Deploy to staging environment
2. Perform manual testing with various scenarios
3. Monitor logs for any issues
4. Deploy to production

### Rollback Plan
- If issues arise, revert to previous version of `projectMemberController.ts`
- Previous behavior: Only deletes ProjectMember record
- Data cleanup can be performed manually if needed

## Security Considerations

1. **Authorization**: Only project owners can remove members
2. **Data Isolation**: Project-scoped deletion ensures data from other projects is preserved
3. **Audit Trail**: All operations are logged with user IDs and timestamps
4. **Transaction Safety**: Atomic operations prevent partial deletions
5. **Input Validation**: Project ID and Member ID are validated before processing

## Performance Considerations

1. **Query Optimization**: All queries use indexed fields
2. **Transaction Scope**: Minimal transaction duration (< 1 second expected)
3. **Batch Operations**: Use `deleteMany` for efficient bulk deletion
4. **Connection Pooling**: Prisma handles connection management
5. **Timeout**: 10-second transaction timeout (configurable in Prisma)

## Monitoring and Observability

### Metrics to Track
1. **Operation Success Rate**: Percentage of successful member removals
2. **Operation Duration**: Time taken for cascade delete operations
3. **Deletion Counts**: Average number of labels/annotations/comments deleted
4. **Error Rates**: Frequency of different error types

### Log Format
```
INFO: Member removed from project. ProjectId: <uuid>, MemberId: <uuid>, RequestedBy: <uuid>, Deleted: {"labels": 5, "annotations": 12, "comments": 3}
ERROR: Error removing member: <error_message>
```

## Future Enhancements

1. **Soft Delete**: Instead of hard delete, mark records as deleted with timestamp
2. **Undo Capability**: Allow project owners to restore recently removed members and their data
3. **Notification**: Send email notification to removed user
4. **Bulk Operations**: Support removing multiple members in a single request
5. **Archive**: Export user's data before deletion for compliance purposes

## Correctness Properties

### Property 1: Project Scope Isolation (Invariant)

**Description**: Removing a user from Project A SHALL NOT affect their data in Project B.

**Formal Statement**:
```
∀ user, projectA, projectB where user ∈ members(projectA) ∧ user ∈ members(projectB):
  LET dataB_before = userData(user, projectB)
  AFTER removeFromProject(user, projectA):
    userData(user, projectB) = dataB_before
```

**Test Strategy**: Property-based test
- Generate: User, ProjectA, ProjectB, data in both projects
- Action: Remove user from ProjectA
- Assert: All data in ProjectB unchanged (labels, annotations, comments)

**Implementation**: Use property-based testing library (e.g., fast-check for TypeScript)

### Property 2: Complete Cascade (Invariant)

**Description**: After removing a user from a project, zero project-scoped records SHALL remain for that user in that project.

**Formal Statement**:
```
∀ user, project:
  AFTER removeFromProject(user, project):
    count(labels WHERE userId = user ∧ projectId = project) = 0 ∧
    count(annotations WHERE userId = user ∧ docId ∈ documents(project)) = 0 ∧
    count(comments WHERE userId = user ∧ annotationId ∈ annotations(documents(project))) = 0 ∧
    count(projectMembers WHERE userId = user ∧ projectId = project) = 0
```

**Test Strategy**: Property-based test
- Generate: User, project, random amounts of labels/annotations/comments
- Action: Remove user from project
- Assert: All counts are zero for that user in that project

**Implementation**: Use property-based testing library

### Property 3: Transaction Atomicity (Invariant)

**Description**: If any deletion fails, the entire operation SHALL rollback, leaving all data unchanged.

**Formal Statement**:
```
∀ user, project:
  LET state_before = (labels, annotations, comments, members)
  IF removeFromProject(user, project) throws error:
    THEN state_after = state_before
```

**Test Strategy**: Example-based test with error injection
- Setup: Create user with data in project
- Action: Mock database error during deletion
- Assert: All data remains unchanged, member still exists

**Implementation**: Unit test with Prisma mock

### Property 4: Deletion Order Correctness (Invariant)

**Description**: Deletions SHALL occur in dependency order: Comments → Annotations → Labels → ProjectMember.

**Formal Statement**:
```
∀ user, project:
  DURING removeFromProject(user, project):
    timestamp(delete_comments) < timestamp(delete_annotations) <
    timestamp(delete_labels) < timestamp(delete_member)
```

**Test Strategy**: Example-based test with operation logging
- Setup: Create user with full data hierarchy
- Action: Remove user, log each deletion timestamp
- Assert: Timestamps follow correct order

**Implementation**: Unit test with operation tracking

### Property 5: Authorization Invariant

**Description**: Only the project owner SHALL be able to remove members.

**Formal Statement**:
```
∀ requester, user, project:
  IF requester ≠ owner(project):
    THEN removeFromProject(user, project, requester) throws AuthorizationError
```

**Test Strategy**: Example-based test
- Setup: Create project with owner and multiple members
- Action: Non-owner attempts to remove member
- Assert: 403 error, no data changed

**Implementation**: Unit test

### Property 6: Deletion Count Accuracy (Metamorphic)

**Description**: The sum of returned deletion counts SHALL equal the actual number of records deleted.

**Formal Statement**:
```
∀ user, project:
  LET counts_before = (labels_count, annotations_count, comments_count)
  LET response = removeFromProject(user, project)
  LET counts_after = (labels_count, annotations_count, comments_count)
  THEN:
    response.deleted.labels = counts_before.labels - counts_after.labels ∧
    response.deleted.annotations = counts_before.annotations - counts_after.annotations ∧
    response.deleted.comments = counts_before.comments - counts_after.comments
```

**Test Strategy**: Property-based test
- Generate: User, project, random data
- Action: Count before, remove user, count after
- Assert: Response counts match actual deletion counts

**Implementation**: Use property-based testing library

### Property 7: Owner Self-Removal Prevention (Error Condition)

**Description**: Attempting to remove the project owner SHALL fail with a 400 error.

**Formal Statement**:
```
∀ project:
  LET owner = owner(project)
  THEN removeFromProject(owner, project, owner) throws BadRequestError("Cannot remove project owner")
```

**Test Strategy**: Example-based test
- Setup: Create project with owner
- Action: Owner attempts to remove self
- Assert: 400 error, owner remains

**Implementation**: Unit test

### Property 8: Idempotency of Non-Existent Member Removal (Error Condition)

**Description**: Attempting to remove a non-existent member SHALL always return 404.

**Formal Statement**:
```
∀ user, project WHERE user ∉ members(project):
  removeFromProject(user, project) throws NotFoundError("Member not found")
```

**Test Strategy**: Example-based test
- Setup: Create project without adding user as member
- Action: Attempt to remove user
- Assert: 404 error

**Implementation**: Unit test

## Dependencies

### Existing Dependencies
- `express`: Web framework
- `@prisma/client`: Database ORM
- `jsonwebtoken`: Authentication (via middleware)

### New Dependencies (Testing)
- `jest`: Testing framework (already in project)
- `fast-check`: Property-based testing library (to be added)
- `@types/jest`: TypeScript types for Jest (already in project)

### Installation Command
```bash
npm install --save-dev fast-check
```

## Acceptance Criteria Mapping

| Requirement | Design Component | Test Coverage |
|-------------|------------------|---------------|
| Req 1: Delete User Labels | Step 6 in transaction | Unit + Property Test |
| Req 2: Delete User Annotations | Step 5 in transaction | Unit + Property Test |
| Req 3: Delete User Comments | Step 4 in transaction | Unit + Property Test |
| Req 4: Transaction Integrity | Prisma $transaction wrapper | Unit Test (error injection) |
| Req 5: Preserve Other Projects | Project-scoped queries | Property Test |
| Req 6: Cascade Dependencies | Deletion order (steps 4→5→6→7) | Unit Test (order tracking) |
| Req 7: Deletion Summary | Response format | Unit + Integration Test |
| Req 8: Authorization | Steps 1-3 in transaction | Unit Test |
| Req 9: Edge Cases | Error handling branches | Unit Tests (multiple cases) |
| Req 10: Logging | console.log statements | Manual verification |

## Conclusion

This design provides a robust, transactional approach to cascade deletion of user data when removing project members. The implementation maintains data integrity, provides clear error handling, and includes comprehensive testing strategies to ensure correctness. The use of property-based testing for key invariants ensures the solution works correctly across a wide range of inputs and scenarios.
