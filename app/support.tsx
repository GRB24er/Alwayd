import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const FAQ_ITEMS = [
  { question: "How do I reset my password?", answer: "Go to Settings > Security > Change Password" },
  { question: "What are the transfer limits?", answer: "Premier members: $500,000 daily, $1M wire" },
  { question: "How do I freeze my card?", answer: "Go to Cards tab > Select card > Freeze" },
  { question: "How to enable biometric login?", answer: "Settings > Security > Face ID / Fingerprint" },
];

export default function SupportScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View>
            <Text className="text-foreground text-2xl font-bold">Support</Text>
            <Text className="text-muted text-sm mt-0.5">We are here to help</Text>
          </View>
        </View>

        {/* Contact Options */}
        <View className="mx-5 mt-4">
          <View className="flex-row gap-3">
            <Pressable
              style={({ pressed }) => [
                {
                  flex: 1,
                  padding: 20,
                  borderRadius: 16,
                  backgroundColor: "#001A3D",
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <IconSymbol name="questionmark.circle.fill" size={28} color="#C9A962" />
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600", marginTop: 10 }}>Live Chat</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 4 }}>Available 24/7</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                {
                  flex: 1,
                  padding: 20,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <IconSymbol name="paperplane.fill" size={28} color="#C9A962" />
              <Text className="text-foreground text-sm font-semibold mt-2.5">Email Us</Text>
              <Text className="text-muted text-xs mt-1">Response in 24h</Text>
            </Pressable>
          </View>
        </View>

        {/* Phone */}
        <View className="mx-5 mt-4">
          <Pressable
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
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(201, 169, 98, 0.1)", alignItems: "center", justifyContent: "center" }}>
              <IconSymbol name="building.columns.fill" size={22} color="#C9A962" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-foreground text-sm font-semibold">Call Us</Text>
              <Text className="text-muted text-xs mt-0.5">1-800-ALDWYCH (Mon-Fri 8am-8pm)</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {/* FAQ */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-base font-semibold mb-3">Frequently Asked Questions</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {FAQ_ITEMS.map((faq, idx) => (
              <View
                key={idx}
                className="px-4 py-3.5"
                style={idx < FAQ_ITEMS.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : {}}
              >
                <Text className="text-foreground text-sm font-medium">{faq.question}</Text>
                <Text className="text-muted text-xs mt-1">{faq.answer}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Emergency */}
        <View className="mx-5 mt-6 rounded-2xl p-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.2)" }}>
          <View className="flex-row items-center gap-3">
            <IconSymbol name="shield.fill" size={22} color={colors.error} />
            <View className="flex-1">
              <Text style={{ color: colors.error, fontSize: 14, fontWeight: "600" }}>Report Fraud</Text>
              <Text className="text-muted text-xs mt-0.5">If you suspect unauthorized activity</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.error} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
