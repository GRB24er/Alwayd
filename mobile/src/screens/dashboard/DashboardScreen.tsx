import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from "../../constants/theme";
import { fetchDashboard } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import BalanceCard from "../../components/BalanceCard";
import QuickActions from "../../components/QuickActions";
import SectionHeader from "../../components/SectionHeader";
import TransactionRow from "../../components/TransactionRow";
import EmptyState from "../../components/EmptyState";
import type { Balances, Transaction, User } from "../../types";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user: authUser, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<Balances>({ checking: 0, savings: 0, investment: 0, total: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchDashboard();
      setBalances(data.balances);
      setTransactions(data.transactions || []);
      setUser(data.user);
    } catch (e: any) {
      if (e?.status === 401) logout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const quickActions = [
    {
      icon: "swap-horizontal" as keyof typeof Ionicons.glyphMap,
      label: "Transfer",
      onPress: () => navigation.navigate("Transfers"),
      accent: true,
    },
    {
      icon: "card-outline" as keyof typeof Ionicons.glyphMap,
      label: "Pay",
      onPress: () => {},
    },
    {
      icon: "qr-code-outline" as keyof typeof Ionicons.glyphMap,
      label: "Scan",
      onPress: () => {},
    },
    {
      icon: "ellipsis-horizontal" as keyof typeof Ionicons.glyphMap,
      label: "More",
      onPress: () => navigation.navigate("Profile"),
    },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  const displayUser = user || authUser;
  const recentTx = transactions.slice(0, 8);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Good {getGreeting()},
          </Text>
          <Text style={styles.userName}>
            {displayUser?.firstName || displayUser?.name?.split(" ")[0] || "there"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate("Profile")}
          >
            <Text style={styles.avatarText}>
              {(displayUser?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <BalanceCard
          balances={balances}
          user={displayUser!}
          onAccountPress={(type) =>
            navigation.navigate("AccountDetail", { accountType: type })
          }
        />

        <QuickActions actions={quickActions} />

        <SectionHeader
          title="Recent Activity"
          action="See All"
          onAction={() => navigation.navigate("Transactions")}
        />

        <View style={styles.txCard}>
          {recentTx.length > 0 ? (
            recentTx.map((tx, i) => (
              <React.Fragment key={tx._id}>
                <TransactionRow
                  transaction={tx}
                  onPress={() =>
                    navigation.navigate("TransactionDetail", { transaction: tx })
                  }
                />
                {i < recentTx.length - 1 && <View style={styles.txDivider} />}
              </React.Fragment>
            ))
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              subtitle="Your recent activity will appear here"
            />
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  userName: {
    fontSize: FontSize.heading,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.bgCard,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  avatarText: {
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  scrollContent: {
    paddingBottom: Spacing.section,
  },
  txCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  txDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 68,
  },
  bottomSpacer: {
    height: Spacing.section,
  },
});
