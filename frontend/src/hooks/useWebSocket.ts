import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  event: string;
  [key: string]: any;
}

export function useWebSocket(room: string, onMessage?: (data: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const onMessageRef = useRef(onMessage);

  // Keep the callback ref fresh without re-triggering the effect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let isMounted = true;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const doConnect = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000';
      const url = `${wsUrl}/ws/${room}?token=${token}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setIsConnected(true);
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessageRef.current) onMessageRef.current(data);
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.onclose = () => {
        if (isMounted) setIsConnected(false);
        if (isMounted && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          reconnectTimeoutRef.current = window.setTimeout(doConnect, timeout);
        }
      };

      ws.onerror = (err) => {
        console.error(`WebSocket error in room ${room}:`, err);
        ws.close();
      };
    };

    doConnect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [room]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { isConnected, lastMessage };
}
