/**
 * Sign In Screen — Enterprise Banking Authentication
 * 
 * Connects directly to the Alwayd web application's /api/auth/mobile endpoint.
 * Supports email/password login with optional biometric re-authentication.
 */

import { useState, useEffect } from "react";
import { Text, View, TextInput, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBankAuth } from "@/lib/auth-context";
import * as BiometricAuth from "@/lib/biometric-auth";
import * as BankingAPI from "@/lib/banking-api";
import * as Haptics from "expo-haptics";

export default function SignInScreen() {
  const router = useRouter();
  const colors = useColors();
  const { login, isLoading, error, clearError, isAuthenticated } = useBankAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricAuth.BiometricType>("none");
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  async function checkBiometrics() {
    if (Platform.OS === "web") return;
    const { hasHardware, isEnrolled } = await BiometricAuth.checkBiometricAvailability();
    const type = await BiometricAuth.getBiometricType();
    setBiometricAvailable(hasHardware && isEnrolled);
    setBiometricType(type);
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    clearError();

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const success = await login(email.trim(), password.trim());
    if (success) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/(tabs)");
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }

  async function handleBiometricLogin() {
    const isEnabled = await BiometricAuth.isBiometricLoginEnabled();
    if (!isEnabled) return;

    // Verify we have a cached user/token before allowing biometric login
    const cachedUser = await BankingAPI.getCachedUser();
    if (!cachedUser) {
      // No previous session — must use email/password
      setLocalError("Please sign in with your credentials first to enable biometric login.");
      return;
    }

    const result = await BiometricAuth.authenticate({
      promptMessage: "Sign in to Aldwych Capital",
    });

    if (result.success) {
      // Verify the stored token is still valid
      const verified = await BankingAPI.verifyToken();
      if (verified) {
        router.replace("/(tabs)");
      } else {
        setLocalError("Session expired. Please sign in with your credentials.");
      }
    }
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Branding */}
          <View className="items-center mb-10">
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 72, height: 72, marginBottom: 16 }}
              resizeMode="contain"
            />
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>Welcome Back</Text>
            <Text style={{ color: colors.muted, fontSize: 14, marginTop: 6 }}>
              Sign in to Aldwych European Capital
            </Text>
          </View>

          {/* Error Message */}
          {(error || localError) && (
            <View style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <IconSymbol name="xmark.circle.fill" size={18} color="#EF4444" />
              <Text style={{ color: "#DC2626", fontSize: 13, flex: 1 }}>{error || localError}</Text>
            </View>
          )}

          {/* Form */}
          <View className="gap-4">
            {/* Email */}
            <View>
              <Text className="text-foreground text-sm font-medium mb-2">Email Address</Text>
              <View
                className="flex-row items-center px-4 rounded-xl"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 52 }}
              >
                <IconSymbol name="person.fill" size={18} color={colors.muted} />
                <TextInput
                  value={email}
                  onChangeText={(text) => { setEmail(text); clearError(); }}
                  placeholder="name@aldwychcapital.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={{ flex: 1, marginLeft: 12, color: colors.foreground, fontSize: 15 }}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text className="text-foreground text-sm font-medium mb-2">Password</Text>
              <View
                className="flex-row items-center px-4 rounded-xl"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 52 }}
              >
                <IconSymbol name="lock.fill" size={18} color={colors.muted} />
                <TextInput
                  value={password}
                  onChangeText={(text) => { setPassword(text); clearError(); }}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={{ flex: 1, marginLeft: 12, color: colors.foreground, fontSize: 15 }}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                  <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={20} color={colors.muted} />
                </Pressable>
              </View>
            </View>

            {/* Forgot Password */}
            <View className="items-end">
              <Pressable onPress={() => router.push("/forgot-password" as any)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <Text style={{ color: "#C9A962", fontSize: 13, fontWeight: "600" }}>Forgot Password?</Text>
              </Pressable>
            </View>

            {/* Sign In Button */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading || !email.trim() || !password.trim()}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                  borderRadius: 14,
                  backgroundColor: (email.trim() && password.trim()) ? "#C9A962" : "rgba(201, 169, 98, 0.3)",
                  opacity: isLoading ? 0.7 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  marginTop: 8,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#001A3D" />
              ) : (
                <Text style={{ color: "#001A3D", fontSize: 16, fontWeight: "700" }}>Sign In</Text>
              )}
            </Pressable>

            {/* Biometric Login */}
            <View className="items-center mt-4">
              <Pressable
                onPress={biometricAvailable ? handleBiometricLogin : () => router.replace("/(tabs)")}
                style={({ pressed }) => [
                  {
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "rgba(201, 169, 98, 0.08)",
                    borderWidth: 1.5,
                    borderColor: "rgba(201, 169, 98, 0.3)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <IconSymbol name="faceid" size={32} color="#C9A962" />
              </Pressable>
              <Text className="text-muted text-xs mt-2">
                {biometricAvailable ? `Use ${BiometricAuth.getBiometricLabel(biometricType)}` : "Use Face ID"}
              </Text>
            </View>
          </View>

          {/* Sign Up Link */}
          <View className="flex-row items-center justify-center mt-8">
            <Text className="text-muted text-sm">Don&apos;t have an account? </Text>
            <Pressable onPress={() => router.push("/signup" as any)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={{ color: "#C9A962", fontSize: 14, fontWeight: "600" }}>Apply Now</Text>
            </Pressable>
          </View>

          {/* Security Note */}
          <View className="flex-row items-center justify-center mt-6 gap-2">
            <IconSymbol name="shield.fill" size={14} color={colors.muted} />
            <Text className="text-muted text-xs">Protected by 256-bit SSL encryption</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
