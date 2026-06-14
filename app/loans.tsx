import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ACTIVE_LOANS = [
  {
    id: "1",
    type: "Mortgage",
    amount: 450000,
    remaining: 312500,
    rate: "3.75%",
    monthly: 2085.67,
    nextPayment: "Jul 1, 2026",
    status: "Active",
  },
  {
    id: "2",
    type: "Auto Loan",
    amount: 45000,
    remaining: 18750,
    rate: "4.25%",
    monthly: 845.33,
    nextPayment: "Jun 28, 2026",
    status: "Active",
  },
];

export default function LoansScreen() {
  const colors = useColors();
  const router = useRouter();

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
            <Text className="text-foreground text-2xl font-bold">Loans</Text>
            <Text className="text-muted text-sm mt-0.5">Manage your borrowing</Text>
          </View>
        </View>

        {/* Summary */}
        <View className="mx-5 mt-4 rounded-2xl p-5" style={{ backgroundColor: "#001A3D" }}>
          <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Total Outstanding</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "700", marginTop: 4 }}>
            {formatCurrency(ACTIVE_LOANS.reduce((sum, l) => sum + l.remaining, 0))}
          </Text>
          <View className="flex-row mt-3 gap-4">
            <View>
              <Text style={{ color: "#6B7280", fontSize: 11 }}>Monthly Payments</Text>
              <Text style={{ color: "#C9A962", fontSize: 15, fontWeight: "600" }}>
                {formatCurrency(ACTIVE_LOANS.reduce((sum, l) => sum + l.monthly, 0))}
              </Text>
            </View>
            <View>
              <Text style={{ color: "#6B7280", fontSize: 11 }}>Active Loans</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>{ACTIVE_LOANS.length}</Text>
            </View>
          </View>
        </View>

        {/* Loan Cards */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-base font-semibold mb-3">Active Loans</Text>
          {ACTIVE_LOANS.map((loan) => (
            <View
              key={loan.id}
              className="rounded-2xl p-5 mb-4"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(201, 169, 98, 0.1)", alignItems: "center", justifyContent: "center" }}>
                    <IconSymbol name="building.columns.fill" size={22} color="#C9A962" />
                  </View>
                  <View>
                    <Text className="text-foreground text-base font-semibold">{loan.type}</Text>
                    <Text className="text-muted text-xs">{loan.rate} APR</Text>
                  </View>
                </View>
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
                  <Text style={{ color: colors.success, fontSize: 11, fontWeight: "600" }}>{loan.status}</Text>
                </View>
              </View>

              {/* Progress */}
              <View className="mt-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-muted text-xs">Paid: {formatCurrency(loan.amount - loan.remaining)}</Text>
                  <Text className="text-muted text-xs">Total: {formatCurrency(loan.amount)}</Text>
                </View>
                <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                  <View
                    style={{
                      height: "100%",
                      width: `${((loan.amount - loan.remaining) / loan.amount) * 100}%`,
                      backgroundColor: "#C9A962",
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>

              {/* Details */}
              <View className="flex-row mt-4 pt-4 justify-between" style={{ borderTopWidth: 0.5, borderTopColor: colors.border }}>
                <View>
                  <Text className="text-muted text-xs">Monthly Payment</Text>
                  <Text className="text-foreground text-sm font-semibold mt-0.5">{formatCurrency(loan.monthly)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-muted text-xs">Next Payment</Text>
                  <Text className="text-foreground text-sm font-semibold mt-0.5">{loan.nextPayment}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Apply for Loan */}
        <View className="mx-5 mt-2">
          <Pressable
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: "#C9A962",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <IconSymbol name="plus" size={18} color="#001A3D" />
            <Text style={{ color: "#001A3D", fontSize: 15, fontWeight: "700", marginLeft: 8 }}>Apply for a New Loan</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
