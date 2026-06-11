import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from "../../constants/theme";
import { fetchTransactions } from "../../api/client";
import TransactionRow from "../../components/TransactionRow";
import EmptyState from "../../components/EmptyState";
import type { Transaction } from "../../types";

const FILTERS = ["All", "Deposits", "Transfers", "Fees"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_MAP: Record<Filter, string | undefined> = {
  All: undefined,
  Deposits: "deposit",
  Transfers: "transfer-out",
  Fees: "fee",
};

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");

  const load = useCallback(
    async (p = 1, append = false) => {
      try {
        const res = await fetchTransactions({
          page: p,
          limit: 20,
          type: FILTER_MAP[filter],
        });
        const txs = res.transactions || [];
        setTransactions(append ? (prev) => [...prev, ...txs] : txs);
        setPage(p);
        setHasMore(res.pagination?.hasMore ?? txs.length >= 20);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1);
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(1);
  };

  const onEndReached = () => {
    if (hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      load(page + 1, true);
    }
  };

  const changeFilter = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    setLoading(true);
    setTransactions([]);
  };

  const renderItem = ({ item, index }: { item: Transaction; index: number }) => (
    <>
      <TransactionRow
        transaction={item}
        onPress={() => navigation.navigate("TransactionDetail", { transaction: item })}
      />
      {index < transactions.length - 1 && <View style={styles.divider} />}
    </>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => changeFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.gold}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={Colors.gold}
                style={{ paddingVertical: Spacing.xl }}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No transactions found"
              subtitle={filter !== "All" ? "Try a different filter" : "Your transactions will appear here"}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.display,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.goldMuted,
    borderColor: Colors.gold,
  },
  chipText: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flexGrow: 1,
    paddingBottom: Spacing.section,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 68,
  },
});
