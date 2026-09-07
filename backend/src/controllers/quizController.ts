import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

// Helper to check project membership or ownership
async function checkProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) return { isOwner: false, isMember: false, project: null };
  const isOwner = project.ownerId === userId;
  const isMember = isOwner || project.members.some((m) => m.userId === userId);
  return { isOwner, isMember, project };
}

export const getQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = (req as any).user?.userId;
    const documentId = req.query.documentId as string | undefined;
    const annotationId = req.query.annotationId as string | undefined;

    const { isOwner, isMember } = await checkProjectAccess(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        projectId,
        ...(documentId ? { documentId } : {}),
        ...(annotationId ? { annotationId } : {}),
        ...(isOwner ? {} : { status: 'PUBLISHED' }),
      },
      include: {
        _count: {
          select: { questions: true, submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(quizzes);
  } catch (error) {
    next(error);
  }
};

export const getQuizById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const userId = (req as any).user?.userId;

    const { isOwner, isMember } = await checkProjectAccess(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        projectId,
        ...(isOwner ? {} : { status: 'PUBLISHED' }),
      },
      include: {
        questions: {
          where: isOwner ? undefined : { isPublished: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // SECURITY FIX: Hide correctAnswer from non-owners to prevent data leakage
    if (!isOwner) {
      quiz.questions = quiz.questions.map((q) => ({
        ...q,
        correctAnswer: null,
      }));
    }

    res.json(quiz);
  } catch (error) {
    next(error);
  }
};

export const createQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = (req as any).user?.userId;
    const { title, description, status, questions, documentId, annotationId } = req.body;

    const { isOwner } = await checkProjectAccess(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only project owner can create quizzes' });
    }

    const newQuiz = await prisma.quiz.create({
      data: {
        projectId,
        documentId: documentId || null,
        annotationId: annotationId || null,
        title,
        description: description || '',
        status: status || 'DRAFT',
        questions: {
          create: (questions || []).map((q: any, i: number) => ({
            type: q.type,
            questionText: q.questionText,
            options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
            order: i,
            marks: q.marks || 1,
            correctAnswer: q.correctAnswer || null,
            isPublished: q.isPublished !== undefined ? q.isPublished : true,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    res.status(201).json(newQuiz);
  } catch (error) {
    next(error);
  }
};

export const updateQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const userId = (req as any).user?.userId;
    const { title, description, status, questions, documentId, annotationId } = req.body;

    const { isOwner } = await checkProjectAccess(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only project owner can update quizzes' });
    }

    if (questions) {
      await prisma.quizQuestion.deleteMany({ where: { quizId } });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        description,
        status,
        ...(documentId !== undefined ? { documentId } : {}),
        ...(annotationId !== undefined ? { annotationId } : {}),
        ...(questions
          ? {
              questions: {
                create: questions.map((q: any, i: number) => ({
                  type: q.type,
                  questionText: q.questionText,
                  options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
                  order: i,
                  marks: q.marks || 1,
                  correctAnswer: q.correctAnswer || null,
                  isPublished: q.isPublished !== undefined ? q.isPublished : true,
                })),
              },
            }
          : {}),
      },
      include: { questions: true },
    });

    res.json(updatedQuiz);
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const userId = (req as any).user?.userId;

    const { isOwner } = await checkProjectAccess(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only project owner can delete quizzes' });
    }

    await prisma.quiz.delete({
      where: { id: quizId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const submitQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const userId = (req as any).user?.userId;
    const { answers } = req.body; // Array of { questionId, answerText }

    const { isMember } = await checkProjectAccess(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz || quiz.status !== 'PUBLISHED' || quiz.projectId !== projectId) {
      return res.status(404).json({ message: 'Quiz not found or not published' });
    }

    // CHECK FOR EXISTING SUBMISSION TO PREVENT P2002 CRASH
    const existingSubmission = await prisma.quizSubmission.findUnique({
      where: { quizId_userId: { quizId, userId } },
      include: { answers: true },
    });

    if (existingSubmission) {
      return res.status(400).json({
        message: 'You have already submitted this quiz',
        alreadySubmitted: true,
        submission: existingSubmission,
      });
    }

    // Calculate score
    let totalScore = 0;
    const answerData = (answers || []).map((ans: any) => {
      const question = quiz.questions.find((q: any) => q.id === ans.questionId);
      let isCorrect = null;
      let score = 0;

      if (question && question.correctAnswer) {
        isCorrect = ans.answerText.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        score = isCorrect ? question.marks : 0;
        totalScore += score;
      }

      return {
        questionId: ans.questionId,
        answerText: ans.answerText || '',
        isCorrect,
        score,
      };
    });

    const submission = await prisma.quizSubmission.create({
      data: {
        quizId,
        userId,
        totalScore,
        answers: {
          create: answerData,
        },
      },
      include: { answers: true },
    });

    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
};

export const getMySubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const userId = (req as any).user?.userId;

    const { isMember } = await checkProjectAccess(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    const submission = await prisma.quizSubmission.findUnique({
      where: { quizId_userId: { quizId, userId } },
      include: {
        answers: true,
      },
    });

    res.json({ submitted: !!submission, submission });
  } catch (error) {
    next(error);
  }
};

export const getSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const userId = (req as any).user?.userId;

    const { isOwner } = await checkProjectAccess(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only project owner can view all submissions' });
    }

    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId },
      include: {
        user: { select: { id: true, username: true, email: true } },
        answers: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json(submissions);
  } catch (error) {
    next(error);
  }
};

// OWNER-ONLY ANALYTICS FOR SINGLE QUIZ
export const getQuizAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const userId = (req as any).user?.userId;

    const { isOwner } = await checkProjectAccess(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Analytics are visible only to the project owner' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        submissions: {
          include: {
            user: { select: { id: true, username: true, email: true } },
            answers: true,
          },
        },
      },
    });

    if (!quiz || quiz.projectId !== projectId) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const totalSubmissions = quiz.submissions.length;
    const maxPossibleScore = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

    let scores = quiz.submissions.map((s) => s.totalScore ?? 0);
    const averageScore = totalSubmissions > 0 ? (scores.reduce((a, b) => a + b, 0) / totalSubmissions) : 0;
    const highestScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalSubmissions > 0 ? Math.min(...scores) : 0;
    const passingCount = scores.filter((s) => maxPossibleScore > 0 && s / maxPossibleScore >= 0.5).length;
    const passRate = totalSubmissions > 0 ? Math.round((passingCount / totalSubmissions) * 100) : 0;

    // Score Distribution Bins (0-20%, 21-40%, 41-60%, 61-80%, 81-100%)
    const bins = [
      { label: '0-20%', range: [0, 0.2], count: 0 },
      { label: '21-40%', range: [0.201, 0.4], count: 0 },
      { label: '41-60%', range: [0.401, 0.6], count: 0 },
      { label: '61-80%', range: [0.601, 0.8], count: 0 },
      { label: '81-100%', range: [0.801, 1.0], count: 0 },
    ];

    quiz.submissions.forEach((sub) => {
      const pct = maxPossibleScore > 0 ? (sub.totalScore ?? 0) / maxPossibleScore : 0;
      for (const bin of bins) {
        if (pct >= bin.range[0] && pct <= bin.range[1]) {
          bin.count++;
          break;
        }
      }
    });

    const scoreDistribution = bins.map((bin) => ({
      rangeLabel: bin.label,
      count: bin.count,
      percentage: totalSubmissions > 0 ? Math.round((bin.count / totalSubmissions) * 100) : 0,
    }));

    // Question Breakdown (Google Forms style question-by-question analytics)
    const questionBreakdown = quiz.questions.map((q) => {
      const allAnswers = quiz.submissions.flatMap((s) => s.answers.filter((a) => a.questionId === q.id));
      const totalAnsCount = allAnswers.length;
      const correctAnsCount = allAnswers.filter((a) => a.isCorrect === true).length;
      const incorrectAnsCount = allAnswers.filter((a) => a.isCorrect === false).length;
      const correctPercentage = totalAnsCount > 0 ? Math.round((correctAnsCount / totalAnsCount) * 100) : 0;

      // Map answer responses
      const countsMap: Record<string, number> = {};
      if (q.type === 'MULTIPLE_CHOICE' && q.options) {
        try {
          const opts: string[] = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          opts.forEach((opt) => (countsMap[opt] = 0));
        } catch (e) {}
      }

      allAnswers.forEach((a) => {
        const text = a.answerText ? a.answerText.trim() : '(No answer)';
        if (countsMap[text] !== undefined) {
          countsMap[text]++;
        } else {
          countsMap[text] = (countsMap[text] || 0) + 1;
        }
      });

      const responseDistribution = Object.entries(countsMap).map(([answerText, count]) => {
        const isCorrect = q.correctAnswer
          ? answerText.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
          : null;
        return {
          answerText,
          count,
          percentage: totalAnsCount > 0 ? Math.round((count / totalAnsCount) * 100) : 0,
          isCorrect,
        };
      });

      return {
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        marks: q.marks,
        correctAnswer: q.correctAnswer,
        totalAnswers: totalAnsCount,
        correctCount: correctAnsCount,
        incorrectCount: incorrectAnsCount,
        correctPercentage,
        responseDistribution,
        optionDistribution: responseDistribution.map(r => ({
          option: r.answerText,
          count: r.count,
          percentage: r.percentage
        }))
      };
    });

    // Auto-recommendation logic for chart type
    // If few submissions or few populated bins, Pie is cleaner; if spread out, Histogram/Bar is better.
    const populatedBinsCount = scoreDistribution.filter((b) => b.count > 0).length;
    const recommendedChart: 'pie' | 'bar' = totalSubmissions <= 5 || populatedBinsCount <= 3 ? 'pie' : 'bar';

    res.json({
      quizId: quiz.id,
      title: quiz.title,
      description: quiz.description,
      status: quiz.status,
      annotationId: quiz.annotationId,
      documentId: quiz.documentId,
      totalSubmissions,
      totalQuestions: quiz.questions.length,
      maxPossibleScore,
      averageScore: Number(averageScore.toFixed(1)),
      averagePercentage: maxPossibleScore > 0 ? Math.round((averageScore / maxPossibleScore) * 100) : 0,
      highestScore,
      lowestScore,
      passRate,
      recommendedChart,
      scoreDistribution,
      questionBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

// OWNER-ONLY ANALYTICS FOR PDF DOCUMENT (AGGREGATE PDF QUIZZES)
export const getPdfQuizAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const docId = req.params.docId as string;
    const userId = (req as any).user?.userId;

    const { isOwner } = await checkProjectAccess(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Analytics are visible only to the project owner' });
    }

    const document = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document || document.projectId !== projectId) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Find all quizzes belonging to this document directly or through annotations of this document
    const annotationsInDoc = await prisma.annotation.findMany({
      where: { docId },
      select: { id: true },
    });
    const annIds = annotationsInDoc.map((a) => a.id);

    const pdfQuizzes = await prisma.quiz.findMany({
      where: {
        projectId,
        OR: [
          { documentId: docId },
          { annotationId: { in: annIds } },
        ],
      },
      include: {
        questions: true,
        submissions: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
        annotation: {
          select: { id: true, content: true, label: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPdfQuizzes = pdfQuizzes.length;
    let totalSubmissionsCount = 0;
    let sumPercentageScores = 0;

    const quizSummaries = pdfQuizzes.map((quiz) => {
      const subCount = quiz.submissions.length;
      totalSubmissionsCount += subCount;
      const maxMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
      const scores = quiz.submissions.map((s) => s.totalScore ?? 0);
      const avgScore = subCount > 0 ? scores.reduce((a, b) => a + b, 0) / subCount : 0;
      const avgPct = maxMarks > 0 ? (avgScore / maxMarks) * 100 : 0;

      if (subCount > 0) {
        sumPercentageScores += avgPct * subCount;
      }

      return {
        quizId: quiz.id,
        title: quiz.title,
        status: quiz.status,
        annotationId: quiz.annotationId,
        annotationSnippet: quiz.annotation?.content || null,
        questionCount: quiz.questions.length,
        maxMarks,
        submissionsCount: subCount,
        averageScore: Number(avgScore.toFixed(1)),
        averagePercentage: Math.round(avgPct),
      };
    });

    const overallAveragePercentage = totalSubmissionsCount > 0 ? Math.round(sumPercentageScores / totalSubmissionsCount) : 0;

    res.json({
      documentId: docId,
      documentTitle: document.title,
      totalPdfQuizzes,
      totalSubmissionsCount,
      overallAveragePercentage,
      recommendedChart: totalPdfQuizzes <= 4 ? 'pie' : 'bar',
      quizSummaries,
    });
  } catch (error) {
    next(error);
  }
};
