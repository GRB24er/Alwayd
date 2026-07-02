import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { useBiometric } from "../../hooks/useBiometric";
import { maskAccountNumber } from "../../utils/format";
import { APP_NAME, APP_ESTABLISHED, SUPPORT_EMAIL } from "../../constants/config";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { isAvailable, isEnabled, biometricType, enable, disable } = useBiometric();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "U").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || "Account Holder"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.accountInfo}>
            <View style={styles.infoPill}>
              <Ionicons name="card-outline" size={12} color={Colors.gold} />
              <Text style={styles.pillText}>{maskAccountNumber(user?.accountNumber)}</Text>
            </View>
            <View style={styles.infoPill}>
              <Ionicons name="git-branch-outline" size={12} color={Colors.gold} />
              <Text style={styles.pillText}>{user?.routingNumber || "••••••"}</Text>
            </View>
          </View>
        </View>

        {/* Account section */}
        <MenuSection title="Account">
          <MenuItem icon="person-outline" label="Personal Information" />
          <MenuItem icon="document-text-outline" label="Statements & Documents" />
          <MenuItem icon="bar-chart-outline" label="Reports & Analytics" />
          <MenuItem icon="cash-outline" label="Transaction Limits" />
        </MenuSection>

        {/* Security */}
        <MenuSection title="Security">
          {isAvailable && (
            <View style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons
                  name={biometricType === "face" ? "scan-outline" : "finger-print"}
                  size={18}
                  color={Colors.gold}
                />
              </View>
              <Text style={styles.menuLabel}>
                {biometricType === "face" ? "Face ID" : "Biometric Login"}
              </Text>
              <Switch
                value={isEnabled}
                onValueChange={(v) => (v ? enable() : disable())}
                trackColor={{ false: Colors.border, true: Colors.gold }}
                thumbColor={Colors.white}
              />
            </View>
          )}
          <MenuItem icon="lock-closed-outline" label="Change Password" />
          <MenuItem icon="phone-portrait-outline" label="Two-Factor Authentication" />
          <MenuItem icon="shield-checkmark-outline" label="Login Activity" />
        </MenuSection>

        {/* Preferences */}
        <MenuSection title="Preferences">
          <MenuItem icon="notifications-outline" label="Notifications" />
          <MenuItem icon="moon-outline" label="Appearance" value="Dark" />
          <MenuItem icon="language-outline" label="Language" value="English" />
          <MenuItem icon="globe-outline" label="Currency" value="USD" />
        </MenuSection>

        {/* Support */}
        <MenuSection title="Support">
          <MenuItem icon="chatbubble-ellipses-outline" label="Live Chat" />
          <MenuItem icon="call-outline" label="Contact Support" />
          <MenuItem icon="help-circle-outline" label="FAQs" />
          <MenuItem icon="information-circle-outline" label="About" value="v1.0.0" />
        </MenuSection>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>{APP_NAME}</Text>
          <Text style={styles.footerEst}>{APP_ESTABLISHED}</Text>
          <Text style={styles.footerReg}>FCA & PRA Regulated Institution</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color={Colors.gold} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.display,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  content: {
    paddingBottom: Spacing.section * 2,
  },
  userCard: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.gold,
    marginBottom: Spacing.md,
    ...Shadow.gold,
  },
  avatarText: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  userName: {
    fontSize: FontSize.heading,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xxs,
  },
  userEmail: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  accountInfo: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.goldMuted,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.2)",
  },
  pillText: {
    fontSize: FontSize.caption,
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.label,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  menuValue: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    marginRight: Spacing.xs,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSize.subtitle,
    color: Colors.error,
    fontWeight: FontWeight.semibold,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.xxxl,
    gap: Spacing.xxs,
  },
  footerBrand: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
  },
  footerEst: {
    fontSize: FontSize.caption,
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1,
  },
  footerReg: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
