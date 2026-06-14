import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();

  const profileFields = [
    { label: "Full Name", value: "Aldwych Client" },
    { label: "Email", value: "client@aldwychcapital.com" },
    { label: "Phone", value: "+1 (416) 555-0123" },
    { label: "Date of Birth", value: "January 15, 1985" },
    { label: "Address", value: "100 King Street West, Toronto, ON" },
    { label: "Member Since", value: "March 2021" },
  ];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <Text className="text-foreground text-2xl font-bold">Profile</Text>
        </View>

        {/* Avatar Section */}
        <View className="items-center mt-6">
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "#001A3D",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: "#C9A962",
            }}
          >
            <Text style={{ color: "#C9A962", fontSize: 36, fontWeight: "700" }}>AC</Text>
          </View>
          <Text className="text-foreground text-xl font-bold mt-4">Aldwych Client</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(201, 169, 98, 0.1)" }}>
              <Text style={{ color: "#C9A962", fontSize: 12, fontWeight: "600" }}>Premier Member</Text>
            </View>
            <View className="flex-row items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.success }} />
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: "600" }}>KYC Verified</Text>
            </View>
          </View>
        </View>

        {/* Profile Info */}
        <View className="mx-5 mt-8">
          <Text className="text-muted text-xs font-semibold uppercase tracking-wider mb-3 ml-1">Personal Information</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {profileFields.map((field, idx) => (
              <View
                key={idx}
                className="px-4 py-3.5"
                style={idx < profileFields.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : {}}
              >
                <Text className="text-muted text-xs">{field.label}</Text>
                <Text className="text-foreground text-sm font-medium mt-1">{field.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Account Status */}
        <View className="mx-5 mt-6">
          <Text className="text-muted text-xs font-semibold uppercase tracking-wider mb-3 ml-1">Account Status</Text>
          <View className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-foreground text-sm font-medium">Account Tier</Text>
              <Text style={{ color: "#C9A962", fontSize: 14, fontWeight: "600" }}>Premier</Text>
            </View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-foreground text-sm font-medium">Daily Transfer Limit</Text>
              <Text className="text-foreground text-sm font-semibold">$500,000</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-foreground text-sm font-medium">Wire Transfer Limit</Text>
              <Text className="text-foreground text-sm font-semibold">$1,000,000</Text>
            </View>
          </View>
        </View>

        {/* Edit Button */}
        <View className="mx-5 mt-6">
          <Pressable
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: "rgba(201, 169, 98, 0.1)",
                borderWidth: 1,
                borderColor: "#C9A962",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: "#C9A962", fontSize: 15, fontWeight: "600" }}>Edit Profile</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
