import { ScrollView, Text, View, Pressable, Image, Dimensions, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect, useCallback } from "react";
import { useBankAuth } from "@/lib/auth-context";
import * as BankingAPI from "@/lib/banking-api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useBankAuth();

  const [greeting, setGreeting] = useState("Good morning");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dashboardData, setDashboardData] = useState<BankingAPI.DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fallback mock data when API is not connected
  const FALLBACK_BALANCES = {
    checking: 45892.67,
    savings: 128450.33,
    investment: 312750.89,
    total: 487093.89,
  };

  const FALLBACK_TRANSACTIONS = [
    { _id: "1", reference: "TXN-001", description: "Wire Transfer - Goldman Sachs", amount: -15000, date: "2026-06-14", status: "completed", type: "transfer-out", accountType: "checking" },
    { _id: "2", reference: "TXN-002", description: "Salary Deposit - Tech Corp", amount: 12500, date: "2026-06-13", status: "completed", type: "deposit", accountType: "checking" },
    { _id: "3", reference: "TXN-003", description: "International Transfer - EUR", amount: -8750, date: "2026-06-12", status: "pending", type: "transfer-out", accountType: "checking" },
    { _id: "4", reference: "TXN-004", description: "Investment Dividend", amount: 3200, date: "2026-06-11", status: "completed", type: "deposit", accountType: "investment" },
    { _id: "5", reference: "TXN-005", description: "Utility Payment - Hydro", amount: -245.50, date: "2026-06-10", status: "completed", type: "payment", accountType: "checking" },
  ];

  const balances = dashboardData?.balances || FALLBACK_BALANCES;
  const transactions = dashboardData?.transactions || FALLBACK_TRANSACTIONS;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    fetchDashboard();
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const baseUrl = await BankingAPI.getBaseUrl();
      if (!baseUrl) return; // No API configured, use fallback data

      setIsLoadingData(true);
      const data = await BankingAPI.getDashboard();
      setDashboardData(data);
    } catch (err) {
      if (err instanceof BankingAPI.AuthError) {
        // Token expired, redirect to sign in
        router.replace("/signin");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load data");
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDashboard();
    setIsRefreshing(false);
  }, [fetchDashboard]);

  const totalCash = (balances.checking || 0) + (balances.savings || 0);
  const totalAssets = totalCash + (balances.investment || 0);
  const userName = user?.firstName || user?.name?.split(" ")[0] || "Client";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const quickActions = [
    { icon: "arrow.left.arrow.right" as const, title: "Transfer", route: "/(tabs)/transfers" },
    { icon: "doc.text.fill" as const, title: "Pay Bills", route: "/bills" },
    { icon: "arrow.down.circle.fill" as const, title: "Deposit", route: "/deposit" },
    { icon: "chart.line.uptrend.xyaxis" as const, title: "Reports", route: "/reports" },
  ];

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#C9A962"
            colors={["#C9A962"]}
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-surface items-center justify-center overflow-hidden">
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: 28, height: 28 }}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-muted text-xs">{greeting}</Text>
              <Text className="text-foreground text-base font-semibold">{userName}</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push("/notifications" as any)}
              style={({ pressed }) => [
                { opacity: pressed ? 0.6 : 1, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
              ]}
            >
              <IconSymbol name="bell.fill" size={20} color={colors.muted} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/transactions" as any)}
              style={({ pressed }) => [
                { opacity: pressed ? 0.6 : 1, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
              ]}
            >
              <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Balance Card */}
        <View className="mx-5 mt-4 rounded-2xl p-5 overflow-hidden" style={{ backgroundColor: "#001A3D" }}>
          <View className="flex-row items-center justify-between mb-1">
            <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Total Assets</Text>
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(201, 169, 98, 0.15)" }}>
              <Text style={{ color: "#C9A962", fontSize: 11, fontWeight: "600" }}>+5.2%</Text>
            </View>
          </View>
          <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "700", letterSpacing: -1 }}>
            {formatCurrency(totalAssets)}
          </Text>
          <View className="flex-row mt-4 gap-6">
            <View>
              <Text style={{ color: "#6B7280", fontSize: 11 }}>Cash Balance</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
                {formatCurrency(totalCash)}
              </Text>
            </View>
            <View>
              <Text style={{ color: "#6B7280", fontSize: 11 }}>Investments</Text>
              <Text style={{ color: "#C9A962", fontSize: 15, fontWeight: "600" }}>
                {formatCurrency(balances.investment || 0)}
              </Text>
            </View>
          </View>
          {/* Mini chart indicator */}
          <View className="mt-4 h-12 flex-row items-end gap-0.5">
            {Array.from({ length: 30 }, (_, i) => {
              const height = 12 + Math.sin(i * 0.5) * 18 + Math.random() * 10;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height,
                    backgroundColor: i === 29 ? "#C9A962" : "rgba(201, 169, 98, 0.3)",
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-base font-semibold mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            {quickActions.map((action, idx) => (
              <Pressable
                key={idx}
                onPress={() => router.push(action.route as any)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 16,
                    borderRadius: 16,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: "rgba(201, 169, 98, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <IconSymbol name={action.icon} size={22} color="#C9A962" />
                </View>
                <Text className="text-foreground text-xs font-medium">{action.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Account Summary Cards */}
        <View className="mx-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-foreground text-base font-semibold">Accounts</Text>
            <Pressable
              onPress={() => router.push("/(tabs)/accounts" as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={{ color: "#C9A962", fontSize: 13, fontWeight: "600" }}>View All</Text>
            </Pressable>
          </View>
          {[
            { name: "Premier Checking", number: user?.accountNumber ? `****${user.accountNumber.slice(-4)}` : "****4521", balance: balances.checking || 0, icon: "creditcard.fill" as const },
            { name: "High-Yield Savings", number: "****7832", balance: balances.savings || 0, badge: "4.50% APY", icon: "building.columns.fill" as const },
            { name: "Investment Portfolio", number: "****9103", balance: balances.investment || 0, badge: "+12.4% YTD", icon: "chart.line.uptrend.xyaxis" as const },
          ].map((account, idx) => (
            <Pressable
              key={idx}
              onPress={() => router.push("/(tabs)/accounts" as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 10,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(201, 169, 98, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSymbol name={account.icon} size={22} color="#C9A962" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground text-sm font-semibold">{account.name}</Text>
                <Text className="text-muted text-xs mt-0.5">{account.number}</Text>
              </View>
              <View className="items-end">
                <Text className="text-foreground text-sm font-semibold">
                  {formatCurrency(account.balance)}
                </Text>
                {account.badge && (
                  <View className="mt-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
                    <Text style={{ color: colors.success, fontSize: 10, fontWeight: "600" }}>{account.badge}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Recent Transactions */}
        <View className="mx-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-foreground text-base font-semibold">Recent Activity</Text>
            <Pressable
              onPress={() => router.push("/transactions" as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={{ color: "#C9A962", fontSize: 13, fontWeight: "600" }}>See All</Text>
            </Pressable>
          </View>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {transactions.slice(0, 5).map((txn, idx) => {
              const isCredit = txn.amount > 0;
              return (
                <Pressable
                  key={txn._id}
                  onPress={() => router.push({
                    pathname: "/receipt",
                    params: {
                      reference: txn.reference,
                      type: txn.type,
                      amount: String(txn.amount),
                      currency: "USD",
                      date: txn.date,
                      status: txn.status,
                      description: txn.description,
                      accountType: txn.accountType,
                    },
                  } as any)}
                  style={({ pressed }) => [{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: idx < transactions.length - 1 ? 0.5 : 0,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  }]}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: isCredit ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol
                      name={isCredit ? "arrow.down.circle.fill" : "paperplane.fill"}
                      size={18}
                      color={isCredit ? colors.success : colors.error}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-foreground text-sm font-medium" numberOfLines={1}>
                      {txn.description}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <Text className="text-muted text-xs">{new Date(txn.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
                      {txn.status === "pending" && (
                        <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                          <Text style={{ color: colors.warning, fontSize: 9, fontWeight: "600" }}>PENDING</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isCredit ? colors.success : colors.foreground,
                    }}
                  >
                    {isCredit ? "+" : "-"}{formatCurrency(Math.abs(txn.amount))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Security Banner */}
        <View className="mx-5 mt-6 rounded-2xl p-4 flex-row items-center" style={{ backgroundColor: "rgba(0, 88, 212, 0.08)", borderWidth: 1, borderColor: "rgba(0, 88, 212, 0.15)" }}>
          <IconSymbol name="shield.fill" size={24} color="#0058D4" />
          <View className="flex-1 ml-3">
            <Text className="text-foreground text-sm font-semibold">Your accounts are protected</Text>
            <Text className="text-muted text-xs mt-0.5">256-bit encryption active</Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
