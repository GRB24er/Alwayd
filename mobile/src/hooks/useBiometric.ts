import { useState, useEffect, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | "iris" | null>(null);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = compatible && await LocalAuthentication.isEnrolledAsync();
      setIsAvailable(enrolled);

      if (enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType("face");
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType("fingerprint");
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType("iris");
        }
      }

      const stored = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(stored === "true");
    })();
  }, []);

  const enable = useCallback(async () => {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    setIsEnabled(true);
  }, []);

  const disable = useCallback(async () => {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "false");
    setIsEnabled(false);
  }, []);

  const authenticate = useCallback(async (promptMessage = "Authenticate to access your account") => {
    if (!isAvailable) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Use Password",
      disableDeviceFallback: false,
    });
    return result.success;
  }, [isAvailable]);

  return { isAvailable, isEnabled, biometricType, authenticate, enable, disable };
}
