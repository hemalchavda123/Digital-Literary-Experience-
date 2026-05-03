"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
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
      transports: ['websocket', 'polling'], // ensure fallback
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinProject = (projectId: string) => {
    if (socket) {
      socket.emit('join_project', projectId);
    }
  };

  const leaveProject = (projectId: string) => {
    if (socket) {
      socket.emit('leave_project', projectId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinProject, leaveProject }}>
      {children}
    </SocketContext.Provider>
  );
}
