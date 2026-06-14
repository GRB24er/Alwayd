import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const PORTFOLIO_ITEMS = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 150, price: 198.45, change: +2.34, changePercent: +1.19 },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 80, price: 442.12, change: -1.56, changePercent: -0.35 },
  { symbol: "GOOGL", name: "Alphabet Inc.", shares: 45, price: 178.90, change: +3.21, changePercent: +1.83 },
  { symbol: "AMZN", name: "Amazon.com Inc.", shares: 60, price: 195.67, change: +0.89, changePercent: +0.46 },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 25, price: 135.20, change: +5.67, changePercent: +4.38 },
];

export default function InvestmentsScreen() {
  const colors = useColors();
  const router = useRouter();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);

  const totalValue = PORTFOLIO_ITEMS.reduce((sum, item) => sum + item.shares * item.price, 0);
  const totalGain = 38450.67;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View>
            <Text className="text-foreground text-2xl font-bold">Investments</Text>
            <Text className="text-muted text-sm mt-0.5">Portfolio overview</Text>
          </View>
        </View>

        {/* Portfolio Summary */}
        <View className="mx-5 mt-4 rounded-2xl p-5" style={{ backgroundColor: "#001A3D" }}>
          <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Portfolio Value</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "700", marginTop: 4 }}>
            {formatCurrency(totalValue)}
          </Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}>
              <Text style={{ color: "#4ADE80", fontSize: 12, fontWeight: "600" }}>+{formatCurrency(totalGain)} (+12.4%)</Text>
            </View>
            <Text style={{ color: "#9CA3AF", fontSize: 11 }}>All time</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="mx-5 mt-4 flex-row gap-3">
          {[
            { label: "Today", value: "+$1,245.67", positive: true },
            { label: "This Week", value: "+$3,890.12", positive: true },
            { label: "This Month", value: "+$8,234.50", positive: true },
          ].map((stat, idx) => (
            <View
              key={idx}
              className="flex-1 rounded-xl p-3 items-center"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <Text className="text-muted text-xs">{stat.label}</Text>
              <Text style={{ color: stat.positive ? colors.success : colors.error, fontSize: 13, fontWeight: "600", marginTop: 4 }}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Holdings */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-base font-semibold mb-3">Holdings</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {PORTFOLIO_ITEMS.map((item, idx) => (
              <View
                key={item.symbol}
                className="flex-row items-center px-4 py-3.5"
                style={idx < PORTFOLIO_ITEMS.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : {}}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: "#001A3D",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#C9A962", fontSize: 12, fontWeight: "700" }}>{item.symbol.slice(0, 2)}</Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-foreground text-sm font-semibold">{item.symbol}</Text>
                  <Text className="text-muted text-xs mt-0.5">{item.shares} shares</Text>
                </View>
                <View className="items-end">
                  <Text className="text-foreground text-sm font-semibold">{formatCurrency(item.shares * item.price)}</Text>
                  <Text
                    style={{
                      color: item.change >= 0 ? colors.success : colors.error,
                      fontSize: 11,
                      fontWeight: "600",
                      marginTop: 2,
                    }}
                  >
                    {item.change >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
