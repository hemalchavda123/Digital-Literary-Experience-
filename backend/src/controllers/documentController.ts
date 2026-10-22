import { Request, Response } from 'express';
import prisma from '../config/db';

/**
 * List documents for a project (verifies project ownership)
 * GET /api/documents/project/:projectId
 */
export const getDocumentsByProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;

    // Verify the user is owner or member
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

/**
 * Get a single document by ID (verifies project ownership)
 * GET /api/documents/:id
 */
export const getDocumentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Verify access through the project
    const project = await prisma.project.findFirst({
      where: {
        id: document.projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

/**
 * Create a new document
 * POST /api/documents
 * Body: { projectId, title, kind?, content?, pdfUrl? }
 */
export const createDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { projectId, title, kind, content, pdfUrl } = req.body;

    if (!projectId || !title) {
      res.status(400).json({ error: 'projectId and title are required' });
      return;
    }

    // Validate title length
    if (title.length > 500) {
      res.status(400).json({ error: 'Title must be less than 500 characters' });
      return;
    }

    // Validate kind if provided
    if (kind && kind !== 'text' && kind !== 'pdf') {
      res.status(400).json({ error: 'Kind must be either "text" or "pdf"' });
      return;
    }

    // Validate pdfUrl if provided
    if (pdfUrl) {
      if (typeof pdfUrl !== 'string') {
        res.status(400).json({ error: 'pdfUrl must be a string' });
        return;
      }
      
      // If it's a data URL, validate format
      if (pdfUrl.startsWith('data:')) {
        if (!pdfUrl.startsWith('data:application/pdf;base64,')) {
          res.status(400).json({ error: 'PDF data URL must be base64 encoded' });
          return;
        }
      } else {
        // If it's a regular URL, validate format
        try {
          const url = new URL(pdfUrl);
          if (!['http:', 'https:'].includes(url.protocol)) {
            res.status(400).json({ error: 'PDF URL must use HTTP or HTTPS protocol' });
            return;
          }
        } catch {
          res.status(400).json({ error: 'Invalid PDF URL format' });
          return;
        }
      }
    }

    // Verify project access (Owner or Editor)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'EDITOR' } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        title: title.trim(),
        projectId,
        kind: kind || 'text',
        content: content || '',
        pdfUrl: pdfUrl || null,
      },
    });

    // Touch the project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
};

/**
 * Update a document (title, content)
 * PUT /api/documents/:id
 * Body: { title?, content?, pdfUrl? }
 */
export const updateDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;

    // Verify ownership via project
    const existing = await prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'EDITOR' } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const { title, content, pdfUrl } = req.body;

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string') {
        res.status(400).json({ error: 'Title must be a string' });
        return;
      }
      if (title.length > 500) {
        res.status(400).json({ error: 'Title must be less than 500 characters' });
        return;
      }
    }

    // Validate content if provided
    if (content !== undefined) {
      if (typeof content !== 'string') {
        res.status(400).json({ error: 'Content must be a string' });
        return;
      }
    }

    // Validate pdfUrl if provided
    if (pdfUrl !== undefined) {
      if (pdfUrl !== null) {
        if (typeof pdfUrl !== 'string') {
          res.status(400).json({ error: 'pdfUrl must be a string or null' });
          return;
        }
        
        // If it's a data URL, validate format
        if (pdfUrl.startsWith('data:')) {
          if (!pdfUrl.startsWith('data:application/pdf;base64,')) {
            res.status(400).json({ error: 'PDF data URL must be base64 encoded' });
            return;
          }
        } else {
          // If it's a regular URL, validate format
          try {
            const url = new URL(pdfUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
              res.status(400).json({ error: 'PDF URL must use HTTP or HTTPS protocol' });
              return;
            }
          } catch {
            res.status(400).json({ error: 'Invalid PDF URL format' });
            return;
          }
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (content !== undefined) data.content = content;
    if (pdfUrl !== undefined) data.pdfUrl = pdfUrl;

    const document = await prisma.document.update({
      where: { id },
      data,
    });

    res.json(document);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;

    // Verify ownership via project
    const existing = await prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'EDITOR' } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    await prisma.document.delete({ where: { id } });
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

/**
 * Extract Google Drive File ID from URL or raw ID
 */
export function extractGoogleDriveFileId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // If already an ID (alphanumeric, -, _ between 20 and 60 chars)
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) {
    return trimmed;
  }

  // /file/d/<id>
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // id=<id>
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idMatch && idMatch[1]) return idMatch[1];

  return null;
}

