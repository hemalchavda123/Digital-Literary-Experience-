export type DocumentKind = "text" | "pdf"

export type Document = {
  id: string
  title: string
  projectId: string
  kind: DocumentKind
  /**
   * For text documents, this is the editor content.
   * For PDFs, this can hold extracted text (optional for now).
   */
  content: string
  /**
   * For PDFs we link to a stored PDF file (e.g. in /public or a future blob store).
   */
  pdfUrl?: string
  createdAt: string
  updatedAt: string
}

