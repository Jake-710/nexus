import { useState, useEffect, useRef } from 'react';

export const useWebSocket = () => {
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [latestAlert, setLatestAlert] = useState(null);
  const wsRef = useRef(null);
  const reconnectDelayRef = useRef(3000);
  const reconnectTimeoutRef = useRef(null);
  const maxAlerts = 100;

  const connect = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/alerts`;

    try {
      wsRef.current = new WebSocket(wsUrl);
    } catch (e) {
      // Guard against constructor errors (e.g. invalid URL)
      console.warn('WebSocket creation failed:', e);
      scheduleReconnect();
      return;
    }

    wsRef.current.onopen = () => {
      setConnected(true);
      reconnectDelayRef.current = 3000; // reset backoff on success
      console.log('WebSocket connected');
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
      scheduleReconnect();
    };
    
    wsRef.current.onerror = () => {
      // onclose will fire after onerror, so just let it handle reconnection
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    const delay = reconnectDelayRef.current;
    reconnectDelayRef.current = Math.min(delay * 2, 30000); // exponential backoff, max 30s
    reconnectTimeoutRef.current = setTimeout(connect, delay);
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { alerts, connected, latestAlert };
};
