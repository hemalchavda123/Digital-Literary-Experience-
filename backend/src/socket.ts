import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = (server: HttpServer) => {
  const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin: string | undefined, cb: (err: Error | null, success?: boolean) => void) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
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

    socket.on('join_project', (projectId: string) => {
      console.log(`Socket ${socket.id} joined project: ${projectId}`);
      socket.join(`project:${projectId}`);
    });

    socket.on('leave_project', (projectId: string) => {
      console.log(`Socket ${socket.id} left project: ${projectId}`);
      socket.leave(`project:${projectId}`);
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
