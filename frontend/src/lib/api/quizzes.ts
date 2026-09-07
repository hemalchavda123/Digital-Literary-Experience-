import { authFetch } from './authFetch';
import { Quiz, QuizSubmission, QuizAnalytics, PdfQuizAnalytics } from '@/types/quiz';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message || body?.error || body?.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export const getQuizzes = async (
  projectId: string,
  params?: { documentId?: string; annotationId?: string }
): Promise<Quiz[]> => {
  const query = new URLSearchParams();
  if (params?.documentId) query.set('documentId', params.documentId);
  if (params?.annotationId) query.set('annotationId', params.annotationId);
  const qStr = query.toString() ? `?${query.toString()}` : '';

  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes${qStr}`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch quizzes"));
  return res.json();
};

export const getQuizById = async (projectId: string, quizId: string): Promise<Quiz> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes/${quizId}`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch quiz"));
  return res.json();
};

export const createQuiz = async (
  projectId: string,
  payload: { title: string; description?: string; status?: string; questions: any[]; documentId?: string | null; annotationId?: string | null }
): Promise<Quiz> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to create quiz"));
  return res.json();
};

export const updateQuiz = async (
  projectId: string,
  quizId: string,
  payload: { title?: string; description?: string; status?: string; questions?: any[]; documentId?: string | null; annotationId?: string | null }
): Promise<Quiz> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes/${quizId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to update quiz"));
  return res.json();
};

export const deleteQuiz = async (projectId: string, quizId: string): Promise<void> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes/${quizId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to delete quiz"));
};

export const submitQuiz = async (
  projectId: string,
  quizId: string,
  answers: { questionId: string; answerText: string }[]
): Promise<QuizSubmission> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes/${quizId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to submit quiz"));
  return res.json();
};

export const getMySubmission = async (
  projectId: string,
  quizId: string
): Promise<{ submitted: boolean; submission: QuizSubmission | null }> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes/${quizId}/my-submission`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch submission status"));
  return res.json();
};

export const getSubmissions = async (projectId: string, quizId: string): Promise<QuizSubmission[]> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes/${quizId}/submissions`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch submissions"));
  return res.json();
};

export const getQuizAnalytics = async (projectId: string, quizId: string): Promise<QuizAnalytics> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes/${quizId}/analytics`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch quiz analytics"));
  return res.json();
};

export const getPdfQuizAnalytics = async (projectId: string, docId: string): Promise<PdfQuizAnalytics> => {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/quizzes/document/${docId}/analytics`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch document PDF quiz analytics"));
  return res.json();
};
