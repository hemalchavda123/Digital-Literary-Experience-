import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const getQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const isOwner = (req as any).user?.userId === (await prisma.project.findUnique({ where: { id: projectId } }))?.ownerId;

    const quizzes = await prisma.quiz.findMany({
      where: {
        projectId,
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
    const isOwner = (req as any).user?.userId === (await prisma.project.findUnique({ where: { id: projectId } }))?.ownerId;

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        projectId,
        ...(isOwner ? {} : { status: 'PUBLISHED' }),
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    next(error);
  }
};

export const createQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { title, description, status, questions } = req.body;
    
    // Only owner should create quizzes. The auth middleware might just check membership,
    // so we enforce owner check here.
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.ownerId !== (req as any).user?.userId) {
      return res.status(403).json({ message: 'Only project owner can create quizzes' });
    }

    const newQuiz = await prisma.quiz.create({
      data: {
        projectId,
        title,
        description,
        status: status || 'DRAFT',
        questions: {
          create: (questions || []).map((q: any, i: number) => ({
            type: q.type,
            questionText: q.questionText,
            options: q.options ? JSON.stringify(q.options) : null,
            order: i,
            marks: q.marks || 1,
            correctAnswer: q.correctAnswer || null
          }))
        }
      },
      include: {
        questions: true,
      }
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
    const { title, description, status, questions } = req.body;
    
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.ownerId !== (req as any).user?.userId) {
      return res.status(403).json({ message: 'Only project owner can update quizzes' });
    }

    // Since questions can be added, updated, or removed, the simplest approach for a draft
    // update is to delete existing questions and recreate them.
    if (questions) {
      await prisma.quizQuestion.deleteMany({ where: { quizId } });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        description,
        status,
        ...(questions ? {
          questions: {
            create: questions.map((q: any, i: number) => ({
              type: q.type,
              questionText: q.questionText,
              options: q.options ? JSON.stringify(q.options) : null,
              order: i,
              marks: q.marks || 1,
              correctAnswer: q.correctAnswer || null
            }))
          }
        } : {})
      },
      include: { questions: true }
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
    
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.ownerId !== (req as any).user?.userId) {
      return res.status(403).json({ message: 'Only project owner can delete quizzes' });
    }

    await prisma.quiz.delete({
      where: { id: quizId }
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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });

    if (!quiz || quiz.status !== 'PUBLISHED' || quiz.projectId !== projectId) {
      return res.status(404).json({ message: 'Quiz not found or not published' });
    }

    // Calculate score (simple auto-grading if correctAnswer is set)
    let totalScore = 0;
    const answerData = answers.map((ans: any) => {
      const question = quiz.questions.find((q: any) => q.id === ans.questionId);
      let isCorrect = null;
      let score = 0;

      if (question && question.correctAnswer) {
        // Simple string matching for auto grade
        isCorrect = (ans.answerText.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase());
        score = isCorrect ? question.marks : 0;
        totalScore += score;
      }

      return {
        questionId: ans.questionId,
        answerText: ans.answerText,
        isCorrect,
        score
      };
    });

    const submission = await prisma.quizSubmission.create({
      data: {
        quizId,
        userId,
        totalScore,
        answers: {
          create: answerData
        }
      },
      include: { answers: true }
    });

    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
};

export const getSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const quizId = req.params.quizId as string;
    
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.ownerId !== (req as any).user?.userId) {
      return res.status(403).json({ message: 'Only project owner can view all submissions' });
    }

    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId },
      include: {
        user: { select: { id: true, username: true, email: true } },
        answers: true
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json(submissions);
  } catch (error) {
    next(error);
  }
};
