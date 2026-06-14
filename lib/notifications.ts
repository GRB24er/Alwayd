/**
 * Aldwych European Capital — Push Notifications Service
 * 
 * Handles local and push notification registration, scheduling,
 * and handling for banking alerts.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Configuration ───────────────────────────────────────────────────────────

const PUSH_TOKEN_KEY = "aldwych_push_token";
const NOTIFICATION_PREFS_KEY = "aldwych_notification_prefs";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  transactions: boolean;
  transfers: boolean;
  security: boolean;
  marketing: boolean;
  billReminders: boolean;
  lowBalance: boolean;
  largeTransactions: boolean;
  largeTransactionThreshold: number;
}

export type NotificationCategory =
  | "transaction"
  | "transfer"
  | "security"
  | "bill"
  | "balance"
  | "general";

const DEFAULT_PREFS: NotificationPreferences = {
  transactions: true,
  transfers: true,
  security: true,
  marketing: false,
  billReminders: true,
  lowBalance: true,
  largeTransactions: true,
  largeTransactionThreshold: 1000,
};

// ─── Registration ────────────────────────────────────────────────────────────

/**
 * Register for push notifications and return the Expo push token.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  // Must be a physical device
  if (!Device.isDevice) {
    console.log("[Notifications] Must use physical device for push notifications");
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("transactions", {
      name: "Transactions",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C9A84C",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("security", {
      name: "Security Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#EF4444",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("general", {
      name: "General",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted");
    return null;
  }

  // Get push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Store token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    console.log("[Notifications] Push token:", token);
    return token;
  } catch (error) {
    console.error("[Notifications] Failed to get push token:", error);
    return null;
  }
}

/**
 * Get the stored push token.
 */
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

// ─── Local Notifications ─────────────────────────────────────────────────────

/**
 * Schedule a local notification for a transaction.
 */
export async function notifyTransaction(params: {
  title: string;
  body: string;
  amount?: number;
  reference?: string;
  type?: string;
}): Promise<void> {
  const prefs = await getPreferences();
  if (!prefs.transactions) return;

  // Check large transaction threshold
  if (params.amount && prefs.largeTransactions) {
    if (Math.abs(params.amount) >= prefs.largeTransactionThreshold) {
      params.title = `⚠️ Large Transaction: ${params.title}`;
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: {
        type: "transaction",
        reference: params.reference,
        transactionType: params.type,
      },
      ...(Platform.OS === "android" && { channelId: "transactions" }),
    },
    trigger: null, // Immediate
  });
}

/**
 * Schedule a local notification for a transfer status update.
 */
export async function notifyTransfer(params: {
  title: string;
  body: string;
  reference?: string;
  status?: string;
}): Promise<void> {
  const prefs = await getPreferences();
  if (!prefs.transfers) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: {
        type: "transfer",
        reference: params.reference,
        status: params.status,
      },
      ...(Platform.OS === "android" && { channelId: "transactions" }),
    },
    trigger: null,
  });
}

/**
 * Schedule a security alert notification.
 */
export async function notifySecurity(params: {
  title: string;
  body: string;
  severity?: "info" | "warning" | "critical";
}): Promise<void> {
  const prefs = await getPreferences();
  if (!prefs.security) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔒 ${params.title}`,
      body: params.body,
      data: {
        type: "security",
        severity: params.severity || "info",
      },
      ...(Platform.OS === "android" && { channelId: "security" }),
    },
    trigger: null,
  });
}

/**
 * Schedule a bill reminder notification.
 */
export async function scheduleBillReminder(params: {
  billName: string;
  amount: number;
  dueDate: Date;
  reminderDaysBefore?: number;
}): Promise<string | null> {
  const prefs = await getPreferences();
  if (!prefs.billReminders) return null;

  const reminderDate = new Date(params.dueDate);
  reminderDate.setDate(reminderDate.getDate() - (params.reminderDaysBefore || 1));

  // Don't schedule if reminder date is in the past
  if (reminderDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Bill Payment Reminder",
      body: `${params.billName} — $${params.amount.toFixed(2)} due ${params.dueDate.toLocaleDateString()}`,
      data: {
        type: "bill",
        billName: params.billName,
        amount: params.amount,
      },
      ...(Platform.OS === "android" && { channelId: "general" }),
    },
    trigger: { type: "date" as any, date: reminderDate },
  });

  return id;
}

/**
 * Schedule a low balance alert.
 */
export async function notifyLowBalance(params: {
  accountType: string;
  balance: number;
  threshold?: number;
}): Promise<void> {
  const prefs = await getPreferences();
  if (!prefs.lowBalance) return;

  const threshold = params.threshold || 100;
  if (params.balance > threshold) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Low Balance Alert",
      body: `Your ${params.accountType} account balance is $${params.balance.toFixed(2)}`,
      data: {
        type: "balance",
        accountType: params.accountType,
        balance: params.balance,
      },
      ...(Platform.OS === "android" && { channelId: "transactions" }),
    },
    trigger: null,
  });
}

// ─── Notification Listeners ──────────────────────────────────────────────────

/**
 * Add a listener for when a notification is received while app is foregrounded.
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when user taps on a notification.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// ─── Preferences ─────────────────────────────────────────────────────────────

/**
 * Get notification preferences.
 */
export async function getPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
    return DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Update notification preferences.
 */
export async function setPreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
  const current = await getPreferences();
  const updated = { ...current, ...prefs };
  await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
}

// ─── Badge Management ────────────────────────────────────────────────────────

/**
 * Get the current badge count.
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count.
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications and reset badge.
 */
export async function clearAll(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

// ─── Scheduled Notifications Management ──────────────────────────────────────

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications.
 */
export async function getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
