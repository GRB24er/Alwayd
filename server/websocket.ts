import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { IncomingMessage } from "http";
import { jwtVerify } from "jose";
import {
  createWSMessage,
  type WSEventType,
  type WSMessage,
  type BalanceUpdatePayload,
  type TransactionPayload,
  type TransferStatusPayload,
  type NotificationPayload,
} from "@shared/ws-events";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive: boolean;
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
const HEARTBEAT_INTERVAL = 30_000;
const AUTH_TIMEOUT = 10_000;

let wss: WebSocketServer | null = null;
const clients = new Map<string, Set<AuthenticatedSocket>>();

export function initWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: AuthenticatedSocket, req: IncomingMessage) => {
    ws.isAlive = true;

    const token = new URL(req.url || "/", "http://localhost").searchParams.get("token");
    if (token) {
      authenticateSocket(ws, token);
    } else {
      ws.send(JSON.stringify(createWSMessage("auth:required", {})));
      const timeout = setTimeout(() => {
        if (!ws.userId) ws.close(4001, "Authentication timeout");
      }, AUTH_TIMEOUT);
      ws.once("close", () => clearTimeout(timeout));
    }

    ws.on("message", (data) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());
        if (msg.type === "heartbeat") {
          ws.isAlive = true;
          ws.send(JSON.stringify(createWSMessage("heartbeat", { serverTime: Date.now() })));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("close", () => {
      if (ws.userId) {
        const userSockets = clients.get(ws.userId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) clients.delete(ws.userId);
        }
      }
    });
  });

  const heartbeat = setInterval(() => {
    if (!wss) return;
    for (const ws of wss.clients as Set<AuthenticatedSocket>) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => clearInterval(heartbeat));

  console.log("[ws] WebSocket server initialized on /ws");
}

async function authenticateSocket(ws: AuthenticatedSocket, token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = (payload.openId as string) || (payload.sub as string);
    if (!userId) {
      ws.send(JSON.stringify(createWSMessage("auth:failed", { reason: "Invalid token" })));
      ws.close(4003, "Invalid token");
      return;
    }

    ws.userId = userId;
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId)!.add(ws);

    ws.send(JSON.stringify(createWSMessage("auth:ok", { userId })));
    console.log(`[ws] Client authenticated: ${userId} (${clients.get(userId)!.size} connections)`);
  } catch {
    ws.send(JSON.stringify(createWSMessage("auth:failed", { reason: "Token verification failed" })));
    ws.close(4003, "Authentication failed");
  }
}

function sendToUser(userId: string, message: WSMessage) {
  const userSockets = clients.get(userId);
  if (!userSockets) return;
  const data = JSON.stringify(message);
  for (const ws of userSockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function broadcast(message: WSMessage) {
  if (!wss) return;
  const data = JSON.stringify(message);
  for (const ws of wss.clients as Set<AuthenticatedSocket>) {
    if (ws.readyState === WebSocket.OPEN && ws.userId) ws.send(data);
  }
}

export function pushBalanceUpdate(userId: string, balances: BalanceUpdatePayload) {
  sendToUser(userId, createWSMessage("balance:update", balances));
}

export function pushNewTransaction(userId: string, transaction: TransactionPayload) {
  sendToUser(userId, createWSMessage("transaction:new", transaction));
}

export function pushTransactionUpdate(userId: string, transaction: TransactionPayload) {
  sendToUser(userId, createWSMessage("transaction:update", transaction));
}

export function pushTransferStatus(userId: string, status: TransferStatusPayload) {
  sendToUser(userId, createWSMessage("transfer:status", status));
}

export function pushNotification(userId: string, notification: NotificationPayload) {
  sendToUser(userId, createWSMessage("notification", notification));
}

export function broadcastNotification(notification: NotificationPayload) {
  broadcast(createWSMessage("notification", notification));
}

export function getConnectedCount(): number {
  return wss ? wss.clients.size : 0;
}

export function getUserConnectionCount(userId: string): number {
  return clients.get(userId)?.size || 0;
}
