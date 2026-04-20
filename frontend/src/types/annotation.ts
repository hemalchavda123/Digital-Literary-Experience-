import { User } from './project';

export interface AnnotationLabel {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnnotationComment {
  id: string;
  annotationId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user?: User;
}

export interface TextAnnotation {
  id: string;
  docId: string;
  labelId: string;
  content: string; // The initial note
  startOffset: number;
  endOffset: number;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  user?: User;
  comments?: AnnotationComment[];
}
