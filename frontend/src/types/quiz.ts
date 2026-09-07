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
  documentId?: string | null;
  annotationId?: string | null;
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

export interface ScoreBin {
  rangeLabel: string;
  count: number;
  percentage: number;
}

export interface OptionDistribution {
  option: string;
  count: number;
  percentage: number;
}

export interface ResponseDistributionItem {
  answerText: string;
  count: number;
  percentage: number;
  isCorrect?: boolean | null;
}

export interface QuestionBreakdown {
  id: string;
  questionText: string;
  type: QuestionType;
  marks: number;
  correctAnswer: string | null;
  totalAnswers: number;
  correctCount: number;
  incorrectCount: number;
  correctPercentage: number;
  optionDistribution?: OptionDistribution[];
  responseDistribution?: ResponseDistributionItem[];
}

export interface QuizAnalytics {
  quizId: string;
  title: string;
  description: string;
  status: QuizStatus;
  annotationId?: string | null;
  documentId?: string | null;
  totalSubmissions: number;
  totalQuestions: number;
  maxPossibleScore: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  recommendedChart?: 'pie' | 'bar';
  scoreDistribution?: ScoreBin[];
  questionBreakdown: QuestionBreakdown[];
}

export interface PdfQuizSummary {
  quizId: string;
  title: string;
  status: QuizStatus;
  annotationId?: string | null;
  annotationSnippet?: string | null;
  questionCount: number;
  maxMarks: number;
  submissionsCount: number;
  averageScore: number;
  averagePercentage: number;
}

export interface PdfQuizAnalytics {
  documentId: string;
  documentTitle: string;
  totalPdfQuizzes: number;
  totalSubmissionsCount: number;
  overallAveragePercentage: number;
  recommendedChart?: 'pie' | 'bar';
  quizSummaries: PdfQuizSummary[];
}
