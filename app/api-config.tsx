/**
 * API Configuration Screen
 * 
 * Allows users/admins to configure the connection to the Alwayd web application.
 * This sets the base URL for all banking API calls.
 */

import { useState, useEffect } from "react";
import { Text, View, TextInput, Pressable, Alert, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as BankingAPI from "@/lib/banking-api";

export default function ApiConfigScreen() {
  const router = useRouter();
  const colors = useColors();
  const [url, setUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    loadCurrentUrl();
  }, []);

  async function loadCurrentUrl() {
    const current = await BankingAPI.getBaseUrl();
    if (current) setUrl(current);
  }

  async function testConnection() {
    if (!url.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      const cleanUrl = url.trim().replace(/\/$/, "");
      const response = await fetch(`${cleanUrl}/api/auth/mobile`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok || response.status === 401) {
        // 401 is expected without a token — means the endpoint exists
        setTestResult("success");
        setTestMessage("Connection successful. API endpoint is reachable.");
      } else {
        setTestResult("error");
        setTestMessage(`Server responded with status ${response.status}`);
      }
    } catch (error: any) {
      setTestResult("error");
      setTestMessage(error.message || "Could not connect to the server");
    } finally {
      setIsTesting(false);
    }
  }

  async function saveUrl() {
    if (!url.trim()) return;
    const cleanUrl = url.trim().replace(/\/$/, "");
    BankingAPI.setBaseUrl(cleanUrl);

    if (Platform.OS === "web") {
      alert("API URL saved successfully");
    } else {
      Alert.alert("Saved", "API URL has been configured successfully.", [{ text: "OK" }]);
    }
    router.back();
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} className="px-5">
      {/* Header */}
      <View className="flex-row items-center py-4">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground ml-4">API Configuration</Text>
      </View>

      {/* Info */}
      <View style={{ backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 10, padding: 14, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <MaterialIcons name="info" size={18} color="#2563EB" />
          <Text style={{ color: "#1D4ED8", fontSize: 13, fontWeight: "600" }}>Web App Connection</Text>
        </View>
        <Text style={{ color: "#1E40AF", fontSize: 12, lineHeight: 18 }}>
          Enter the URL of your Aldwych European Capital web application. This connects the mobile app to your banking backend for real-time data sync.
        </Text>
      </View>

      {/* URL Input */}
      <View className="mb-4">
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Web Application URL
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14 }}>
          <MaterialIcons name="language" size={18} color={colors.muted} />
          <TextInput
            value={url}
            onChangeText={(text) => { setUrl(text); setTestResult(null); }}
            placeholder="https://your-app-domain.com"
            placeholderTextColor={colors.muted}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, color: colors.foreground }}
          />
        </View>
      </View>

      {/* Test Result */}
      {testResult && (
        <View style={{
          backgroundColor: testResult === "success" ? "#F0FDF4" : "#FEF2F2",
          borderWidth: 1,
          borderColor: testResult === "success" ? "#BBF7D0" : "#FECACA",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}>
          <MaterialIcons
            name={testResult === "success" ? "check-circle" : "error"}
            size={18}
            color={testResult === "success" ? "#16A34A" : "#DC2626"}
          />
          <Text style={{ color: testResult === "success" ? "#166534" : "#991B1B", fontSize: 12, flex: 1 }}>
            {testMessage}
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View className="gap-3 mt-2">
        <Pressable
          onPress={testConnection}
          disabled={isTesting || !url.trim()}
          style={({ pressed }) => [{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: (isTesting || !url.trim()) ? 0.5 : pressed ? 0.8 : 1,
          }]}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <MaterialIcons name="wifi" size={18} color={colors.foreground} />
          )}
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>
            {isTesting ? "Testing..." : "Test Connection"}
          </Text>
        </Pressable>

        <Pressable
          onPress={saveUrl}
          disabled={!url.trim()}
          style={({ pressed }) => [{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 10,
            backgroundColor: url.trim() ? "#0D2440" : "rgba(13, 36, 64, 0.3)",
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          }]}
        >
          <MaterialIcons name="save" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Save Configuration</Text>
        </Pressable>
      </View>

      {/* Help Text */}
      <View className="mt-8">
        <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16 }}>
          The URL should point to your deployed Alwayd web application. Example: https://aldwych-capital.vercel.app
        </Text>
        <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: 8 }}>
          The mobile app uses the following endpoints:{"\n"}
          • POST /api/auth/mobile — Authentication{"\n"}
          • GET /api/mobile/dashboard — Account data{"\n"}
          • GET /api/mobile/transactions — Transaction history{"\n"}
          • POST /api/mobile/transfers — Transfers
        </Text>
      </View>
    </ScreenContainer>
  );
}
