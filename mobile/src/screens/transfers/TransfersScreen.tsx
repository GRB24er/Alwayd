import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  StatusBar, ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../../constants/theme";
import { fetchTransferHistory } from "../../api/client";
import TransactionRow from "../../components/TransactionRow";
import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";
import type { Transaction } from "../../types";

const TRANSFER_OPTIONS = [
  { icon: "swap-horizontal-outline" as const, label: "Between\nAccounts", type: "internal", color: Colors.info },
  { icon: "business-outline" as const, label: "External\nBank", type: "external", color: Colors.gold },
  { icon: "globe-outline" as const, label: "International\nWire", type: "international", color: Colors.success },
  { icon: "flash-outline" as const, label: "Domestic\nWire", type: "wire", color: Colors.warning },
];

export default function TransfersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [transfers, setTransfers] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchTransferHistory();
      setTransfers(data.transactions || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Transfers</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* New transfer options */}
        <View style={styles.optionsGrid}>
          {TRANSFER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={styles.optionCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("TransferForm", { type: opt.type })}
            >
              <View style={[styles.optionIcon, { backgroundColor: `${opt.color}15` }]}>
                <Ionicons name={opt.icon} size={24} color={opt.color} />
              </View>
              <Text style={styles.optionLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scheduled / recurring */}
        <TouchableOpacity style={styles.scheduledBtn} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={20} color={Colors.gold} />
          <View style={styles.scheduledText}>
            <Text style={styles.scheduledTitle}>Scheduled Transfers</Text>
            <Text style={styles.scheduledSub}>Set up recurring payments</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Recent transfers */}
        <SectionHeader title="Recent Transfers" />
        <View style={styles.txCard}>
          {loading ? (
            <ActivityIndicator color={Colors.gold} style={{ paddingVertical: Spacing.xxxl }} />
          ) : transfers.length > 0 ? (
            transfers.slice(0, 10).map((tx, i) => (
              <React.Fragment key={tx._id}>
                <TransactionRow
                  transaction={tx}
                  onPress={() => navigation.navigate("TransactionDetail", { transaction: tx })}
                />
                {i < Math.min(transfers.length, 10) - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))
          ) : (
            <EmptyState
              icon="swap-horizontal-outline"
              title="No transfers yet"
              subtitle="Your transfer history will appear here"
            />
          )}
        </View>

        <View style={{ height: Spacing.section }} />
      </ScrollView>
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
  scrollContent: {
    paddingBottom: Spacing.section,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  optionCard: {
    width: "47%",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  optionLabel: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
    lineHeight: 20,
  },
  scheduledBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  scheduledText: {
    flex: 1,
  },
  scheduledTitle: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  scheduledSub: {
    fontSize: FontSize.label,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 68,
  },
});
