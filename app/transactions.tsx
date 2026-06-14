/**
 * Transactions Screen — Full transaction history with receipt download
 * 
 * Connects to the Alwayd web app's /api/mobile/transactions endpoint.
 * Each transaction is tappable to view/download a branded receipt.
 */

import { FlatList, Text, View, Pressable, TextInput, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect, useCallback } from "react";
import * as BankingAPI from "@/lib/banking-api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Fallback data when API is not connected
const FALLBACK_TRANSACTIONS = [
  { _id: "1", reference: "TXN-240614-001", description: "Wire Transfer - Goldman Sachs", amount: -15000, date: "2026-06-14", status: "completed", type: "transfer-out", accountType: "checking", category: "Transfer" },
  { _id: "2", reference: "TXN-240613-002", description: "Salary Deposit - Tech Corp", amount: 12500, date: "2026-06-13", status: "completed", type: "deposit", accountType: "checking", category: "Income" },
  { _id: "3", reference: "TXN-240612-003", description: "International Transfer - EUR", amount: -8750, date: "2026-06-12", status: "pending", type: "transfer-out", accountType: "checking", category: "Transfer" },
  { _id: "4", reference: "TXN-240611-004", description: "Investment Dividend", amount: 3200, date: "2026-06-11", status: "completed", type: "deposit", accountType: "investment", category: "Investment" },
  { _id: "5", reference: "TXN-240610-005", description: "Utility Payment - Hydro", amount: -245.50, date: "2026-06-10", status: "completed", type: "payment", accountType: "checking", category: "Bills" },
  { _id: "6", reference: "TXN-240609-006", description: "Apple Store Purchase", amount: -1299.99, date: "2026-06-09", status: "completed", type: "payment", accountType: "checking", category: "Shopping" },
  { _id: "7", reference: "TXN-240608-007", description: "Client Payment Received", amount: 28000, date: "2026-06-08", status: "completed", type: "deposit", accountType: "checking", category: "Income" },
  { _id: "8", reference: "TXN-240607-008", description: "Restaurant - Canoe", amount: -342.50, date: "2026-06-07", status: "completed", type: "payment", accountType: "checking", category: "Dining" },
  { _id: "9", reference: "TXN-240606-009", description: "Insurance Premium", amount: -312.00, date: "2026-06-06", status: "completed", type: "payment", accountType: "checking", category: "Insurance" },
  { _id: "10", reference: "TXN-240605-010", description: "Stock Purchase - NVDA", amount: -5400, date: "2026-06-05", status: "completed", type: "payment", accountType: "investment", category: "Investment" },
  { _id: "11", reference: "TXN-240604-011", description: "Rental Income", amount: 4500, date: "2026-06-04", status: "completed", type: "deposit", accountType: "savings", category: "Income" },
  { _id: "12", reference: "TXN-240603-012", description: "Uber Rides", amount: -87.50, date: "2026-06-03", status: "completed", type: "payment", accountType: "checking", category: "Transport" },
];

const FILTERS = ["All", "Income", "Transfer", "Bills", "Investment", "Shopping"];

type Transaction = typeof FALLBACK_TRANSACTIONS[0];

export default function TransactionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [transactions, setTransactions] = useState<Transaction[]>(FALLBACK_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const baseUrl = await BankingAPI.getBaseUrl();
      if (!baseUrl) return; // Use fallback

      setIsLoading(true);
      const data = await BankingAPI.getTransactions({ limit: 50 });
      if (data.transactions && data.transactions.length > 0) {
        setTransactions(data.transactions.map(t => ({
          ...t,
          category: getCategoryFromType(t.type),
        })) as Transaction[]);
      }
    } catch (err) {
      // Use fallback data on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  }, [fetchTransactions]);

  function getCategoryFromType(type: string): string {
    switch (type) {
      case "deposit": case "credit": return "Income";
      case "transfer-out": case "transfer-in": return "Transfer";
      case "payment": return "Bills";
      case "investment": return "Investment";
      default: return "Other";
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Math.abs(amount));

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch = txn.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "All" || txn.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const openReceipt = (txn: Transaction) => {
    router.push({
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
    } as any);
  };

  const renderTransaction = ({ item: txn }: { item: Transaction }) => {
    const isCredit = txn.amount > 0;
    return (
      <Pressable
        onPress={() => openReceipt(txn)}
        style={({ pressed }) => [{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        }]}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: isCredit ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.08)",
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
          <Text className="text-foreground text-sm font-medium" numberOfLines={1}>{txn.description}</Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text className="text-muted text-xs">
              {new Date(txn.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
            <Text className="text-muted text-xs">·</Text>
            <Text className="text-muted text-xs">{txn.category}</Text>
            {txn.status === "pending" && (
              <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                <Text style={{ color: colors.warning, fontSize: 9, fontWeight: "600" }}>PENDING</Text>
              </View>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: isCredit ? colors.success : colors.foreground,
            }}
          >
            {isCredit ? "+" : "-"}{formatCurrency(txn.amount)}
          </Text>
          <MaterialIcons name="receipt-long" size={12} color={colors.muted} style={{ marginTop: 4 }} />
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
          <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-foreground text-2xl font-bold">Transactions</Text>
          <Text className="text-muted text-sm mt-0.5">{filteredTransactions.length} transactions · Tap for receipt</Text>
        </View>
      </View>

      {/* Search */}
      <View className="mx-5 mt-3">
        <View
          className="flex-row items-center px-4 rounded-xl"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 44 }}
        >
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search transactions..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, marginLeft: 10, color: colors.foreground, fontSize: 14 }}
          />
        </View>
      </View>

      {/* Filters */}
      <View className="mt-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActiveFilter(item)}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: activeFilter === item ? "#C9A962" : colors.surface,
                  borderWidth: 1,
                  borderColor: activeFilter === item ? "#C9A962" : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: activeFilter === item ? "#001A3D" : colors.muted,
                }}
              >
                {item}
              </Text>
            </Pressable>
          )}
          keyExtractor={(item) => item}
        />
      </View>

      {/* Transaction List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#C9A962" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#C9A962"
              colors={["#C9A962"]}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}
