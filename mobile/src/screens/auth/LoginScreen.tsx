import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Animated, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../../constants/theme";
import { APP_NAME, APP_TAG, APP_ESTABLISHED } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { useBiometric } from "../../hooks/useBiometric";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
  const { login } = useAuth();
  const { isAvailable, isEnabled, biometricType, authenticate } = useBiometric();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const biometricIcon: keyof typeof Ionicons.glyphMap =
    biometricType === "face" ? "scan-outline" : "finger-print-outline";

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      shake();
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      setError(e?.message || "Invalid credentials");
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setError("");
    const success = await authenticate("Sign in to Aldwych European Capital");
    if (!success) {
      setError("Biometric authentication failed.");
      shake();
    }
  };

  return (
    <LinearGradient colors={[Colors.bg, "#0a1628", Colors.navyDark]} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoContainer}>
              <View style={styles.logoOuter}>
                <View style={styles.logoInner}>
                  <Text style={styles.logoText}>AEC</Text>
                </View>
              </View>
            </View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.appTag}>{APP_TAG}</Text>
            <View style={styles.estBadge}>
              <Text style={styles.estText}>{APP_ESTABLISHED}</Text>
            </View>
          </View>

          {/* Form */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Access your private banking account</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonFlex, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.gold, Colors.goldDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.navyDark} />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {isAvailable && isEnabled && (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometric}
                  activeOpacity={0.7}
                >
                  <Ionicons name={biometricIcon} size={24} color={Colors.gold} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot your password?</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.securityRow}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
              <Text style={styles.securityText}>256-bit TLS Encryption</Text>
            </View>
            <Text style={styles.footerText}>FCA & PRA Regulated</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.section,
    paddingTop: height * 0.08,
  },
  brand: {
    alignItems: "center",
    marginBottom: Spacing.xxxl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.gold,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  logoText: {
    fontSize: 20,
    fontWeight: FontWeight.heavy,
    color: Colors.gold,
    letterSpacing: 2,
  },
  appName: {
    fontSize: FontSize.heading,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  appTag: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  estBadge: {
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
  },
  estText: {
    fontSize: FontSize.caption,
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.lg,
  },
  cardTitle: {
    fontSize: FontSize.heading,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.error,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.label,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  eyeBtn: {
    padding: Spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  button: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    ...Shadow.gold,
  },
  buttonFlex: { flex: 1 },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.bold,
    color: Colors.navyDark,
    letterSpacing: 0.5,
  },
  biometricBtn: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCardElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  forgotBtn: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  forgotText: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  securityText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  footerText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
});
