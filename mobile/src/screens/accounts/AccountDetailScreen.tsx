import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  StatusBar, ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../../constants/theme";
import { fetchDashboard, fetchTransactions } from "../../api/client";
import { formatCurrency, maskAccountNumber } from "../../utils/format";
import { useAuth } from "../../hooks/useAuth";
import TransactionRow from "../../components/TransactionRow";
import EmptyState from "../../components/EmptyState";
import type { Transaction, AccountType, Balances, User } from "../../types";

const ACCOUNT_META: Record<AccountType, {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string, string];
}> = {
  checking: {
    label: "Checking Account",
    icon: "wallet-outline",
    gradient: ["#1a2a4a", "#0d2440", "#081a30"],
  },
  savings: {
    label: "Savings Account",
    icon: "shield-checkmark-outline",
    gradient: ["#1a3328", "#0d3020", "#082818"],
  },
  investment: {
    label: "Investment Account",
    icon: "trending-up-outline",
    gradient: ["#2a1a3a", "#200d30", "#180824"],
  },
};

export default function AccountDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const accountType: AccountType = route.params?.accountType || "checking";
  const meta = ACCOUNT_META[accountType];

  const [balances, setBalances] = useState<Balances | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = true) => {
    try {
      const [dash, txData] = await Promise.all([
        fetchDashboard(),
        fetchTransactions({ accountType, page: 1, limit: 20 }),
      ]);
      setBalances(dash.balances);
      setUser(dash.user);
      setTransactions(txData.transactions || []);
      setPage(1);
      setHasMore(txData.pagination?.hasMore ?? false);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accountType]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loadMore = async () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    try {
      const data = await fetchTransactions({ accountType, page: nextPage, limit: 20 });
      setTransactions((prev) => [...prev, ...(data.transactions || [])]);
      setPage(nextPage);
      setHasMore(data.pagination?.hasMore ?? false);
    } catch {
      // silent
    }
  };

  const balance = balances ? balances[accountType] : 0;
  const displayUser = user || authUser;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{meta.label}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={Colors.gold}
            />
          }
          ListHeaderComponent={
            <>
              {/* Balance hero */}
              <LinearGradient
                colors={meta.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={[styles.heroIconWrap, { backgroundColor: `${Colors.gold}15` }]}>
                  <Ionicons name={meta.icon} size={28} color={Colors.gold} />
                </View>

                <Text style={styles.heroLabel}>Available Balance</Text>
                <Text style={styles.heroAmount}>{formatCurrency(balance)}</Text>

                <View style={styles.goldBar} />

                <View style={styles.heroRow}>
                  <View>
                    <Text style={styles.heroMetaLabel}>Account</Text>
                    <Text style={styles.heroMetaValue}>
                      {maskAccountNumber(displayUser?.accountNumber)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.heroMetaLabel}>Routing</Text>
                    <Text style={styles.heroMetaValue}>
                      {displayUser?.routingNumber || "—"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Quick stats */}
              <View style={styles.statsRow}>
                <StatCard
                  label="Income"
                  amount={transactions
                    .filter((t) => ["deposit", "transfer-in", "interest", "adjustment-credit"].includes(t.type))
                    .reduce((s, t) => s + (t.rawAmount ?? t.amount), 0)}
                  color={Colors.success}
                  icon="arrow-down-outline"
                />
                <StatCard
                  label="Expenses"
                  amount={transactions
                    .filter((t) => ["withdraw", "transfer-out", "fee", "adjustment-debit"].includes(t.type))
                    .reduce((s, t) => s + Math.abs(t.rawAmount ?? t.amount), 0)}
                  color={Colors.error}
                  icon="arrow-up-outline"
                />
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <Text style={styles.sectionCount}>{transactions.length} transactions</Text>
              </View>
            </>
          }
          renderItem={({ item, index }) => (
            <View style={styles.txWrap}>
              <TransactionRow
                transaction={item}
                onPress={() => navigation.navigate("TransactionDetail", { transaction: item })}
              />
              {index < transactions.length - 1 && <View style={styles.divider} />}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="receipt-outline"
                title="No transactions"
                subtitle={`No ${accountType} account activity yet`}
              />
            </View>
          }
          ListFooterComponent={<View style={{ height: Spacing.section + insets.bottom }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function StatCard({
  label, amount, color, icon,
}: {
  label: string; amount: number; color: string; icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statAmount, { color }]}>{formatCurrency(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.subtitle, color: Colors.textPrimary, fontWeight: FontWeight.semibold,
  },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: Spacing.lg },

  heroCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginTop: Spacing.md,
    ...Shadow.lg, borderWidth: 1, borderColor: "rgba(201, 169, 98, 0.2)",
  },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: BorderRadius.lg,
    alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg,
  },
  heroLabel: {
    fontSize: FontSize.label, color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 1.5, fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  heroAmount: {
    fontSize: FontSize.hero, color: Colors.white, fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
  },
  goldBar: {
    height: 2, backgroundColor: Colors.gold, marginVertical: Spacing.lg,
    borderRadius: 1, opacity: 0.4,
  },
  heroRow: { flexDirection: "row", justifyContent: "space-between" },
  heroMetaLabel: {
    fontSize: FontSize.caption, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: Spacing.xxs,
  },
  heroMetaValue: {
    fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },

  statsRow: {
    flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: BorderRadius.md,
    alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSize.label, color: Colors.textMuted,
    fontWeight: FontWeight.medium, marginBottom: Spacing.xxs,
  },
  statAmount: { fontSize: FontSize.subtitle, fontWeight: FontWeight.bold },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: Spacing.xxl, marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle, color: Colors.textPrimary, fontWeight: FontWeight.semibold,
  },
  sectionCount: { fontSize: FontSize.label, color: Colors.textMuted },

  txWrap: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 68 },
  emptyWrap: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
});
