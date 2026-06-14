import { ScrollView, Text, View, Pressable, Image, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBankAuth } from "@/lib/auth-context";
import * as Haptics from "expo-haptics";

const MENU_SECTIONS = [
  {
    title: "Banking",
    items: [
      { icon: "chart.line.uptrend.xyaxis" as const, title: "Investments", subtitle: "Portfolio & trading", route: "/investments" },
      { icon: "building.columns.fill" as const, title: "Loans", subtitle: "Applications & tracking", route: "/loans" },
      { icon: "doc.text.fill" as const, title: "Bills & Payments", subtitle: "Manage payments", route: "/bills" },
      { icon: "arrow.down.circle.fill" as const, title: "Deposits", subtitle: "Fund your accounts", route: "/deposit" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { icon: "doc.text.fill" as const, title: "Reports", subtitle: "Financial analytics", route: "/reports" },
      { icon: "doc.text.fill" as const, title: "Statements", subtitle: "Download statements", route: "/statements" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: "person.fill" as const, title: "Profile", subtitle: "Personal information", route: "/profile" },
      { icon: "gearshape.fill" as const, title: "Settings", subtitle: "App preferences", route: "/settings" },
      { icon: "shield.fill" as const, title: "Security", subtitle: "Password & biometrics", route: "/security" },
      { icon: "bell.fill" as const, title: "Notifications", subtitle: "Alert preferences", route: "/notifications" },
      { icon: "questionmark.circle.fill" as const, title: "Support", subtitle: "Help & contact", route: "/support" },
    ],
  },
];

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout, user } = useBankAuth();

  function handleSignOut() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of Aldwych Capital?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/signin");
          },
        },
      ]
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-foreground text-2xl font-bold">More</Text>
        </View>

        {/* Profile Card */}
        <Pressable
          onPress={() => router.push("/profile" as any)}
          style={({ pressed }) => [
            {
              marginHorizontal: 20,
              marginTop: 12,
              padding: 16,
              borderRadius: 20,
              backgroundColor: "#001A3D",
              flexDirection: "row",
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "rgba(201, 169, 98, 0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#C9A962", fontSize: 22, fontWeight: "700" }}>AC</Text>
          </View>
          <View className="flex-1 ml-4">
            <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "600" }}>Aldwych Client</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 2 }}>Premier Banking Member</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22C55E" }} />
              <Text style={{ color: "#22C55E", fontSize: 11 }}>Verified</Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#9CA3AF" />
        </Pressable>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, sIdx) => (
          <View key={sIdx} className="mx-5 mt-6">
            <Text className="text-muted text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
              {section.title}
            </Text>
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => router.push(item.route as any)}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      opacity: pressed ? 0.7 : 1,
                      borderBottomWidth: idx < section.items.length - 1 ? 0.5 : 0,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "rgba(201, 169, 98, 0.08)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name={item.icon} size={18} color="#C9A962" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-foreground text-sm font-medium">{item.title}</Text>
                    <Text className="text-muted text-xs">{item.subtitle}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <View className="mx-5 mt-6">
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.2)",
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={{ color: colors.error, fontSize: 15, fontWeight: "600" }}>Sign Out</Text>
          </Pressable>
        </View>

        {/* App Version */}
        <View className="items-center mt-6">
          <Text className="text-muted text-xs">Aldwych Capital v1.0.0</Text>
          <Text className="text-muted text-xs mt-1">Secured by 256-bit encryption</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
