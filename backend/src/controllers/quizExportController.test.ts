import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportQuizAnswersExcel } from './quizController';
import prisma from '../config/db';
import { Request, Response } from 'express';
import ExcelJS from 'exceljs';

// Mock prisma
vi.mock('../config/db', () => ({
  default: {
    project: {
      findUnique: vi.fn(),
    },
    quiz: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../socket', () => ({
  getIo: vi.fn(() => ({
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  })),
}));

describe('exportQuizAnswersExcel', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: any;
  let statusMock: any;
  let jsonMock: any;
  let setHeaderMock: any;
  let sendMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn().mockReturnThis();
    setHeaderMock = vi.fn().mockReturnThis();
    sendMock = vi.fn().mockReturnThis();
    mockNext = vi.fn();

    mockReq = {
      params: {
        projectId: 'proj-123',
        quizId: 'quiz-456',
      },
      user: {
        userId: 'owner-789',
      },
    } as any;

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
      send: sendMock,
    };
  });

  it('should return 403 if requester is not the project owner (quiz maker)', async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      ownerId: 'different-owner',
      members: [{ userId: 'owner-789' }], // Member but not owner
    });

    await exportQuizAnswersExcel(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Only the quiz creator can download quiz answers data',
    });
  });

  it('should return 404 if quiz is not found', async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      ownerId: 'owner-789',
      members: [],
    });
    (prisma.quiz.findUnique as any).mockResolvedValue(null);

    await exportQuizAnswersExcel(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Quiz not found',
    });
  });

  it('should return 400 if quiz is not closed (status is PUBLISHED)', async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      ownerId: 'owner-789',
      members: [],
    });
    (prisma.quiz.findUnique as any).mockResolvedValue({
      id: 'quiz-456',
      projectId: 'proj-123',
      title: 'Active Quiz',
      status: 'PUBLISHED',
      questions: [],
      submissions: [],
    });

    await exportQuizAnswersExcel(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Quiz answers data is only available and downloadable after the quiz is closed',
    });
  });

  it('should return 400 if quiz is not closed (status is DRAFT)', async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      ownerId: 'owner-789',
      members: [],
    });
    (prisma.quiz.findUnique as any).mockResolvedValue({
      id: 'quiz-456',
      projectId: 'proj-123',
      title: 'Draft Quiz',
      status: 'DRAFT',
      questions: [],
      submissions: [],
    });

    await exportQuizAnswersExcel(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Quiz answers data is only available and downloadable after the quiz is closed',
    });
  });

  it('should export Excel file with answers when requester is owner and quiz is CLOSED', async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      ownerId: 'owner-789',
      members: [],
    });

    const mockQuiz = {
      id: 'quiz-456',
      projectId: 'proj-123',
      title: 'Final Exam Literature',
      description: 'Comprehensive test',
      status: 'CLOSED',
      questions: [
        {
          id: 'q1',
          order: 0,
          type: 'MULTIPLE_CHOICE',
          questionText: 'Who wrote The Great Gatsby?',
          options: JSON.stringify(['F. Scott Fitzgerald', 'Ernest Hemingway', 'Mark Twain']),
          marks: 5,
          correctAnswer: 'F. Scott Fitzgerald',
        },
        {
          id: 'q2',
          order: 1,
          type: 'ONE_WORD',
          questionText: 'What was Ahab searching for?',
          options: null,
          marks: 5,
          correctAnswer: 'Moby Dick',
        },
      ],
      submissions: [
        {
          id: 'sub-1',
          quizId: 'quiz-456',
          userId: 'user-alice',
          submittedAt: new Date('2026-10-30T10:00:00Z'),
          totalScore: 10,
          user: {
            id: 'user-alice',
            username: 'alice',
            email: 'alice@example.com',
          },
          answers: [
            {
              id: 'a1',
              questionId: 'q1',
              answerText: 'F. Scott Fitzgerald',
              isCorrect: true,
              score: 5,
            },
            {
              id: 'a2',
              questionId: 'q2',
              answerText: 'Moby Dick',
              isCorrect: true,
              score: 5,
            },
          ],
        },
        {
          id: 'sub-2',
          quizId: 'quiz-456',
          userId: 'user-bob',
          submittedAt: new Date('2026-10-30T11:00:00Z'),
          totalScore: 0,
          user: {
            id: 'user-bob',
            username: 'bob',
            email: 'bob@example.com',
          },
          answers: [
            {
              id: 'a3',
              questionId: 'q1',
              answerText: 'Ernest Hemingway',
              isCorrect: false,
              score: 0,
            },
          ],
        },
      ],
    };

    (prisma.quiz.findUnique as any).mockResolvedValue(mockQuiz);

    await exportQuizAnswersExcel(mockReq as Request, mockRes as Response, mockNext);

    expect(setHeaderMock).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(setHeaderMock).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('Final_Exam_Literature_Answers_quiz-456.xlsx')
    );
    expect(sendMock).toHaveBeenCalled();

    // Verify generated buffer is a valid Excel workbook with our sheets
    const sentBuffer = sendMock.mock.calls[0][0];
    expect(Buffer.isBuffer(sentBuffer)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(sentBuffer);

    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([
      'Student Responses',
      'Itemized Answers Log',
      'Questions & Answer Key',
    ]);

    // Check Sheet 1 (Student Responses)
    const sheet1 = workbook.getWorksheet('Student Responses')!;
    expect(sheet1.getCell('A1').value).toBe('QUIZ ANSWERS REPORT: FINAL EXAM LITERATURE');

    // Check Sheet 2 (Itemized Answers Log)
    const sheet2 = workbook.getWorksheet('Itemized Answers Log')!;
    const sheet2HeaderRow = sheet2.getRow(1).values as string[];
    expect(sheet2HeaderRow).toContain('Student Username');
    expect(sheet2HeaderRow).toContain('Correct Answer');
    expect(sheet2HeaderRow).toContain('Student Answer');

    // Check Sheet 3 (Questions & Answer Key)
    const sheet3 = workbook.getWorksheet('Questions & Answer Key')!;
    const sheet3HeaderRow = sheet3.getRow(1).values as string[];
    expect(sheet3HeaderRow).toContain('Question Text');
    expect(sheet3HeaderRow).toContain('Accuracy %');
  });

  it('should export Excel file even when there are 0 submissions', async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      ownerId: 'owner-789',
      members: [],
    });

    const mockQuiz = {
      id: 'quiz-empty',
      projectId: 'proj-123',
      title: 'Empty Quiz',
      description: '',
      status: 'CLOSED',
      questions: [
        {
          id: 'q1',
          order: 0,
          type: 'SHORT_ANSWER',
          questionText: 'Explain the theme',
          options: null,
          marks: 10,
          correctAnswer: 'Theme explanation',
        },
      ],
      submissions: [],
    };

    (prisma.quiz.findUnique as any).mockResolvedValue(mockQuiz);

    await exportQuizAnswersExcel(mockReq as Request, mockRes as Response, mockNext);

    expect(setHeaderMock).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(sendMock).toHaveBeenCalled();

    const sentBuffer = sendMock.mock.calls[0][0];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(sentBuffer);
    expect(workbook.worksheets.length).toBe(3);
  });
});

