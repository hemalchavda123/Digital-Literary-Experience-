import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = (server: HttpServer) => {
  const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000,https://exegesis.dau.ac.in')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin: string | undefined, cb: (err: Error | null, success?: boolean) => void) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
          return cb(null, true);
        }
        if (origin.includes('exegesis.dau.ac.in') || origin.endsWith('.dau.ac.in')) return cb(null, true);
        if (origin.match(/^https:\/\/digital-literary-experience.*\.vercel\.app$/)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    }
  });

  // Optional: Add authentication middleware
  io.use((socket: Socket, next: (err?: any) => void) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret');
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const activeQuizzes = new Set<string>();

    socket.on('join_project', (projectId: string) => {
      console.log(`Socket ${socket.id} joined project: ${projectId}`);
      socket.join(`project:${projectId}`);
    });

    socket.on('leave_project', (projectId: string) => {
      console.log(`Socket ${socket.id} left project: ${projectId}`);
      socket.leave(`project:${projectId}`);
    });

    // Quiz Presence (Live student count)
    socket.on('join_quiz', ({ quizId, projectId }: { quizId: string; projectId?: string }) => {
      socket.join(`quiz:${quizId}`);
      activeQuizzes.add(quizId);
      const activeCount = io.sockets.adapter.rooms.get(`quiz:${quizId}`)?.size || 0;
      io.to(`quiz:${quizId}`).emit('quiz_presence_update', { quizId, activeCount });
      if (projectId) {
        io.to(`project:${projectId}`).emit('quiz_presence_update', { quizId, activeCount });
      }
    });

    socket.on('leave_quiz', ({ quizId, projectId }: { quizId: string; projectId?: string }) => {
      socket.leave(`quiz:${quizId}`);
      activeQuizzes.delete(quizId);
      const activeCount = io.sockets.adapter.rooms.get(`quiz:${quizId}`)?.size || 0;
      io.to(`quiz:${quizId}`).emit('quiz_presence_update', { quizId, activeCount });
      if (projectId) {
        io.to(`project:${projectId}`).emit('quiz_presence_update', { quizId, activeCount });
      }
    });

    socket.on('disconnecting', () => {
      for (const quizId of activeQuizzes) {
        const room = io.sockets.adapter.rooms.get(`quiz:${quizId}`);
        const activeCount = room ? Math.max(0, room.size - 1) : 0;
        io.to(`quiz:${quizId}`).emit('quiz_presence_update', { quizId, activeCount });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
};
