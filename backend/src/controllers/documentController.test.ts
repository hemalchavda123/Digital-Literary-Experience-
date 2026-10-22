import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractGoogleDriveFileId,
  importGoogleDriveDocument,
} from './documentController';
import prisma from '../config/db';
import { Request, Response } from 'express';

// Mock prisma
vi.mock('../config/db', () => ({
  default: {
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    document: {
      create: vi.fn(),
    },
  },
}));

describe('Google Drive Document Import Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractGoogleDriveFileId', () => {
    it('should extract direct file ID', () => {
      const id = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs';
      expect(extractGoogleDriveFileId(id)).toBe(id);
    });

    it('should extract ID from standard Google Drive share link', () => {
      const url =
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing';
      expect(extractGoogleDriveFileId(url)).toBe(
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs'
      );
    });

    it('should extract ID from open?id= URL', () => {
      const url =
        'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs';
      expect(extractGoogleDriveFileId(url)).toBe(
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs'
      );
    });

    it('should extract ID from uc?id= URL', () => {
      const url =
        'https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs';
      expect(extractGoogleDriveFileId(url)).toBe(
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs'
      );
    });

    it('should return null for invalid or non-drive URLs', () => {
      expect(extractGoogleDriveFileId('https://example.com/test.pdf')).toBeNull();
      expect(extractGoogleDriveFileId('')).toBeNull();
      expect(extractGoogleDriveFileId('short')).toBeNull();
    });
  });

  describe('importGoogleDriveDocument', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let statusMock: any;
    let jsonMock: any;

    beforeEach(() => {
      statusMock = vi.fn().mockReturnThis();
      jsonMock = vi.fn();
      mockRes = {
        status: statusMock,
        json: jsonMock,
      };
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq = {
        user: undefined,
        body: { projectId: 'p1', fileId: '123' },
      };

      await importGoogleDriveDocument(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });

    it('should return 400 if projectId is missing', async () => {
      mockReq = {
        user: { userId: 'u1' } as any,
        body: { fileId: '123' },
      };

      await importGoogleDriveDocument(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'projectId is required' });
    });

    it('should return 400 if fileId and shareUrl are missing or invalid', async () => {
      mockReq = {
        user: { userId: 'u1' } as any,
        body: { projectId: 'p1', shareUrl: 'invalid-url' },
      };

      await importGoogleDriveDocument(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'A valid Google Drive file ID or share link is required',
      });
    });

    it('should return 404 if project is not found or user lacks permission', async () => {
      mockReq = {
        user: { userId: 'u1' } as any,
        body: {
          projectId: 'p1',
          fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
        },
      };

      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      await importGoogleDriveDocument(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Project not found or you do not have permission to add documents',
      });
    });

    it('should reject non-PDF files', async () => {
      mockReq = {
        user: { userId: 'u1' } as any,
        body: {
          projectId: 'p1',
          fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
          accessToken: 'mock-token',
        },
      };

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'p1',
        ownerId: 'u1',
      } as any);

      // Mock fetch: metadata ok, content not a PDF
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ name: 'test.txt' }),
          });
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => Buffer.from('Not a PDF file content'),
        });
      }) as any;

      try {
        await importGoogleDriveDocument(mockReq as Request, mockRes as Response);
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'The requested Google Drive file is not a valid PDF document.',
        });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should successfully import valid PDF and return created document', async () => {
      mockReq = {
        user: { userId: 'u1' } as any,
        body: {
          projectId: 'p1',
          fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
          accessToken: 'mock-token',
          title: 'Custom Essay Title',
        },
      };

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'p1',
        ownerId: 'u1',
      } as any);

      const fakePdfBuffer = Buffer.from('%PDF-1.4 sample content');
      const mockCreatedDoc = {
        id: 'doc-123',
        title: 'Custom Essay Title',
        projectId: 'p1',
        kind: 'pdf',
        content: `data:application/pdf;base64,${fakePdfBuffer.toString('base64')}`,
        pdfUrl: null,
      };

      vi.mocked(prisma.document.create).mockResolvedValue(mockCreatedDoc as any);
      vi.mocked(prisma.project.update).mockResolvedValue({} as any);

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ name: 'essay.pdf' }),
          });
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => fakePdfBuffer,
        });
      }) as any;

      try {
        await importGoogleDriveDocument(mockReq as Request, mockRes as Response);
        expect(prisma.document.create).toHaveBeenCalledWith({
          data: {
            title: 'Custom Essay Title',
            projectId: 'p1',
            kind: 'pdf',
            content: `data:application/pdf;base64,${fakePdfBuffer.toString('base64')}`,
            pdfUrl: null,
          },
        });
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith(mockCreatedDoc);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