/**
 * Helper to fetch file content buffer from Google Drive
 */
export async function fetchGoogleDriveFile(
  fileId: string,
  accessToken?: string
): Promise<{ buffer: Buffer; fileName?: string }> {
  // If accessToken provided, use official Google Drive v3 REST API
  if (accessToken) {
    let fileName: string | undefined;
    try {
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (metaRes.ok) {
        const meta: any = await metaRes.json();
        fileName = meta.name;
      }
    } catch (e) {
      console.warn('Could not fetch file metadata from Drive API:', e);
    }

    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!fileRes.ok) {
      const errText = await fileRes.text().catch(() => '');
      throw new Error(`Google Drive API error (${fileRes.status}): ${errText || 'Failed to download file'}`);
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), fileName };
  }

  // Public Google Drive download fallback
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  let res = await fetch(downloadUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
    },
    redirect: 'follow',
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const html = await res.text();
    // Check for confirm token (Google virus scan warning for large files)
    const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/) || html.match(/name="confirm" value="([0-9A-Za-z_-]+)"/);
    if (confirmMatch && confirmMatch[1]) {
      const confirmToken = confirmMatch[1];
      const cookie = res.headers.get('set-cookie') || '';
      res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        redirect: 'follow',
      });
    } else {
      throw new Error(
        "Could not download Google Drive file. Please ensure link sharing is set to 'Anyone with the link' or sign in with your Google account."
      );
    }
  }

  if (!res.ok) {
    throw new Error(`Failed to download Google Drive file (HTTP ${res.status})`);
  }

  // Extract filename from Content-Disposition if present
  let fileName: string | undefined;
  const disposition = res.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
    if (match && match[1]) {
      fileName = decodeURIComponent(match[1]);
    }
  }

  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), fileName };
}

/**
 * Import a PDF document from Google Drive
 * POST /api/documents/import-google-drive
 * Body: { projectId, fileId?, shareUrl?, accessToken?, title? }
 */
export const importGoogleDriveDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { projectId, fileId: rawFileId, shareUrl, accessToken, title: customTitle } = req.body;

    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    // Resolve fileId
    let fileId = rawFileId ? String(rawFileId).trim() : null;
    if (!fileId && shareUrl) {
      fileId = extractGoogleDriveFileId(String(shareUrl));
    }

    if (!fileId) {
      res.status(400).json({ error: 'A valid Google Drive file ID or share link is required' });
      return;
    }

    // Verify project access (Owner or Editor)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'EDITOR' } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or you do not have permission to add documents' });
      return;
    }

    // Fetch PDF from Google Drive
    const { buffer, fileName } = await fetchGoogleDriveFile(fileId, accessToken);

    // Validate PDF magic bytes (%PDF)
    const isPdf = buffer.length >= 4 && buffer.toString('utf-8', 0, 5).startsWith('%PDF');
    if (!isPdf) {
      res.status(400).json({ error: 'The requested Google Drive file is not a valid PDF document.' });
      return;
    }

    // Format document title
    const determinedTitle = customTitle?.trim() 
      || (fileName ? fileName.replace(/\.pdf$/i, '').trim() : '')
      || 'Google Drive Document';

    const base64DataUrl = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const document = await prisma.document.create({
      data: {
        title: determinedTitle,
        projectId,
        kind: 'pdf',
        content: base64DataUrl,
        pdfUrl: null,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(document);
  } catch (error: any) {
    console.error('Error importing document from Google Drive:', error);
    res.status(500).json({
      error: error.message || 'Failed to import document from Google Drive'
    });
  }
};

