import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, AppState } from "react-native";
import type {
  WSMessage,
  WSEventType,
  BalanceUpdatePayload,
  TransactionPayload,
  TransferStatusPayload,
  NotificationPayload,
} from "@shared/ws-events";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type EventHandler<T = unknown> = (payload: T) => void;

interface UseRealtimeOptions {
  url: string;
  token: string | null;
  enabled?: boolean;
}

const MAX_RECONNECT_DELAY = 30_000;
const HEARTBEAT_INTERVAL = 25_000;

export function useRealtime({ url, token, enabled = true }: UseRealtimeOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const handlersRef = useRef(new Map<WSEventType, Set<EventHandler>>());
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const on = useCallback(<T = unknown>(event: WSEventType, handler: EventHandler<T>) => {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set());
    handlersRef.current.get(event)!.add(handler as EventHandler);
    return () => {
      handlersRef.current.get(event)?.delete(handler as EventHandler);
    };
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    clearInterval(heartbeatTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const connect = useCallback(() => {
    if (!token || !enabledRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    disconnect();
    setStatus("connecting");

    const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setStatus("connected");

      heartbeatTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat", payload: {}, timestamp: Date.now() }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(typeof event.data === "string" ? event.data : "");
        const handlers = handlersRef.current.get(msg.type);
        if (handlers) {
          for (const handler of handlers) handler(msg.payload);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = (event) => {
      clearInterval(heartbeatTimer.current);
      wsRef.current = null;

      if (event.code === 4003 || event.code === 4001) {
        setStatus("error");
        return;
      }

      if (enabledRef.current && token) {
        setStatus("disconnected");
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, MAX_RECONNECT_DELAY);
        reconnectAttempt.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };
  }, [url, token, disconnect]);

  useEffect(() => {
    if (enabled && token) {
      connect();
    } else {
      disconnect();
    }
    return disconnect;
  }, [enabled, token, connect, disconnect]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && enabled && token && wsRef.current?.readyState !== WebSocket.OPEN) {
        reconnectAttempt.current = 0;
        connect();
      }
    });
    return () => sub.remove();
  }, [enabled, token, connect]);

  return { status, on, disconnect, reconnect: connect };
}

export type {
  BalanceUpdatePayload,
  TransactionPayload,
  TransferStatusPayload,
  NotificationPayload,
};
