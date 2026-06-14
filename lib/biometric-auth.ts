/**
 * Aldwych European Capital — Biometric Authentication Service
 * 
 * Provides Face ID / Touch ID / Fingerprint authentication
 * for securing sensitive banking operations.
 */

import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Configuration Keys ──────────────────────────────────────────────────────

const BIOMETRIC_ENABLED_KEY = "aldwych_biometric_enabled";
const BIOMETRIC_LOGIN_KEY = "aldwych_biometric_login_enabled";
const APP_LOCK_TIMEOUT_KEY = "aldwych_app_lock_timeout";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BiometricType = "face" | "fingerprint" | "iris" | "none";

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: BiometricType;
  isEnabled: boolean;
  isLoginEnabled: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Check if biometric hardware is available and enrolled.
 */
export async function checkBiometricAvailability(): Promise<{
  hasHardware: boolean;
  isEnrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
}> {
  if (Platform.OS === "web") {
    return { hasHardware: false, isEnrolled: false, types: [] };
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  return { hasHardware, isEnrolled, types };
}

/**
 * Get the type of biometric authentication available.
 */
export async function getBiometricType(): Promise<BiometricType> {
  if (Platform.OS === "web") return "none";

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "face";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "iris";
  }
  return "none";
}

/**
 * Get a human-readable label for the biometric type.
 */
export function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case "face":
      return Platform.OS === "ios" ? "Face ID" : "Face Unlock";
    case "fingerprint":
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    case "iris":
      return "Iris Scan";
    default:
      return "Biometrics";
  }
}

/**
 * Get the full biometric status including user preferences.
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  const { hasHardware, isEnrolled } = await checkBiometricAvailability();
  const biometricType = await getBiometricType();
  const isEnabled = await isBiometricEnabled();
  const isLoginEnabled = await isBiometricLoginEnabled();

  return {
    isAvailable: hasHardware,
    isEnrolled,
    biometricType,
    isEnabled,
    isLoginEnabled,
  };
}

// ─── Authentication ──────────────────────────────────────────────────────────

/**
 * Authenticate the user with biometrics.
 * Used for: app unlock, transfer confirmation, viewing sensitive data.
 */
export async function authenticate(options?: {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackToPasscode?: boolean;
}): Promise<AuthResult> {
  if (Platform.OS === "web") {
    return { success: true }; // Web doesn't support biometrics
  }

  const { hasHardware, isEnrolled } = await checkBiometricAvailability();

  if (!hasHardware) {
    return { success: false, error: "No biometric hardware available" };
  }

  if (!isEnrolled) {
    return { success: false, error: "No biometrics enrolled on this device" };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage || "Authenticate to continue",
      cancelLabel: options?.cancelLabel || "Cancel",
      disableDeviceFallback: !(options?.fallbackToPasscode ?? true),
      fallbackLabel: "Use Passcode",
    });

    if (result.success) {
      return { success: true };
    }

    if (result.error === "user_cancel") {
      return { success: false, cancelled: true };
    }

    return { success: false, error: result.warning || "Authentication failed" };
  } catch (error) {
    return { success: false, error: "Authentication error occurred" };
  }
}

/**
 * Authenticate before a sensitive banking operation.
 * Returns true if authenticated, false if cancelled or failed.
 */
export async function authenticateForTransaction(amount?: number): Promise<boolean> {
  const isEnabled = await isBiometricEnabled();
  if (!isEnabled) return true; // Biometrics not enabled, allow through

  const promptMessage = amount
    ? `Authenticate to confirm transfer of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)}`
    : "Authenticate to confirm this transaction";

  const result = await authenticate({
    promptMessage,
    fallbackToPasscode: true,
  });

  return result.success;
}

/**
 * Authenticate for app unlock (after background timeout).
 */
export async function authenticateForAppUnlock(): Promise<boolean> {
  const result = await authenticate({
    promptMessage: "Unlock Aldwych Capital",
    fallbackToPasscode: true,
  });
  return result.success;
}

/**
 * Authenticate for viewing sensitive information.
 */
export async function authenticateForSensitiveData(): Promise<boolean> {
  const isEnabled = await isBiometricEnabled();
  if (!isEnabled) return true;

  const result = await authenticate({
    promptMessage: "Authenticate to view sensitive information",
    fallbackToPasscode: true,
  });
  return result.success;
}

// ─── Preferences ─────────────────────────────────────────────────────────────

/**
 * Check if biometric authentication is enabled by the user.
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

/**
 * Enable or disable biometric authentication.
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false");
}

/**
 * Check if biometric login (instead of password) is enabled.
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_LOGIN_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

/**
 * Enable or disable biometric login.
 */
export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_LOGIN_KEY, enabled ? "true" : "false");
}

/**
 * Get the app lock timeout in milliseconds.
 */
export async function getAppLockTimeout(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(APP_LOCK_TIMEOUT_KEY);
    return value ? parseInt(value, 10) : 60000; // Default 1 minute
  } catch {
    return 60000;
  }
}

/**
 * Set the app lock timeout in milliseconds.
 */
export async function setAppLockTimeout(ms: number): Promise<void> {
  await AsyncStorage.setItem(APP_LOCK_TIMEOUT_KEY, String(ms));
}
