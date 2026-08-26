import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '../services/api';

const WS_BASE_URL = (import.meta.env.VITE_WS_URL || API_BASE_URL.replace(/^http/, 'ws')).replace(/\/$/, '');

export function useTripWebSocket(tripId, onEventReceived) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const onEventReceivedRef = useRef(onEventReceived);
  useEffect(() => {
    onEventReceivedRef.current = onEventReceived;
  }, [onEventReceived]);

  const connect = useCallback(() => {
    if (!tripId) return;
    if (socketRef.current) {
      socketRef.current.close();
    }

    const wsUrl = `${WS_BASE_URL}/ws/trips/${tripId}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log(`WebSocket connected for trip ${tripId}`);
      setConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket event received:', data);
        if (onEventReceivedRef.current) {
          onEventReceivedRef.current(data);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    socket.onclose = (event) => {
      console.log(`WebSocket disconnected for trip ${tripId}. Code: ${event.code}`);
      setConnected(false);
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting WebSocket reconnect...');
          connect();
        }, 5000);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      socket.close();
    };
  }, [tripId]);

  useEffect(() => {
    connect();
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  return { connected, sendMessage };
}

export default useTripWebSocket;
