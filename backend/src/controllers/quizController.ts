import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { getIo } from '../socket';
import ExcelJS from 'exceljs';

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

    // Check if answers should be revealed to this student
    if (!isOwner) {
      const studentSub = await prisma.quizSubmission.findUnique({
        where: { quizId_userId: { quizId, userId } },
      });

      const shouldRevealAnswers =
        (quiz.answerRevealMode === 'IMMEDIATE' && !!studentSub) ||
        (quiz.answerRevealMode === 'AFTER_QUIZ_CLOSED' && quiz.status === 'CLOSED');

      if (!shouldRevealAnswers) {
        if (quiz.status === 'CLOSED' && quiz.answerRevealMode !== 'AFTER_QUIZ_CLOSED') {
          // Hide questions completely when closed if answers should not be revealed
          quiz.questions = [];
        } else {
          // Hide sensitive answers and model answers
          quiz.questions = quiz.questions.map((q) => ({
            ...q,
            correctAnswer: null,
            modelAnswer: null,
          }));
        }
      }
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
    const { title, description, status, questions, documentId, annotationId, answerRevealMode, showLeaderboard } = req.body;

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
        answerRevealMode: answerRevealMode || 'IMMEDIATE',
        showLeaderboard: showLeaderboard !== undefined ? Boolean(showLeaderboard) : true,
        questions: {
          create: (questions || []).map((q: any, i: number) => ({
            type: q.type,
            questionText: q.questionText,
            options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
            order: i,
            marks: q.marks !== undefined ? Number(q.marks) : 1,
            negativeMarks: q.negativeMarks !== undefined ? Number(q.negativeMarks) : 0,
            partialMarkingRule: q.partialMarkingRule || 'PROPORTIONAL_WITH_PENALTY',
            correctAnswer: q.correctAnswer || null,
            modelAnswer: q.modelAnswer || null,
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
    const { title, description, status, questions, documentId, annotationId, answerRevealMode, showLeaderboard } = req.body;

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
        const qMarks = q.marks !== undefined ? Number(q.marks) : 1;
        const qNegativeMarks = q.negativeMarks !== undefined ? Number(q.negativeMarks) : 0;
        const qPartialRule = q.partialMarkingRule || 'PROPORTIONAL_WITH_PENALTY';
        const qModelAnswer = q.modelAnswer !== undefined ? (q.modelAnswer ? String(q.modelAnswer).trim() : null) : null;

        if (q.id && existingMap.has(q.id)) {
          const existing = existingMap.get(q.id)!;
          // Check if question details were MODIFIED
          const textChanged = existing.questionText !== q.questionText;
          const typeChanged = existing.type !== q.type;
          const optionsChanged = existing.options !== formattedOptions;
          const answerChanged = (existing.correctAnswer || '') !== (q.correctAnswer || '');
          const marksChanged = existing.marks !== qMarks;
          const negativeMarksChanged = existing.negativeMarks !== qNegativeMarks;
          const partialRuleChanged = existing.partialMarkingRule !== qPartialRule;
          const modelAnswerChanged = (existing.modelAnswer || '') !== (qModelAnswer || '');
          const isModified = textChanged || typeChanged || optionsChanged || answerChanged || marksChanged || negativeMarksChanged || partialRuleChanged || modelAnswerChanged;

          // DO NOT delete past responses! Keep previous submitted answers stored and available.
          // Update question properties. If modified, set updatedAt to now.
          await prisma.quizQuestion.update({
            where: { id: q.id },
            data: {
              type: q.type,
              questionText: q.questionText,
              options: formattedOptions,
              order: i,
              marks: qMarks,
              negativeMarks: qNegativeMarks,
              partialMarkingRule: qPartialRule,
              correctAnswer: q.correctAnswer || null,
              modelAnswer: qModelAnswer,
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
              marks: qMarks,
              negativeMarks: qNegativeMarks,
              partialMarkingRule: qPartialRule,
              correctAnswer: q.correctAnswer || null,
              modelAnswer: qModelAnswer,
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
        ...(answerRevealMode !== undefined ? { answerRevealMode } : {}),
        ...(showLeaderboard !== undefined ? { showLeaderboard: Boolean(showLeaderboard) } : {}),
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
      const qMarks = Number(question.marks) || 1;
      const qNegative = Number(question.negativeMarks) || 0;

      if (question.correctAnswer) {
        if (question.type === 'MULTIPLE_CORRECT') {
          const correctList = question.correctAnswer.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
          const userList = answerText.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
          const correctSet = new Set(correctList);
          const userSet = new Set(userList);

          const isExactMatch = correctList.length === userList.length && correctList.every((opt: string) => userSet.has(opt));

          if (question.partialMarkingRule === 'NONE') {
            isCorrect = isExactMatch;
            score = isExactMatch ? qMarks : (qNegative > 0 ? -qNegative : 0);
          } else if (question.partialMarkingRule === 'POSITIVE_ONLY') {
            const correctChosen = userList.filter((opt: string) => correctSet.has(opt)).length;
            const valPerOption = correctList.length > 0 ? qMarks / correctList.length : 0;
            score = Math.round(correctChosen * valPerOption * 100) / 100;
            isCorrect = isExactMatch;
          } else {
            // PROPORTIONAL_WITH_PENALTY
            const correctChosen = userList.filter((opt: string) => correctSet.has(opt)).length;
            const wrongChosen = userList.filter((opt: string) => !correctSet.has(opt)).length;
            const valPerOption = correctList.length > 0 ? qMarks / correctList.length : 0;
            const rawScore = (correctChosen * valPerOption) - (wrongChosen * valPerOption);
            score = Math.max(0, Math.round(rawScore * 100) / 100);
            isCorrect = isExactMatch;
          }
        } else {
          isCorrect = answerText.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
          score = isCorrect ? qMarks : (qNegative > 0 ? -qNegative : 0);
        }
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

    totalScore = Math.max(0, Math.round(totalScore * 100) / 100);

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

    try {
      getIo().to(`project:${projectId}`).emit('submission_recorded', {
        projectId,
        quizId,
        submission,
      });
      getIo().to(`quiz:${quizId}`).emit('submission_recorded', {
        projectId,
        quizId,
        submission,
      });
    } catch (e) {
      console.error('Socket emit error (submission_recorded):', e);
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

    const shouldRevealAnswers =
      isOwner ||
      quiz.answerRevealMode === 'IMMEDIATE' ||
      (quiz.answerRevealMode === 'AFTER_QUIZ_CLOSED' && quiz.status === 'CLOSED');

    // If quiz is closed and user is not owner and answers are NOT to be revealed: show total marks only
    if (!isOwner && quiz.status === 'CLOSED' && !shouldRevealAnswers) {
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

    // Filter questions depending on answer reveal policy
    const questionsWithRevealPolicy = quiz.questions.map((q) => {
      if (shouldRevealAnswers) {
        return q;
      }
      return {
        ...q,
        correctAnswer: null,
        modelAnswer: null,
      };
    });

    res.json({
      submitted: !!submission && !isOutdated,
      isOutdated,
      isClosed: quiz.status === 'CLOSED',
      isOwner,
      totalMarks,
      submission,
      questionStates,
      quiz: {
        ...quiz,
        questions: questionsWithRevealPolicy,
      },
      showLeaderboard: quiz.showLeaderboard,
      shouldRevealAnswers,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuizLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
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
        questions: { where: { isPublished: true } },
      },
    });

    if (!quiz || quiz.projectId !== projectId) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check visibility toggle: instructor always sees, student sees if showLeaderboard is true
    if (!isOwner && quiz.showLeaderboard === false) {
      return res.status(403).json({ message: 'The leaderboard is currently hidden by the instructor' });
    }

    const maxPossibleScore = quiz.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId },
      include: {
        user: { select: { id: true, username: true, email: true } },
        answers: true,
      },
      orderBy: [
        { totalScore: 'desc' },
        { submittedAt: 'asc' }, // Earliest submission breaks score ties
      ],
    });

    const leaderboard = submissions.map((sub, index) => {
      const score = sub.totalScore ?? 0;
      const percentage = maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;
      return {
        rank: index + 1,
        userId: sub.userId,
        username: sub.user?.username || 'Unknown',
        email: isOwner ? sub.user?.email : undefined,
        totalScore: score,
        maxPossibleScore,
        percentage,
        submittedAt: sub.submittedAt,
        answersCount: sub.answers?.length || 0,
      };
    });

    res.json({
      quizId,
      quizTitle: quiz.title,
      maxPossibleScore,
      showLeaderboard: quiz.showLeaderboard,
      leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentPerformanceTracker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = (req as any).user?.userId;
    const rawTargetUserId = req.query.userId as string | undefined;
    const targetUserId =
      rawTargetUserId && rawTargetUserId !== 'undefined' && rawTargetUserId !== 'null'
        ? rawTargetUserId
        : userId;

    const { isOwner, isMember } = await checkProjectAccess(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Non-owners can only view their own performance
    if (!isOwner && targetUserId !== userId) {
      return res.status(403).json({ message: 'You can only view your own performance history' });
    }

    // Get all quizzes in this project
    const quizzes = await prisma.quiz.findMany({
      where: { projectId },
      include: {
        questions: { where: { isPublished: true } },
        submissions: {
          include: {
            user: { select: { id: true, username: true, email: true } },
          },
          orderBy: [
            { totalScore: 'desc' },
            { submittedAt: 'asc' },
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const targetUser = targetUserId
      ? await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, username: true, email: true },
        })
      : null;

    const performanceRecords: any[] = [];

    quizzes.forEach((quiz) => {
      const maxMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
      const subIndex = quiz.submissions.findIndex((s) => s.userId === targetUserId);

      if (subIndex !== -1) {
        const sub = quiz.submissions[subIndex];
        const score = sub.totalScore ?? 0;
        const percentage = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;

        performanceRecords.push({
          quizId: quiz.id,
          quizTitle: quiz.title,
          submittedAt: sub.submittedAt,
          score,
          totalMarks: maxMarks,
          percentage,
          rank: subIndex + 1,
          totalParticipants: quiz.submissions.length,
        });
      }
    });

    const totalQuizzesTaken = performanceRecords.length;
    const averageScorePercentage = totalQuizzesTaken > 0
      ? Math.round(performanceRecords.reduce((sum, r) => sum + r.percentage, 0) / totalQuizzesTaken)
      : 0;
    const highestScorePercentage = totalQuizzesTaken > 0
      ? Math.max(...performanceRecords.map((r) => r.percentage))
      : 0;

    res.json({
      userId: targetUserId,
      username: targetUser?.username || (targetUserId === userId ? (req as any).user?.username : 'Student'),
      email: isOwner ? targetUser?.email : undefined,
      totalQuizzesTaken,
      totalQuizzesInProject: quizzes.length,
      averageScorePercentage,
      highestScorePercentage,
      quizzes: performanceRecords,
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
      if ((q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_CORRECT') && q.options) {
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
        let isCorrect: boolean | null = null;
        if (q.correctAnswer) {
          if (q.type === 'MULTIPLE_CORRECT') {
            const normalize = (s: string) => s.split(',').map(x => x.trim().toUpperCase()).filter(Boolean).sort().join(',');
            isCorrect = normalize(answerText) === normalize(q.correctAnswer);
          } else {
            isCorrect = answerText.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          }
        }
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
        negativeMarks: q.negativeMarks,
        partialMarkingRule: q.partialMarkingRule,
        modelAnswer: q.modelAnswer,
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

// EXCEL EXPORT FOR QUIZ ANSWERS (ACCESSIBLE ONLY TO QUIZ MAKER AFTER QUIZ IS CLOSED)
export const exportQuizAnswersExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    const userId = (req as any).user?.userId;

    // 1. Authorization: ONLY project owner (quiz maker) has access
    const { isOwner } = await checkProjectAccess(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the quiz creator can download quiz answers data' });
    }

    // 2. Fetch quiz details, questions, and all submissions with user answers
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        submissions: {
          include: {
            user: { select: { id: true, username: true, email: true } },
            answers: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!quiz || quiz.projectId !== projectId) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // 3. Condition: ONLY available after the quiz is closed
    if (quiz.status !== 'CLOSED') {
      return res.status(400).json({
        message: 'Quiz answers data is only available and downloadable after the quiz is closed',
      });
    }

    // 4. Generate the Excel workbook using ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Digital Literary Experience';
    workbook.lastModifiedBy = 'Digital Literary Experience';
    workbook.created = new Date();
    workbook.modified = new Date();

    const questions = quiz.questions;
    const questionIds = new Set(questions.map((q) => q.id));
    const maxPossibleScore = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const submissions = quiz.submissions;
    const totalSubmissions = submissions.length;

    // Common styling
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Dark slate
    };
    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Calibri',
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // ---------------------------------------------------------
    // SHEET 1: Summary & Responses Matrix (Which user answered what)
    // ---------------------------------------------------------
    const sheet1 = workbook.addWorksheet('Student Responses');

    // Title & Info
    sheet1.addRow([`QUIZ ANSWERS REPORT: ${quiz.title.toUpperCase()}`]);
    sheet1.mergeCells('A1:F1');
    const titleCell = sheet1.getCell('A1');
    titleCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(1).height = 30;

    sheet1.addRow([]); // Row 2 empty
    sheet1.addRow(['Quiz Status:', quiz.status, 'Total Questions:', questions.length, 'Total Submissions:', totalSubmissions]);
    sheet1.addRow(['Export Date:', new Date().toISOString().replace('T', ' ').substring(0, 19), 'Max Marks:', maxPossibleScore, 'Description:', quiz.description || 'N/A']);
    sheet1.getRow(3).font = { bold: true };
    sheet1.getRow(4).font = { bold: true };
    sheet1.addRow([]); // Row 5 empty

    // Headers for table
    const tableHeaderRow = [
      'Student Username',
      'Student Email',
      'Submission Date',
      'Total Score',
      'Max Marks',
      'Score %',
    ];

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const truncatedText = q.questionText.length > 35 ? `${q.questionText.slice(0, 32)}...` : q.questionText;
      tableHeaderRow.push(`Q${qNum}: ${truncatedText} [Answer]`);
      tableHeaderRow.push(`Q${qNum} Result`);
      tableHeaderRow.push(`Q${qNum} Marks`);
    });

    sheet1.addRow(tableHeaderRow);
    const sheet1HeaderRowIndex = 6;
    const s1HeaderRow = sheet1.getRow(sheet1HeaderRowIndex);
    s1HeaderRow.height = 26;
    s1HeaderRow.eachCell((cell: ExcelJS.Cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = borderStyle;
    });

    // Populate student submissions
    submissions.forEach((sub) => {
      const answersMap = new Map((sub.answers || []).map((a) => [a.questionId, a]));
      const validAnswers = (sub.answers || []).filter((a) => questionIds.has(a.questionId));
      const studentScore = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      const pct = maxPossibleScore > 0 ? Math.round((studentScore / maxPossibleScore) * 100) : 0;
      const submittedDateStr = sub.submittedAt ? new Date(sub.submittedAt).toISOString().replace('T', ' ').substring(0, 19) : 'N/A';

      const rowValues: (string | number)[] = [
        sub.user?.username || 'Unknown',
        sub.user?.email || 'N/A',
        submittedDateStr,
        studentScore,
        maxPossibleScore,
        `${pct}%`,
      ];

      questions.forEach((q) => {
        const ans = answersMap.get(q.id);
        const ansText = ans?.answerText && ans.answerText.trim() !== '' ? ans.answerText : '(No Answer)';
        const result = ans
          ? (ans.isCorrect === true ? 'Correct' : ans.isCorrect === false ? 'Incorrect' : 'Submitted')
          : 'No Answer';
        const score = ans?.score ?? 0;
        rowValues.push(ansText, result, score);
      });

      const dataRow = sheet1.addRow(rowValues);
      dataRow.height = 20;

      dataRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        cell.border = borderStyle;
        cell.alignment = { vertical: 'middle' };

        // Center align timestamps, scores, percentages
        if (colNumber >= 3 && colNumber <= 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Color coding for results
        const cellValue = cell.value?.toString();
        if (cellValue === 'Correct') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // light green
          cell.font = { color: { argb: 'FF166534' }, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (cellValue === 'Incorrect') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // light red
          cell.font = { color: { argb: 'FF991B1B' }, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (cellValue === 'No Answer') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.font = { color: { argb: 'FF64748B' }, italic: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    // ---------------------------------------------------------
    // SHEET 2: Itemized Answer Log (Individual Answer per Row)
    // ---------------------------------------------------------
    const sheet2 = workbook.addWorksheet('Itemized Answers Log');
    const sheet2Headers = [
      'Student Username',
      'Student Email',
      'Submitted At',
      'Question #',
      'Question Type',
      'Question Text',
      'Correct Answer',
      'Student Answer',
      'Result',
      'Marks Awarded',
      'Max Marks',
    ];

    sheet2.addRow(sheet2Headers);
    const s2HeaderRow = sheet2.getRow(1);
    s2HeaderRow.height = 26;
    s2HeaderRow.eachCell((cell: ExcelJS.Cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    submissions.forEach((sub) => {
      const answersMap = new Map((sub.answers || []).map((a) => [a.questionId, a]));
      const submittedDateStr = sub.submittedAt ? new Date(sub.submittedAt).toISOString().replace('T', ' ').substring(0, 19) : 'N/A';

      questions.forEach((q, idx) => {
        const ans = answersMap.get(q.id);
        const ansText = ans?.answerText && ans.answerText.trim() !== '' ? ans.answerText : '(No Answer)';
        const result = ans
          ? (ans.isCorrect === true ? 'Correct' : ans.isCorrect === false ? 'Incorrect' : 'Submitted')
          : 'No Answer';
        const score = ans?.score ?? 0;

        const row = sheet2.addRow([
          sub.user?.username || 'Unknown',
          sub.user?.email || 'N/A',
          submittedDateStr,
          `Q${idx + 1}`,
          q.type,
          q.questionText,
          q.correctAnswer || 'N/A',
          ansText,
          result,
          score,
          q.marks || 1,
        ]);
        row.height = 20;

        row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
          cell.border = borderStyle;
          cell.alignment = { vertical: 'middle' };

          if ([3, 4, 5, 9, 10, 11].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          if (colNumber === 9) {
            const cellValue = cell.value?.toString();
            if (cellValue === 'Correct') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
              cell.font = { color: { argb: 'FF166534' }, bold: true };
            } else if (cellValue === 'Incorrect') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
              cell.font = { color: { argb: 'FF991B1B' }, bold: true };
            }
          }
        });
      });
    });

    sheet2.autoFilter = { from: 'A1', to: 'K1' };

    // ---------------------------------------------------------
    // SHEET 3: Questions & Answer Key
    // ---------------------------------------------------------
    const sheet3 = workbook.addWorksheet('Questions & Answer Key');
    const sheet3Headers = [
      'Question #',
      'Question Type',
      'Question Text',
      'Options (if MCQ)',
      'Correct Answer',
      'Max Marks',
      'Total Answers',
      'Correct Count',
      'Incorrect Count',
      'Accuracy %',
    ];

    sheet3.addRow(sheet3Headers);
    const s3HeaderRow = sheet3.getRow(1);
    s3HeaderRow.height = 26;
    s3HeaderRow.eachCell((cell: ExcelJS.Cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    questions.forEach((q, idx) => {
      const allAns = submissions.flatMap((s) => (s.answers || []).filter((a) => a.questionId === q.id));
      const totalAns = allAns.length;
      const correctCount = allAns.filter((a) => a.isCorrect === true).length;
      const incorrectCount = allAns.filter((a) => a.isCorrect === false).length;
      const accuracy = totalAns > 0 ? Math.round((correctCount / totalAns) * 100) : 0;

      let formattedOptions = 'N/A';
      if (q.options) {
        try {
          const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          if (Array.isArray(opts)) {
            formattedOptions = opts.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(' | ');
          }
        } catch {
          formattedOptions = String(q.options);
        }
      }

      const row = sheet3.addRow([
        `Q${idx + 1}`,
        q.type,
        q.questionText,
        formattedOptions,
        q.correctAnswer || 'N/A',
        q.marks || 1,
        totalAns,
        correctCount,
        incorrectCount,
        `${accuracy}%`,
      ]);
      row.height = 20;

      row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        cell.border = borderStyle;
        cell.alignment = { vertical: 'middle' };
        if ([1, 2, 5, 6, 7, 8, 9, 10].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    sheet3.autoFilter = { from: 'A1', to: 'J1' };

    // Auto-fit column widths across all sheets
    [sheet1, sheet2, sheet3].forEach((sheet) => {
      sheet.columns.forEach((col: Partial<ExcelJS.Column>) => {
        let maxLen = 10;
        col.eachCell?.({ includeEmpty: false }, (cell: ExcelJS.Cell) => {
          const val = cell.value ? String(cell.value) : '';
          const len = Math.min(val.length, 40);
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.max(maxLen + 3, 12);
      });
    });

    // 5. Send file buffer with proper headers
    const sanitizedTitle = (quiz.title || 'Quiz').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${sanitizedTitle}_Answers_${quiz.id.slice(0, 8)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};
