import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../api/client';

interface UseWebSocketOptions {
  onNewMessage?: (data: { conversationId: string; message: any }) => void;
  onWaStatus?: (data: { connected: boolean; qr?: string; phoneNumber?: string }) => void;
  onWaQR?: (data: { qr: string }) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const socket = io('/ws', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('newMessage', (data) => {
      options.onNewMessage?.(data);
    });

    socket.on('waStatus', (data) => {
      options.onWaStatus?.(data);
    });

    socket.on('waQR', (data) => {
      options.onWaQR?.(data);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Connect once on mount

  return socketRef;
}
