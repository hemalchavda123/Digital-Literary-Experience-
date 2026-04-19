export interface AnnotationLabel {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TextAnnotation {
  id: string;
  docId: string;
  labelId: string;
  content: string;
  startOffset: number;
  endOffset: number;
  createdAt?: string;
  updatedAt?: string;
}
