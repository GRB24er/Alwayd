import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ACCOUNTS = [
  {
    id: "checking",
    name: "Premier Checking",
    number: "****4521",
    balance: 45892.67,
    available: 45892.67,
    type: "Checking",
    currency: "USD",
    icon: "creditcard.fill" as const,
  },
  {
    id: "savings",
    name: "High-Yield Savings",
    number: "****7832",
    balance: 128450.33,
    available: 128450.33,
    type: "Savings",
    currency: "USD",
    apy: "4.50%",
    icon: "building.columns.fill" as const,
  },
  {
    id: "investment",
    name: "Investment Portfolio",
    number: "****9103",
    balance: 312750.89,
    available: 265838.26,
    type: "Investment",
    currency: "USD",
    ytd: "+12.4%",
    icon: "chart.line.uptrend.xyaxis" as const,
  },
];

export default function AccountsScreen() {
  const colors = useColors();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalBalance = ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-foreground text-2xl font-bold">Accounts</Text>
          <Text className="text-muted text-sm mt-1">Manage your financial portfolio</Text>
        </View>

        {/* Total Balance */}
        <View className="mx-5 mt-4 rounded-2xl p-5" style={{ backgroundColor: "#001A3D" }}>
          <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Total Portfolio Value</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "700", marginTop: 4, letterSpacing: -0.5 }}>
            {formatCurrency(totalBalance)}
          </Text>
          <View className="flex-row mt-3 gap-4">
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: "#C9A962" }} />
              <Text style={{ color: "#9CA3AF", fontSize: 11 }}>3 Active Accounts</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22C55E" }} />
              <Text style={{ color: "#9CA3AF", fontSize: 11 }}>All in Good Standing</Text>
            </View>
          </View>
        </View>

        {/* Account Cards */}
        <View className="mx-5 mt-6">
          {ACCOUNTS.map((account) => (
            <Pressable
              key={account.id}
              style={({ pressed }) => [
                {
                  borderRadius: 20,
                  padding: 20,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 14,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {/* Account Header */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: "rgba(201, 169, 98, 0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name={account.icon} size={24} color="#C9A962" />
                  </View>
                  <View>
                    <Text className="text-foreground text-base font-semibold">{account.name}</Text>
                    <Text className="text-muted text-xs mt-0.5">{account.type} · {account.number}</Text>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={18} color={colors.muted} />
              </View>

              {/* Balance Section */}
              <View className="mt-4 pt-4" style={{ borderTopWidth: 0.5, borderTopColor: colors.border }}>
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-muted text-xs">Current Balance</Text>
                    <Text className="text-foreground text-xl font-bold mt-1">
                      {formatCurrency(account.balance)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-muted text-xs">Available</Text>
                    <Text className="text-foreground text-base font-semibold mt-1">
                      {formatCurrency(account.available)}
                    </Text>
                  </View>
                </View>
                {(account.apy || account.ytd) && (
                  <View className="mt-3 flex-row">
                    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
                      <Text style={{ color: colors.success, fontSize: 12, fontWeight: "600" }}>
                        {account.apy ? `${account.apy} APY` : account.ytd}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Quick Actions */}
              <View className="flex-row mt-4 gap-2">
                <Pressable
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: "rgba(201, 169, 98, 0.08)",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <IconSymbol name="arrow.left.arrow.right" size={14} color="#C9A962" />
                  <Text style={{ color: "#C9A962", fontSize: 12, fontWeight: "600", marginLeft: 6 }}>Transfer</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: "rgba(201, 169, 98, 0.08)",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <IconSymbol name="doc.text.fill" size={14} color="#C9A962" />
                  <Text style={{ color: "#C9A962", fontSize: 12, fontWeight: "600", marginLeft: 6 }}>Statement</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
