"use client"

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const joinedProjectsRef = useRef<Set<string>>(new Set());

  const joinProject = useCallback((projectId: string) => {
    if (!projectId) return;
    joinedProjectsRef.current.add(projectId);
    if (socketRef.current) {
      socketRef.current.emit('join_project', projectId);
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (!projectId) return;
    joinedProjectsRef.current.delete(projectId);
    if (socketRef.current) {
      socketRef.current.emit('leave_project', projectId);
    }
  }, []);

  useEffect(() => {
    // Only connect if we are in the browser
    if (typeof window === 'undefined') return;

    // Get auth token from cookie if available
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
      return match ? match[1] : null;
    };
    
    const token = getCookie('accessToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    // We need the origin, not /api
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');

    const newSocket = io(baseUrl, {
      auth: token ? { token } : {},
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server:', newSocket.id);
      // Re-join all active projects whenever connected or reconnected
      joinedProjectsRef.current.forEach((projectId) => {
        newSocket.emit('join_project', projectId);
      });
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
    });

    setSocket(newSocket);

    // Also emit for any projects already added before connect event fired
    joinedProjectsRef.current.forEach((projectId) => {
      newSocket.emit('join_project', projectId);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, joinProject, leaveProject }}>
      {children}
    </SocketContext.Provider>
  );
}
