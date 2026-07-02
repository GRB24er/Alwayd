import { ScrollView, Text, View, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

export default function SecurityScreen() {
  const colors = useColors();
  const router = useRouter();
  const [faceId, setFaceId] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const devices = [
    { name: "iPhone 15 Pro", location: "Toronto, ON", lastActive: "Now", current: true },
    { name: "MacBook Pro", location: "Toronto, ON", lastActive: "2 hours ago", current: false },
    { name: "iPad Air", location: "Toronto, ON", lastActive: "Yesterday", current: false },
  ];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View>
            <Text className="text-foreground text-2xl font-bold">Security</Text>
            <Text className="text-muted text-sm mt-0.5">Protect your account</Text>
          </View>
        </View>

        {/* Security Score */}
        <View className="mx-5 mt-4 rounded-2xl p-5 items-center" style={{ backgroundColor: "#001A3D" }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#22C55E", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "700" }}>95</Text>
          </View>
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginTop: 12 }}>Security Score</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}>Your account is well protected</Text>
        </View>

        {/* Authentication */}
        <View className="mx-5 mt-6">
          <Text className="text-muted text-xs font-semibold uppercase tracking-wider mb-3 ml-1">Authentication</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <View className="flex-row items-center px-4 py-3.5" style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(201, 169, 98, 0.08)", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="faceid" size={18} color="#C9A962" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground text-sm font-medium">Face ID / Fingerprint</Text>
                <Text className="text-muted text-xs">Quick biometric login</Text>
              </View>
              <Switch value={faceId} onValueChange={setFaceId} trackColor={{ false: colors.border, true: "#C9A962" }} thumbColor="#FFFFFF" />
            </View>
            <View className="flex-row items-center px-4 py-3.5" style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(201, 169, 98, 0.08)", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="shield.fill" size={18} color="#C9A962" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground text-sm font-medium">Two-Factor Authentication</Text>
                <Text className="text-muted text-xs">SMS or authenticator app</Text>
              </View>
              <Switch value={twoFactor} onValueChange={setTwoFactor} trackColor={{ false: colors.border, true: "#C9A962" }} thumbColor="#FFFFFF" />
            </View>
            <View className="flex-row items-center px-4 py-3.5">
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(201, 169, 98, 0.08)", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="bell.fill" size={18} color="#C9A962" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground text-sm font-medium">Login Alerts</Text>
                <Text className="text-muted text-xs">Notify on new device login</Text>
              </View>
              <Switch value={loginAlerts} onValueChange={setLoginAlerts} trackColor={{ false: colors.border, true: "#C9A962" }} thumbColor="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Password */}
        <View className="mx-5 mt-6">
          <Text className="text-muted text-xs font-semibold uppercase tracking-wider mb-3 ml-1">Password</Text>
          <Pressable
            onPress={() => router.push("/change-password" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(201, 169, 98, 0.08)", alignItems: "center", justifyContent: "center" }}>
              <IconSymbol name="lock.fill" size={18} color="#C9A962" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-foreground text-sm font-medium">Change Password</Text>
              <Text className="text-muted text-xs">Update your account password</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {/* Active Devices */}
        <View className="mx-5 mt-6">
          <Text className="text-muted text-xs font-semibold uppercase tracking-wider mb-3 ml-1">Active Devices</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {devices.map((device, idx) => (
              <View
                key={idx}
                className="flex-row items-center px-4 py-3.5"
                style={idx < devices.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : {}}
              >
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-foreground text-sm font-medium">{device.name}</Text>
                    {device.current && (
                      <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
                        <Text style={{ color: colors.success, fontSize: 9, fontWeight: "600" }}>CURRENT</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-muted text-xs mt-0.5">{device.location} · {device.lastActive}</Text>
                </View>
                {!device.current && (
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                    <Text style={{ color: colors.error, fontSize: 12, fontWeight: "600" }}>Remove</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
