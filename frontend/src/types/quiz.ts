export type QuizStatus = 'DRAFT' | 'PUBLISHED';

export type QuestionType = 'MULTIPLE_CHOICE' | 'ONE_WORD' | 'SHORT_ANSWER';

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  questionText: string;
  options: string | null; // JSON string array for MULTIPLE_CHOICE
  order: number;
  marks: number;
  correctAnswer: string | null;
  isPublished: boolean;
}

export interface Quiz {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: QuizStatus;
  createdAt: string;
  updatedAt: string;
  questions?: QuizQuestion[];
  _count?: {
    questions: number;
    submissions: number;
  };
}

export interface QuizAnswer {
  id: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  isCorrect: boolean | null;
  score: number | null;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  userId: string;
  submittedAt: string;
  totalScore: number | null;
  answers?: QuizAnswer[];
  user?: {
    id: string;
    username: string;
    email: string;
  };
}
