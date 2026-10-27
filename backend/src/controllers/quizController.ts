import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { getIo } from '../socket';

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
        ...(isOwner ? {} : { status: { not: 'DRAFT' } }),
      },
      include: {
        _count: {
          select: { questions: true, submissions: true },
        },
        questions: {
          select: { marks: true, isPublished: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedQuizzes = quizzes.map((quiz) => {
      const activeQuestions = isOwner
        ? quiz.questions
        : quiz.questions.filter((q) => q.isPublished);
      const totalMarks = activeQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
      return {
        ...quiz,
        questions: activeQuestions,
        totalMarks,
      };
    });

    res.json(mappedQuizzes);
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
        ...(isOwner ? {} : { status: { not: 'DRAFT' } }),
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

    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    (quiz as any).totalMarks = totalMarks;

    // If quiz is closed and user is not owner: hide all questions
    // "other users can't access the question, make it so that it'll show total marks only"
    if (!isOwner && quiz.status === 'CLOSED') {
      quiz.questions = [];
    } else if (!isOwner) {
      // SECURITY FIX: Hide correctAnswer from non-owners to prevent data leakage
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
        _count: {
          select: { questions: true, submissions: true },
        },
      },
    });

    try {
      getIo().to(`project:${projectId}`).emit('quiz_created', newQuiz);
    } catch (e) {
      console.error('Socket emit error (quiz_created):', e);
    }

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

    // Handle questions update if provided
    if (Array.isArray(questions)) {
      const existingQuestions = await prisma.quizQuestion.findMany({ where: { quizId } });
      const existingMap = new Map(existingQuestions.map((q) => [q.id, q]));
      const incomingIds = new Set(questions.map((q: any) => q.id).filter(Boolean));

      // 1. Delete questions that were REMOVED by owner (not in incomingIds)
      const removedQuestions = existingQuestions.filter((q) => !incomingIds.has(q.id));
      if (removedQuestions.length > 0) {
        await prisma.quizQuestion.deleteMany({
          where: { id: { in: removedQuestions.map((q) => q.id) } },
        });
      }

      // 2. Process each question: update if existing, or create if new/modified
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const formattedOptions = q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null;

        if (q.id && existingMap.has(q.id)) {
          const existing = existingMap.get(q.id)!;
          // Check if question details were MODIFIED
          const textChanged = existing.questionText !== q.questionText;
          const typeChanged = existing.type !== q.type;
          const optionsChanged = existing.options !== formattedOptions;
          const answerChanged = (existing.correctAnswer || '') !== (q.correctAnswer || '');
          const marksChanged = existing.marks !== (q.marks || 1);
          const isModified = textChanged || typeChanged || optionsChanged || answerChanged || marksChanged;

          // DO NOT delete past responses! Keep previous submitted answers stored and available.
          // Update question properties. If modified, set updatedAt to now.
          await prisma.quizQuestion.update({
            where: { id: q.id },
            data: {
              type: q.type,
              questionText: q.questionText,
              options: formattedOptions,
              order: i,
              marks: q.marks || 1,
              correctAnswer: q.correctAnswer || null,
              isPublished: q.isPublished !== undefined ? q.isPublished : true,
              ...(isModified ? { updatedAt: new Date() } : {}),
            },
          });
        } else {
          // New question -> create
          await prisma.quizQuestion.create({
            data: {
              quizId,
              type: q.type,
              questionText: q.questionText,
              options: formattedOptions,
              order: i,
              marks: q.marks || 1,
              correctAnswer: q.correctAnswer || null,
              isPublished: q.isPublished !== undefined ? q.isPublished : true,
            },
          });
        }
      }
    }

    // Update Quiz basic details
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        updatedAt: new Date(),
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(documentId !== undefined ? { documentId } : {}),
        ...(annotationId !== undefined ? { annotationId } : {}),
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: {
          select: { questions: true, submissions: true },
        },
      },
    });

    // Sync all existing QuizSubmission totalScores for this quiz against current active questions
    const activeQuestionIds = new Set(updatedQuiz.questions.map((q) => q.id));
    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId },
      include: { answers: true },
    });

    // Clean up any empty/blank answers previously saved for questions in this quiz so students can answer them
    await prisma.quizAnswer.deleteMany({
      where: {
        submission: { quizId },
        answerText: '',
      },
    });

    for (const sub of submissions) {
      const validAnswers = sub.answers.filter((a) => activeQuestionIds.has(a.questionId) && a.answerText && a.answerText.trim() !== '');
      const newScore = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      if (sub.totalScore !== newScore) {
        await prisma.quizSubmission.update({
          where: { id: sub.id },
          data: { totalScore: newScore },
        });
      }
    }

    const totalMarks = updatedQuiz.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    (updatedQuiz as any).totalMarks = totalMarks;

    try {
      getIo().to(`project:${projectId}`).emit('quiz_updated', {
        projectId,
        quizId,
        quiz: updatedQuiz,
      });
    } catch (e) {
      console.error('Socket emit error (quiz_updated):', e);
    }

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

    try {
      getIo().to(`project:${projectId}`).emit('quiz_deleted', {
        projectId,
        quizId,
      });
    } catch (e) {
      console.error('Socket emit error (quiz_deleted):', e);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const togglePublishQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const questionId = req.params.questionId as string;
    const userId = (req as any).user?.userId;
    const { isPublished } = req.body;

    const { isOwner } = await checkProjectAccess(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only project owner can manage quiz questions' });
    }

    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question || question.quizId !== quizId) {
      return res.status(404).json({ message: 'Question not found in this quiz' });
    }

    const updatedQuestion = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: { isPublished: isPublished !== undefined ? Boolean(isPublished) : !question.isPublished },
    });

    // Touch quiz updatedAt so clients and submissions know the quiz was updated
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: { updatedAt: new Date() },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: {
          select: { questions: true, submissions: true },
        },
      },
    });

    try {
      getIo().to(`project:${projectId}`).emit('question_published', {
        projectId,
        quizId,
        questionId,
        isPublished: updatedQuestion.isPublished,
      });

      getIo().to(`project:${projectId}`).emit('quiz_updated', {
        projectId,
        quizId,
        quiz: updatedQuiz,
      });
    } catch (e) {
      console.error('Socket emit error (question_published):', e);
    }

    res.json(updatedQuestion);
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
      include: {
        questions: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz || quiz.projectId !== projectId) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.status === 'CLOSED') {
      return res.status(403).json({ message: 'This quiz has been closed by the creator and is no longer accepting submissions' });
    }

    if (quiz.status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'Quiz is not published' });
    }

    // CHECK FOR EXISTING SUBMISSION
    const existingSubmission = await prisma.quizSubmission.findUnique({
      where: { quizId_userId: { quizId, userId } },
      include: { answers: true },
    });

    const subSubmittedAt = existingSubmission ? new Date(existingSubmission.submittedAt).getTime() : 0;
    const prevAnswersMap = new Map((existingSubmission?.answers || []).map((a) => [a.questionId, a]));
    const incomingAnswersMap = new Map<string, string>(
      (answers || []).map((a: any) => [String(a.questionId), String(a.answerText || '')])
    );

    let totalScore = 0;
    const finalAnswerData: { questionId: string; answerText: string; isCorrect: boolean | null; score: number }[] = [];

    for (const question of quiz.questions) {
      const prevAns = prevAnswersMap.get(question.id);
      const qUpdatedAt = question.updatedAt ? new Date(question.updatedAt).getTime() : 0;
      // An existing question is UNCHANGED if user previously answered it with text and question was NOT updated after user's submission
      const isUnchanged = Boolean(
        existingSubmission && 
        prevAns && 
        prevAns.answerText && 
        prevAns.answerText.trim() !== '' && 
        qUpdatedAt <= subSubmittedAt
      );

      let answerText = '';
      if (isUnchanged && prevAns) {
        // Strictly preserve previously submitted answer for unchanged questions
        answerText = prevAns.answerText;
      } else if (incomingAnswersMap.has(question.id) && (incomingAnswersMap.get(question.id) || '').trim() !== '') {
        // For new or modified questions, accept the incoming answer if non-empty
        answerText = incomingAnswersMap.get(question.id)!.trim();
      } else {
        // Question was not answered in incoming payload or left blank - do not create a fake blank answer row
        continue;
      }

      // Grade the answer
      let isCorrect: boolean | null = null;
      let score = 0;
      if (question.correctAnswer) {
        isCorrect = answerText.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        score = isCorrect ? question.marks : 0;
        totalScore += score;
      } else if (isUnchanged && prevAns) {
        score = prevAns.score || 0;
        isCorrect = prevAns.isCorrect;
        totalScore += score;
      }

      finalAnswerData.push({
        questionId: question.id,
        answerText,
        isCorrect,
        score,
      });
    }

    let submission;

    if (existingSubmission) {
      // Archive previous attempt into history
      const previousHistory = Array.isArray(existingSubmission.history) ? (existingSubmission.history as any[]) : [];
      const attemptSnapshot = {
        attemptNumber: previousHistory.length + 1,
        submittedAt: existingSubmission.submittedAt,
        totalScore: existingSubmission.totalScore,
        answers: existingSubmission.answers.map((a) => ({
          questionId: a.questionId,
          answerText: a.answerText,
          isCorrect: a.isCorrect,
          score: a.score,
        })),
      };

      const updatedHistory = [...previousHistory, attemptSnapshot];

      // Delete old answers and create updated merged answers
      await prisma.quizAnswer.deleteMany({
        where: { submissionId: existingSubmission.id },
      });

      submission = await prisma.quizSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          submittedAt: new Date(),
          totalScore,
          history: updatedHistory,
          answers: {
            create: finalAnswerData,
          },
        },
        include: { answers: true },
      });
    } else {
      submission = await prisma.quizSubmission.create({
        data: {
          quizId,
          userId,
          totalScore,
          history: [],
          answers: {
            create: finalAnswerData,
          },
        },
        include: { answers: true },
      });
    }

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

    const { isOwner, isMember } = await checkProjectAccess(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
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

    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

    const submission = await prisma.quizSubmission.findUnique({
      where: { quizId_userId: { quizId, userId } },
      include: {
        answers: true,
      },
    });

    // If quiz is closed and user is not owner: show total marks only, completely strip questions and answers
    if (!isOwner && quiz.status === 'CLOSED') {
      let totalScore: number | null = null;
      if (submission) {
        const validQuestionIds = new Set(quiz.questions.map((q) => q.id));
        const validAnswers = submission.answers.filter((a) => validQuestionIds.has(a.questionId));
        totalScore = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      }

      return res.json({
        submitted: !!submission,
        isOutdated: false,
        isClosed: true,
        isOwner: false,
        totalMarks,
        submission: submission
          ? {
              id: submission.id,
              quizId: submission.quizId,
              userId: submission.userId,
              submittedAt: submission.submittedAt,
              totalScore,
              answers: [], // Zero questions/answers exposed
            }
          : null,
        questionStates: {},
      });
    }

    const questionStates: Record<
      string,
      {
        status: 'UNCHANGED' | 'MODIFIED' | 'NEW';
        previousAnswer: string | null;
        score: number | null;
        isCorrect: boolean | null;
      }
    > = {};

    let hasPendingChanges = false;

    if (submission && quiz) {
      const answersMap = new Map(submission.answers.map((a) => [a.questionId, a]));
      const subSubmittedAt = new Date(submission.submittedAt).getTime();

      for (const q of quiz.questions) {
        const prevAns = answersMap.get(q.id);

        if (!prevAns || !prevAns.answerText || prevAns.answerText.trim() === '') {
          // New question added/published since submission, or question has no answer
          questionStates[q.id] = {
            status: 'NEW',
            previousAnswer: null,
            score: null,
            isCorrect: null,
          };
          hasPendingChanges = true;
        } else {
          const qUpdatedAt = q.updatedAt ? new Date(q.updatedAt).getTime() : 0;
          const wasModified = qUpdatedAt > subSubmittedAt;

          if (wasModified) {
            questionStates[q.id] = {
              status: 'MODIFIED',
              previousAnswer: prevAns.answerText,
              score: prevAns.score,
              isCorrect: prevAns.isCorrect,
            };
            hasPendingChanges = true;
          } else {
            questionStates[q.id] = {
              status: 'UNCHANGED',
              previousAnswer: prevAns.answerText,
              score: prevAns.score,
              isCorrect: prevAns.isCorrect,
            };
          }
        }
      }
    }

    const isOutdated = !!submission && hasPendingChanges;

    const validQuestionIds = new Set((quiz?.questions || []).map((q) => q.id));
    if (submission) {
      submission.answers = submission.answers.filter((a) => validQuestionIds.has(a.questionId));
      submission.totalScore = submission.answers.reduce((sum, a) => sum + (a.score || 0), 0);
    }

    res.json({
      submitted: !!submission && !isOutdated,
      isOutdated,
      isClosed: quiz.status === 'CLOSED',
      isOwner,
      totalMarks,
      submission,
      questionStates,
    });
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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    const validQuestionIds = new Set((quiz?.questions || []).map((q) => q.id));

    const rawSubmissions = await prisma.quizSubmission.findMany({
      where: { quizId },
      include: {
        user: { select: { id: true, username: true, email: true } },
        answers: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    const submissions = rawSubmissions.map((sub) => {
      const validAnswers = sub.answers.filter((a) => validQuestionIds.has(a.questionId));
      const totalScore = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      return {
        ...sub,
        answers: validAnswers,
        totalScore,
      };
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

    const validQuestionIds = new Set(quiz.questions.map((q) => q.id));
    const totalSubmissions = quiz.submissions.length;
    const maxPossibleScore = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

    // Calculate recalculated total score for each submission based ONLY on active questions
    const scores = quiz.submissions.map((sub) => {
      const validAnswers = sub.answers.filter((a) => validQuestionIds.has(a.questionId));
      return validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
    });

    const averageScore = totalSubmissions > 0 ? scores.reduce((a, b) => a + b, 0) / totalSubmissions : 0;
    const highestScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalSubmissions > 0 ? Math.min(...scores) : 0;
    const passingCount = scores.filter((s) => maxPossibleScore > 0 && s / maxPossibleScore >= 0.5).length;
    const passRate = totalSubmissions > 0 ? Math.round((passingCount / totalSubmissions) * 100) : 0;

    // Score Distribution Bins
    const bins = [
      { label: '0-20%', range: [0, 0.2], count: 0 },
      { label: '21-40%', range: [0.201, 0.4], count: 0 },
      { label: '41-60%', range: [0.401, 0.6], count: 0 },
      { label: '61-80%', range: [0.601, 0.8], count: 0 },
      { label: '81-100%', range: [0.801, 1.0], count: 0 },
    ];

    scores.forEach((score) => {
      const pct = maxPossibleScore > 0 ? score / maxPossibleScore : 0;
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

    // Question Breakdown (Google Forms style question-by-question analytics for active questions only)
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
        optionDistribution: responseDistribution.map((r) => ({
          option: r.answerText,
          count: r.count,
          percentage: r.percentage,
        })),
      };
    });

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
        OR: [{ documentId: docId }, { annotationId: { in: annIds } }],
      },
      include: {
        questions: true,
        submissions: {
          include: {
            user: { select: { id: true, username: true } },
            answers: true,
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
      const validQuestionIds = new Set(quiz.questions.map((q) => q.id));
      const subCount = quiz.submissions.length;
      totalSubmissionsCount += subCount;
      const maxMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

      const scores = quiz.submissions.map((sub) => {
        const validAnswers = (sub.answers || []).filter((a) => validQuestionIds.has(a.questionId));
        return validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      });

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
