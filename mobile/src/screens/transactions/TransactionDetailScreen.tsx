import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../../constants/theme";
import {
  formatCurrency, formatFullDate, isDebitType, statusLabel, txTypeLabel,
} from "../../utils/format";
import type { Transaction } from "../../types";

export default function TransactionDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const tx: Transaction = route.params.transaction;

  const isDebit = isDebitType(tx.type);
  const status = statusLabel(tx.status);
  const isCompleted = ["completed", "approved"].includes(tx.status);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Transaction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount hero */}
        <View style={styles.amountSection}>
          <View style={[styles.statusDot, isCompleted ? styles.statusSuccess : styles.statusPending]} />
          <Text style={styles.statusText}>{status}</Text>
          <Text style={[styles.amount, isDebit ? styles.amountDebit : styles.amountCredit]}>
            {isDebit ? "−" : "+"}{formatCurrency(Math.abs(tx.amount))}
          </Text>
          <Text style={styles.type}>{txTypeLabel(tx.type)}</Text>
        </View>

        {/* Detail card */}
        <View style={styles.card}>
          <DetailRow label="Description" value={tx.description || txTypeLabel(tx.type)} />
          <DetailRow label="Date" value={formatFullDate(tx.date)} />
          <DetailRow label="Account" value={capitalize(tx.accountType)} />
          <DetailRow label="Reference" value={tx.reference} mono />
          <DetailRow label="Currency" value={tx.currency || "USD"} />
          {tx.channel && <DetailRow label="Channel" value={tx.channel} />}
          <DetailRow label="Status" value={status} last />
        </View>

        {/* Receipt button for transfers */}
        {(tx.type === "transfer-in" || tx.type === "transfer-out") && isCompleted && (
          <TouchableOpacity style={styles.receiptBtn} activeOpacity={0.7}>
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.receiptGradient}
            >
              <Ionicons name="document-text" size={18} color={Colors.navyDark} />
              <Text style={styles.receiptText}>Download Receipt</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.mono]} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navTitle: {
    fontSize: FontSize.subtitle,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.section,
  },
  amountSection: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: Spacing.sm,
  },
  statusSuccess: { backgroundColor: Colors.success },
  statusPending: { backgroundColor: Colors.warning },
  statusText: {
    fontSize: FontSize.label,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  amount: {
    fontSize: 40,
    fontWeight: FontWeight.heavy,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  amountDebit: { color: Colors.textPrimary },
  amountCredit: { color: Colors.success },
  type: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  detailBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailLabel: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  detailValue: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
    maxWidth: "60%",
    textAlign: "right",
  },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: FontSize.label,
  },
  receiptBtn: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    ...Shadow.gold,
  },
  receiptGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    gap: Spacing.sm,
  },
  receiptText: {
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.bold,
    color: Colors.navyDark,
  },
});
