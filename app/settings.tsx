/**
 * Settings Screen — App configuration with API connection, biometrics, notifications
 */

import { ScrollView, Text, View, Pressable, Switch, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect } from "react";
import * as BiometricAuth from "@/lib/biometric-auth";
import * as Notifications from "@/lib/notifications";
import { useBankAuth } from "@/lib/auth-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout } = useBankAuth();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [biometricLogin, setBiometricLogin] = useState(false);
  const [biometricTransactions, setBiometricTransactions] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [biometricType, setBiometricType] = useState<BiometricAuth.BiometricType>("none");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const status = await BiometricAuth.getBiometricStatus();
    setBiometricType(status.biometricType);
    setBiometricLogin(status.isLoginEnabled);
    setBiometricTransactions(status.isEnabled);

    const prefs = await Notifications.getPreferences();
    setPushNotifications(prefs.transactions);
    setTransactionAlerts(prefs.largeTransactions);
  }

  async function handleBiometricLoginToggle(value: boolean) {
    if (value) {
      // Verify biometric first
      const result = await BiometricAuth.authenticate({
        promptMessage: "Enable biometric login",
      });
      if (!result.success) return;
    }
    setBiometricLogin(value);
    await BiometricAuth.setBiometricLoginEnabled(value);
  }

  async function handleBiometricTransactionsToggle(value: boolean) {
    if (value) {
      const result = await BiometricAuth.authenticate({
        promptMessage: "Enable biometric for transactions",
      });
      if (!result.success) return;
    }
    setBiometricTransactions(value);
    await BiometricAuth.setBiometricEnabled(value);
  }

  async function handlePushToggle(value: boolean) {
    setPushNotifications(value);
    await Notifications.setPreferences({ transactions: value });
    if (value) {
      await Notifications.registerForPushNotifications();
    }
  }

  async function handleTransactionAlertsToggle(value: boolean) {
    setTransactionAlerts(value);
    await Notifications.setPreferences({ largeTransactions: value });
  }

  async function handleLogout() {
    if (Platform.OS === "web") {
      await logout();
      router.replace("/signin");
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/signin");
          },
        },
      ]);
    }
  }

  const biometricLabel = BiometricAuth.getBiometricLabel(biometricType);

  const settingSections = [
    {
      title: "Connection",
      items: [
        { type: "link" as const, label: "Web App Connection", subtitle: "Configure API endpoint", route: "/api-config", icon: "language" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { type: "toggle" as const, label: "Dark Mode", subtitle: "Use dark theme", value: darkMode, onToggle: setDarkMode },
        { type: "toggle" as const, label: "Push Notifications", subtitle: "Receive banking alerts", value: pushNotifications, onToggle: handlePushToggle },
        { type: "toggle" as const, label: "Transaction Alerts", subtitle: "Large transaction warnings", value: transactionAlerts, onToggle: handleTransactionAlertsToggle },
      ],
    },
    {
      title: "Security",
      items: [
        { type: "toggle" as const, label: `${biometricLabel} Login`, subtitle: `Sign in with ${biometricLabel}`, value: biometricLogin, onToggle: handleBiometricLoginToggle },
        { type: "toggle" as const, label: `${biometricLabel} for Transfers`, subtitle: "Require authentication for transfers", value: biometricTransactions, onToggle: handleBiometricTransactionsToggle },
        { type: "link" as const, label: "Change Password", subtitle: "Update your password", route: "/security", icon: "lock" },
        { type: "link" as const, label: "Two-Factor Auth", subtitle: "Manage 2FA settings", route: "/security", icon: "security" },
      ],
    },
    {
      title: "Documents",
      items: [
        { type: "link" as const, label: "Statements", subtitle: "Download account statements", route: "/statements", icon: "description" },
        { type: "link" as const, label: "Tax Documents", subtitle: "Annual tax forms", route: "/reports", icon: "receipt-long" },
      ],
    },
    {
      title: "General",
      items: [
        { type: "link" as const, label: "Language", subtitle: "English (US)", route: "/settings", icon: "translate" },
        { type: "link" as const, label: "Currency", subtitle: "USD ($)", route: "/settings", icon: "attach-money" },
        { type: "link" as const, label: "Privacy Policy", subtitle: "View our policies", route: "/settings", icon: "policy" },
        { type: "link" as const, label: "Terms of Service", subtitle: "Read terms", route: "/settings", icon: "gavel" },
      ],
    },
  ];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <Text className="text-foreground text-2xl font-bold">Settings</Text>
        </View>

        {settingSections.map((section, sIdx) => (
          <View key={sIdx} className="mx-5 mt-6">
            <Text className="text-muted text-xs font-semibold uppercase tracking-wider mb-3 ml-1">
              {section.title}
            </Text>
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={item.type === "link" ? () => router.push((item as any).route as any) : undefined}
                  disabled={item.type === "toggle"}
                  style={({ pressed }) => [{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: idx < section.items.length - 1 ? 0.5 : 0,
                    borderBottomColor: colors.border,
                    opacity: item.type === "link" && pressed ? 0.7 : 1,
                  }]}
                >
                  {(item as any).icon && (
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(201, 169, 98, 0.1)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <MaterialIcons name={(item as any).icon} size={16} color="#C9A962" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-foreground text-sm font-medium">{item.label}</Text>
                    <Text className="text-muted text-xs mt-0.5">{item.subtitle}</Text>
                  </View>
                  {item.type === "toggle" ? (
                    <Switch
                      value={(item as any).value}
                      onValueChange={(item as any).onToggle}
                      trackColor={{ false: colors.border, true: "#C9A962" }}
                      thumbColor="#FFFFFF"
                    />
                  ) : (
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <View className="mx-5 mt-8">
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.2)",
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <MaterialIcons name="logout" size={18} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "600" }}>Sign Out</Text>
          </Pressable>
        </View>

        {/* App Info */}
        <View className="items-center mt-8">
          <Text className="text-muted text-xs">Aldwych Capital v1.0.0</Text>
          <Text className="text-muted text-xs mt-1">Build 2026.06.14</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
