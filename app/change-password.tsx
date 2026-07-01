/**
 * Change Password — authenticated password update.
 * Verifies the current password server-side, enforces strength rules,
 * and confirms before applying.
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
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { changePassword, ApiError, AuthError } from "@/lib/banking-api";
import * as Haptics from "expo-haptics";

const GOLD = "#C9A962";
const NAVY = "#0D2440";

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /\d/.test(pw) },
];

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "#E5E7EB" };
  let score = RULES.filter((r) => r.test(pw)).length;
  if (pw.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 2) return { score, label: "Weak", color: "#EF4444" };
  if (score <= 4) return { score, label: "Good", color: "#F59E0B" };
  return { score, label: "Strong", color: "#10B981" };
}

export default function ChangePasswordScreen() {
  const colors = useColors();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = passwordStrength(newPassword);
  const rulesPass = RULES.every((r) => r.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && rulesPass && matches && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setDone(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      if (e instanceof AuthError) {
        setError("Your session has expired. Please sign in again.");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Unable to change your password right now. Please try again.");
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
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
            Password Changed
          </Text>
          <Text
            className="text-muted text-sm mt-2"
            style={{ textAlign: "center", lineHeight: 20 }}
          >
            Your password has been updated successfully. Use your new password
            the next time you sign in.
          </Text>
          <Pressable
            onPress={() => router.back()}
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
              Done
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
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
              onPress={() => router.back()}
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
                Change Password
              </Text>
              <Text className="text-muted text-sm mt-0.5">
                Keep your account secure
              </Text>
            </View>
          </View>

          <View className="px-5 mt-4" style={{ gap: 18 }}>
            {/* Info banner */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(13, 36, 64, 0.05)",
                borderRadius: 12,
                padding: 14,
                gap: 10,
              }}
            >
              <MaterialIcons name="shield" size={20} color={NAVY} />
              <Text
                style={{ flex: 1, fontSize: 12, color: colors.muted, lineHeight: 17 }}
              >
                For your security, you&apos;ll need to enter your current password.
                Changing your password signs you out of other devices.
              </Text>
            </View>

            {/* Current password */}
            <View>
              <Text className="text-foreground text-sm font-medium mb-2">
                Current Password
              </Text>
              <View style={inputWrap}>
                <TextInput
                  value={currentPassword}
                  onChangeText={(t) => {
                    setCurrentPassword(t);
                    setError(null);
                  }}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                />
                <Pressable
                  onPress={() => setShowCurrent(!showCurrent)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <IconSymbol
                    name={showCurrent ? "eye.slash.fill" : "eye.fill"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>

            {/* New password */}
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
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                />
                <Pressable
                  onPress={() => setShowNew(!showNew)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <IconSymbol
                    name={showNew ? "eye.slash.fill" : "eye.fill"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>

              {/* Strength meter */}
              {newPassword.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 4,
                      height: 4,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          borderRadius: 2,
                          backgroundColor:
                            strength.score > i * 2 ? strength.color : colors.border,
                        }}
                      />
                    ))}
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: strength.color,
                      marginTop: 5,
                    }}
                  >
                    {strength.label}
                  </Text>
                </View>
              )}

              {/* Requirements checklist */}
              <View style={{ marginTop: 10, gap: 6 }}>
                {RULES.map((rule) => {
                  const ok = rule.test(newPassword);
                  return (
                    <View
                      key={rule.label}
                      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                    >
                      <MaterialIcons
                        name={ok ? "check-circle" : "radio-button-unchecked"}
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

            {/* Confirm password */}
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
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  onSubmitEditing={handleSubmit}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                />
                {matches && (
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                )}
              </View>
              {confirmPassword.length > 0 && !matches && (
                <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>
                  Passwords do not match
                </Text>
              )}
            </View>

            {/* Error */}
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
                <MaterialIcons name="error-outline" size={18} color="#EF4444" />
                <Text style={{ flex: 1, color: "#EF4444", fontSize: 13 }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                {
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: canSubmit ? GOLD : "rgba(201, 169, 98, 0.3)",
                  opacity: pressed ? 0.85 : 1,
                  marginTop: 4,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#001A3D" />
              ) : (
                <Text
                  style={{ color: "#001A3D", fontSize: 15, fontWeight: "700" }}
                >
                  Update Password
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
