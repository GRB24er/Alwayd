import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ReportsScreen() {
  const colors = useColors();
  const router = useRouter();

  const monthlyData = [
    { month: "Jan", income: 45000, expenses: 28000 },
    { month: "Feb", income: 42000, expenses: 31000 },
    { month: "Mar", income: 48000, expenses: 25000 },
    { month: "Apr", income: 51000, expenses: 33000 },
    { month: "May", income: 47000, expenses: 29000 },
    { month: "Jun", income: 53000, expenses: 27000 },
  ];

  const maxValue = Math.max(...monthlyData.map((d) => Math.max(d.income, d.expenses)));

  const categories = [
    { name: "Transfers", amount: 38750, percent: 42, color: "#C9A962" },
    { name: "Bills & Utilities", amount: 12450, percent: 14, color: "#0058D4" },
    { name: "Shopping", amount: 8900, percent: 10, color: "#22C55E" },
    { name: "Investments", amount: 25400, percent: 28, color: "#8B5CF6" },
    { name: "Other", amount: 5200, percent: 6, color: "#6B7280" },
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View>
            <Text className="text-foreground text-2xl font-bold">Reports</Text>
            <Text className="text-muted text-sm mt-0.5">Financial analytics</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View className="mx-5 mt-4 flex-row gap-3">
          <View className="flex-1 rounded-xl p-4" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", borderWidth: 1, borderColor: "rgba(34, 197, 94, 0.15)" }}>
            <Text className="text-muted text-xs">Total Income</Text>
            <Text style={{ color: colors.success, fontSize: 18, fontWeight: "700", marginTop: 4 }}>$286K</Text>
            <Text style={{ color: colors.success, fontSize: 11, marginTop: 2 }}>+12% vs last year</Text>
          </View>
          <View className="flex-1 rounded-xl p-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.15)" }}>
            <Text className="text-muted text-xs">Total Expenses</Text>
            <Text style={{ color: colors.error, fontSize: 18, fontWeight: "700", marginTop: 4 }}>$173K</Text>
            <Text style={{ color: colors.error, fontSize: 11, marginTop: 2 }}>-5% vs last year</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-base font-semibold mb-4">Monthly Overview</Text>
          <View className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <View className="flex-row items-end justify-between" style={{ height: 140 }}>
              {monthlyData.map((data, idx) => (
                <View key={idx} className="items-center flex-1 gap-1">
                  <View className="flex-row gap-1 items-end" style={{ height: 100 }}>
                    <View
                      style={{
                        width: 12,
                        height: (data.income / maxValue) * 100,
                        backgroundColor: "#C9A962",
                        borderRadius: 3,
                      }}
                    />
                    <View
                      style={{
                        width: 12,
                        height: (data.expenses / maxValue) * 100,
                        backgroundColor: "rgba(201, 169, 98, 0.3)",
                        borderRadius: 3,
                      }}
                    />
                  </View>
                  <Text className="text-muted text-xs">{data.month}</Text>
                </View>
              ))}
            </View>
            <View className="flex-row items-center justify-center gap-6 mt-4 pt-3" style={{ borderTopWidth: 0.5, borderTopColor: colors.border }}>
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#C9A962" }} />
                <Text className="text-muted text-xs">Income</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(201, 169, 98, 0.3)" }} />
                <Text className="text-muted text-xs">Expenses</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Spending Categories */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-base font-semibold mb-3">Spending by Category</Text>
          <View className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {categories.map((cat, idx) => (
              <View key={idx} className="mb-4" style={idx === categories.length - 1 ? { marginBottom: 0 } : {}}>
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <Text className="text-foreground text-sm font-medium">{cat.name}</Text>
                  </View>
                  <Text className="text-foreground text-sm font-semibold">{formatCurrency(cat.amount)}</Text>
                </View>
                <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                  <View style={{ height: "100%", width: `${cat.percent}%`, backgroundColor: cat.color, borderRadius: 4 }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Download Statements */}
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
            <IconSymbol name="arrow.down.circle.fill" size={18} color="#C9A962" />
            <Text style={{ color: "#C9A962", fontSize: 15, fontWeight: "600", marginLeft: 8 }}>Download Statement</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
