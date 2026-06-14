import { FlatList, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const NOTIFICATIONS = [
  { id: "1", title: "Transfer Completed", message: "Your wire transfer of $15,000 to Goldman Sachs has been processed.", time: "2 min ago", read: false, type: "transfer" },
  { id: "2", title: "Security Alert", message: "New device login detected from MacBook Pro in Toronto, ON.", time: "1 hour ago", read: false, type: "security" },
  { id: "3", title: "Payment Due", message: "Your Bell Canada bill of $89.99 is due in 3 days.", time: "3 hours ago", read: true, type: "bill" },
  { id: "4", title: "Deposit Received", message: "Salary deposit of $12,500 from Tech Corp has been credited.", time: "Yesterday", read: true, type: "deposit" },
  { id: "5", title: "Investment Update", message: "NVDA is up 4.38% today. Your portfolio gained $1,245.", time: "Yesterday", read: true, type: "investment" },
  { id: "6", title: "Card Transaction", message: "Apple Store purchase of $1,299.99 on your Premier Debit card.", time: "2 days ago", read: true, type: "card" },
  { id: "7", title: "Loan Payment", message: "Auto loan payment of $845.33 has been processed successfully.", time: "3 days ago", read: true, type: "loan" },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();

  const getIconForType = (type: string) => {
    switch (type) {
      case "transfer": return "arrow.left.arrow.right" as const;
      case "security": return "shield.fill" as const;
      case "bill": return "doc.text.fill" as const;
      case "deposit": return "arrow.down.circle.fill" as const;
      case "investment": return "chart.line.uptrend.xyaxis" as const;
      case "card": return "creditcard.fill" as const;
      case "loan": return "building.columns.fill" as const;
      default: return "bell.fill" as const;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case "transfer": return "#0058D4";
      case "security": return colors.warning;
      case "bill": return "#C9A962";
      case "deposit": return colors.success;
      case "investment": return "#8B5CF6";
      case "card": return colors.error;
      case "loan": return "#C9A962";
      default: return colors.muted;
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View>
            <Text className="text-foreground text-2xl font-bold">Notifications</Text>
            <Text className="text-muted text-sm mt-0.5">{NOTIFICATIONS.filter(n => !n.read).length} unread</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Text style={{ color: "#C9A962", fontSize: 13, fontWeight: "600" }}>Mark All Read</Text>
        </Pressable>
      </View>

      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View
            className="flex-row px-5 py-4"
            style={{
              backgroundColor: item.read ? "transparent" : "rgba(201, 169, 98, 0.03)",
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: `${getColorForType(item.type)}15`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name={getIconForType(item.type)} size={18} color={getColorForType(item.type)} />
            </View>
            <View className="flex-1 ml-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-foreground text-sm font-semibold">{item.title}</Text>
                {!item.read && <View className="w-2 h-2 rounded-full" style={{ backgroundColor: "#C9A962" }} />}
              </View>
              <Text className="text-muted text-xs mt-1" numberOfLines={2}>{item.message}</Text>
              <Text className="text-muted text-xs mt-1.5" style={{ opacity: 0.7 }}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}
