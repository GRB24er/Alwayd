import type { Express, Request, Response } from "express";
import {
  pushBalanceUpdate,
  pushNewTransaction,
  pushTransferStatus,
  pushNotification,
  getConnectedCount,
  getUserConnectionCount,
} from "./websocket";

export function registerWSRoutes(app: Express) {
  app.get("/api/ws/status", (_req: Request, res: Response) => {
    res.json({ connectedClients: getConnectedCount() });
  });

  app.post("/api/ws/push/balance", (req: Request, res: Response) => {
    const { userId, balances } = req.body;
    if (!userId || !balances) {
      res.status(400).json({ error: "userId and balances required" });
      return;
    }
    pushBalanceUpdate(userId, balances);
    res.json({ sent: true, connections: getUserConnectionCount(userId) });
  });

  app.post("/api/ws/push/transaction", (req: Request, res: Response) => {
    const { userId, transaction } = req.body;
    if (!userId || !transaction) {
      res.status(400).json({ error: "userId and transaction required" });
      return;
    }
    pushNewTransaction(userId, transaction);
    res.json({ sent: true, connections: getUserConnectionCount(userId) });
  });

  app.post("/api/ws/push/transfer-status", (req: Request, res: Response) => {
    const { userId, status } = req.body;
    if (!userId || !status) {
      res.status(400).json({ error: "userId and status required" });
      return;
    }
    pushTransferStatus(userId, status);
    res.json({ sent: true, connections: getUserConnectionCount(userId) });
  });

  app.post("/api/ws/push/notification", (req: Request, res: Response) => {
    const { userId, notification } = req.body;
    if (!userId || !notification) {
      res.status(400).json({ error: "userId and notification required" });
      return;
    }
    pushNotification(userId, notification);
    res.json({ sent: true, connections: getUserConnectionCount(userId) });
  });
}
