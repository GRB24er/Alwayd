import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform, Alert } from "react-native";
import { useRealtime, type ConnectionStatus, type BalanceUpdatePayload, type TransactionPayload, type TransferStatusPayload } from "@/hooks/use-realtime";
import { useBankAuth } from "./auth-context";
import * as BankingAPI from "./banking-api";

interface RealtimeContextType {
  status: ConnectionStatus;
  latestBalances: BalanceUpdatePayload | null;
  latestTransaction: TransactionPayload | null;
  latestTransferStatus: TransferStatusPayload | null;
  onBalanceUpdate: (handler: (b: BalanceUpdatePayload) => void) => () => void;
  onNewTransaction: (handler: (t: TransactionPayload) => void) => () => void;
  onTransferStatus: (handler: (s: TransferStatusPayload) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  status: "disconnected",
  latestBalances: null,
  latestTransaction: null,
  latestTransferStatus: null,
  onBalanceUpdate: () => () => {},
  onNewTransaction: () => () => {},
  onTransferStatus: () => () => {},
});

function getWSUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = process.env.PORT || "3000";
    return `${proto}//${host}:${port}/ws`;
  }
  const apiUrl = process.env.EXPO_PUBLIC_ALWAYD_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || "";
  if (apiUrl) {
    const parsed = apiUrl.replace(/^http/, "ws").replace(/\/$/, "");
    return `${parsed}/ws`;
  }
  return "ws://localhost:3000/ws";
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useBankAuth();
  const [token, setToken] = useState<string | null>(null);
  const [latestBalances, setLatestBalances] = useState<BalanceUpdatePayload | null>(null);
  const [latestTransaction, setLatestTransaction] = useState<TransactionPayload | null>(null);
  const [latestTransferStatus, setLatestTransferStatus] = useState<TransferStatusPayload | null>(null);
  const balanceHandlers = useRef(new Set<(b: BalanceUpdatePayload) => void>());
  const transactionHandlers = useRef(new Set<(t: TransactionPayload) => void>());
  const transferHandlers = useRef(new Set<(s: TransferStatusPayload) => void>());

  useEffect(() => {
    if (!isAuthenticated) {
      setToken(null);
      return;
    }
    (async () => {
      const t = await getStoredToken();
      setToken(t);
    })();
  }, [isAuthenticated]);

  const wsUrl = getWSUrl();
  const { status, on } = useRealtime({ url: wsUrl, token, enabled: isAuthenticated });

  useEffect(() => {
    const unsubs = [
      on<BalanceUpdatePayload>("balance:update", (payload) => {
        setLatestBalances(payload);
        for (const h of balanceHandlers.current) h(payload);
      }),
      on<TransactionPayload>("transaction:new", (payload) => {
        setLatestTransaction(payload);
        for (const h of transactionHandlers.current) h(payload);
      }),
      on<TransferStatusPayload>("transfer:status", (payload) => {
        setLatestTransferStatus(payload);
        for (const h of transferHandlers.current) h(payload);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on]);

  const onBalanceUpdate = useCallback((handler: (b: BalanceUpdatePayload) => void) => {
    balanceHandlers.current.add(handler);
    return () => { balanceHandlers.current.delete(handler); };
  }, []);

  const onNewTransaction = useCallback((handler: (t: TransactionPayload) => void) => {
    transactionHandlers.current.add(handler);
    return () => { transactionHandlers.current.delete(handler); };
  }, []);

  const onTransferStatus = useCallback((handler: (s: TransferStatusPayload) => void) => {
    transferHandlers.current.add(handler);
    return () => { transferHandlers.current.delete(handler); };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        status,
        latestBalances,
        latestTransaction,
        latestTransferStatus,
        onBalanceUpdate,
        onNewTransaction,
        onTransferStatus,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return window.localStorage.getItem("aldwych_auth_token");
    }
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync("aldwych_auth_token");
  } catch {
    return null;
  }
}
