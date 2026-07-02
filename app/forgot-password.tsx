/**
 * Forgot Password — self-service reset for signed-out users.
 * Step 1: enter account email → a 6-digit code is emailed.
 * Step 2: enter the code and choose a new password.
 */

import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  requestPasswordReset,
  resetPasswordWithCode,
  ApiError,
} from "@/lib/banking-api";
import * as Haptics from "expo-haptics";

const GOLD = "#C9A962";

const RULES = [
  { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw: string) => /\d/.test(pw) },
];

type Step = "email" | "reset" | "done";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const rulesPass = RULES.every((r) => r.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const codeValid = code.trim().length >= 6;

  async function handleRequestCode() {
    if (!emailValid || loading) return;
    setError(null);
    setLoading(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await requestPasswordReset(email);
      setInfo(
        "If an account exists for this email, a 6-digit verification code has been sent. It expires in 10 minutes."
      );
      setStep("reset");
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 404) {
        setError(
          "Password reset is not available right now. Please contact support at +44 (0)20 7946 0000 and we'll help you regain access."
        );
      } else if (e instanceof ApiError && e.status === 429) {
        setError("Too many requests. Please wait a few minutes and try again.");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError(
          e?.message?.includes("not configured")
            ? e.message
            : "Unable to reach the server. Check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!codeValid || !rulesPass || !matches || loading) return;
    setError(null);
    setLoading(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await resetPasswordWithCode({
        email,
        code,
        newPassword,
        confirmPassword,
      });
      setStep("done");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Unable to reset your password right now. Please try again.");
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputWrap = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  };
  const inputStyle = {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.foreground,
  };

  // ── Success ──
  if (step === "done") {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="check-circle" size={52} color="#10B981" />
          </View>
          <Text className="text-foreground text-xl font-bold mt-6">
            Password Reset
          </Text>
          <Text
            className="text-muted text-sm mt-2"
            style={{ textAlign: "center", lineHeight: 20 }}
          >
            Your password has been reset successfully. Sign in with your new
            password to continue.
          </Text>
          <Pressable
            onPress={() => router.replace("/signin" as any)}
            style={({ pressed }) => [
              {
                marginTop: 28,
                paddingVertical: 14,
                paddingHorizontal: 48,
                borderRadius: 12,
                backgroundColor: GOLD,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ color: "#001A3D", fontSize: 15, fontWeight: "700" }}>
              Back to Sign In
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-2 flex-row items-center">
            <Pressable
              onPress={() =>
                step === "reset" ? setStep("email") : router.back()
              }
              style={({ pressed }) => [
                { opacity: pressed ? 0.6 : 1, marginRight: 12 },
              ]}
            >
              <IconSymbol
                name="chevron.right"
                size={22}
                color={colors.foreground}
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            </Pressable>
            <View>
              <Text className="text-foreground text-2xl font-bold">
                Reset Password
              </Text>
              <Text className="text-muted text-sm mt-0.5">
                {step === "email"
                  ? "We'll email you a verification code"
                  : "Enter the code and a new password"}
              </Text>
            </View>
          </View>

          {/* Brand banner */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              backgroundColor: "#0D2440",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Image
              source={require("@/assets/images/logo-full.png")}
              style={{ width: 160, height: 36 }}
              resizeMode="contain"
            />
          </View>

          <View className="px-5 mt-6" style={{ gap: 18 }}>
            {step === "email" ? (
              <>
                {/* Step 1: email */}
                <View>
                  <Text className="text-foreground text-sm font-medium mb-2">
                    Account Email
                  </Text>
                  <View style={inputWrap}>
                    <MaterialIcons
                      name="mail-outline"
                      size={20}
                      color={colors.muted}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        setError(null);
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onSubmitEditing={handleRequestCode}
                      style={inputStyle}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.muted,
                      marginTop: 8,
                      lineHeight: 17,
                    }}
                  >
                    Enter the email address associated with your account. If it
                    matches an account, we&apos;ll send a 6-digit verification code.
                  </Text>
                </View>

                {error && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      borderRadius: 12,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={18}
                      color="#EF4444"
                    />
                    <Text style={{ flex: 1, color: "#EF4444", fontSize: 13 }}>
                      {error}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={handleRequestCode}
                  disabled={!emailValid || loading}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor:
                        emailValid && !loading
                          ? GOLD
                          : "rgba(201, 169, 98, 0.3)",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#001A3D" />
                  ) : (
                    <Text
                      style={{
                        color: "#001A3D",
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                    >
                      Send Verification Code
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                {/* Step 2: code + new password */}
                {info && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(16, 185, 129, 0.08)",
                      borderRadius: 12,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <MaterialIcons
                      name="mark-email-read"
                      size={18}
                      color="#10B981"
                    />
                    <Text style={{ flex: 1, color: "#059669", fontSize: 13 }}>
                      {info}
                    </Text>
                  </View>
                )}

                <View>
                  <Text className="text-foreground text-sm font-medium mb-2">
                    Verification Code
                  </Text>
                  <View style={inputWrap}>
                    <MaterialIcons
                      name="pin"
                      size={20}
                      color={colors.muted}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      value={code}
                      onChangeText={(t) => {
                        setCode(t.replace(/[^0-9]/g, "").slice(0, 6));
                        setError(null);
                      }}
                      placeholder="6-digit code"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[inputStyle, { letterSpacing: 6, fontWeight: "700" }]}
                    />
                  </View>
                  <Pressable
                    onPress={handleRequestCode}
                    disabled={loading}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text
                      style={{
                        color: GOLD,
                        fontSize: 12,
                        fontWeight: "600",
                        marginTop: 8,
                      }}
                    >
                      Didn&apos;t receive it? Resend code
                    </Text>
                  </Pressable>
                </View>

                <View>
                  <Text className="text-foreground text-sm font-medium mb-2">
                    New Password
                  </Text>
                  <View style={inputWrap}>
                    <TextInput
                      value={newPassword}
                      onChangeText={(t) => {
                        setNewPassword(t);
                        setError(null);
                      }}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      style={inputStyle}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    >
                      <IconSymbol
                        name={showPassword ? "eye.slash.fill" : "eye.fill"}
                        size={20}
                        color={colors.muted}
                      />
                    </Pressable>
                  </View>

                  <View style={{ marginTop: 10, gap: 6 }}>
                    {RULES.map((rule) => {
                      const ok = rule.test(newPassword);
                      return (
                        <View
                          key={rule.label}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <MaterialIcons
                            name={
                              ok ? "check-circle" : "radio-button-unchecked"
                            }
                            size={15}
                            color={ok ? "#10B981" : colors.muted}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: ok ? colors.foreground : colors.muted,
                            }}
                          >
                            {rule.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="text-foreground text-sm font-medium mb-2">
                    Confirm New Password
                  </Text>
                  <View
                    style={[
                      inputWrap,
                      confirmPassword.length > 0 && !matches
                        ? { borderColor: "#EF4444" }
                        : {},
                    ]}
                  >
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        setError(null);
                      }}
                      placeholder="Re-enter new password"
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onSubmitEditing={handleReset}
                      style={inputStyle}
                    />
                    {matches && (
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color="#10B981"
                      />
                    )}
                  </View>
                  {confirmPassword.length > 0 && !matches && (
                    <Text
                      style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}
                    >
                      Passwords do not match
                    </Text>
                  )}
                </View>

                {error && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      borderRadius: 12,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={18}
                      color="#EF4444"
                    />
                    <Text style={{ flex: 1, color: "#EF4444", fontSize: 13 }}>
                      {error}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={handleReset}
                  disabled={!codeValid || !rulesPass || !matches || loading}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor:
                        codeValid && rulesPass && matches && !loading
                          ? GOLD
                          : "rgba(201, 169, 98, 0.3)",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#001A3D" />
                  ) : (
                    <Text
                      style={{
                        color: "#001A3D",
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                    >
                      Reset Password
                    </Text>
                  )}
                </Pressable>
              </>
            )}

            {/* Support note */}
            <Text
              style={{
                fontSize: 11,
                color: colors.muted,
                textAlign: "center",
                lineHeight: 16,
                marginTop: 8,
              }}
            >
              Need help? Contact Aldwych European Capital support at{"\n"}
              +44 (0)20 7946 0000 · support@aldwycheuropeancapital.com
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
