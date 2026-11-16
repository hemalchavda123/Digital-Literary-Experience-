export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export type AnswerRevealMode = 'IMMEDIATE' | 'AFTER_QUIZ_CLOSED' | 'MARKS_ONLY' | 'NEVER';

export type PartialMarkingRule = 'NONE' | 'PROPORTIONAL_WITH_PENALTY' | 'POSITIVE_ONLY';

export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_CORRECT' | 'ONE_WORD' | 'SHORT_ANSWER';

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  questionText: string;
  options: string | null; // JSON string array for MULTIPLE_CHOICE or MULTIPLE_CORRECT
  order: number;
  marks: number;
  negativeMarks?: number;
  partialMarkingRule?: PartialMarkingRule;
  correctAnswer: string | null;
  modelAnswer?: string | null;
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
  answerRevealMode?: AnswerRevealMode;
  showLeaderboard?: boolean;
  totalMarks?: number;
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
  negativeMarks?: number;
  partialMarkingRule?: PartialMarkingRule;
  modelAnswer?: string | null;
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

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  email?: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  submittedAt: string;
  answersCount: number;
}

export interface StudentQuizPerformance {
  userId: string;
  username: string;
  email?: string;
  totalQuizzesTaken: number;
  totalQuizzesInProject?: number;
  averageScorePercentage: number;
  highestScorePercentage: number;
  quizzes: {
    quizId: string;
    quizTitle: string;
    submittedAt: string;
    score: number;
    totalMarks: number;
    percentage: number;
    rank: number;
    totalParticipants: number;
  }[];
}
