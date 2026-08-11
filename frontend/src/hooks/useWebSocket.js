import { useState, useEffect, useRef } from 'react';

export const useWebSocket = () => {
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [latestAlert, setLatestAlert] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const maxAlerts = 100;

  const connect = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/alerts`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    wsRef.current.onmessage = (event) => {
      try {
        const newAlert = JSON.parse(event.data);
        setLatestAlert(newAlert);
        setAlerts((prev) => [newAlert, ...prev].slice(0, maxAlerts));
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    wsRef.current.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected. Reconnecting...');
      // Exponential backoff or simple fixed backoff
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
    
    wsRef.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      wsRef.current.close();
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { alerts, connected, latestAlert };
};
