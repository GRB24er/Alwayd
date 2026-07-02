import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from "../constants/theme";
import { formatCurrency, formatDate, isDebitType, statusLabel } from "../utils/format";
import type { Transaction } from "../types";

const TX_ICON: Record<string, { name: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  deposit: { name: "arrow-down-circle", bg: Colors.successBg, color: Colors.success },
  withdraw: { name: "arrow-up-circle", bg: Colors.errorBg, color: Colors.error },
  "transfer-in": { name: "swap-horizontal", bg: Colors.successBg, color: Colors.success },
  "transfer-out": { name: "swap-horizontal", bg: Colors.infoBg, color: Colors.info },
  fee: { name: "receipt-outline", bg: Colors.warningBg, color: Colors.warning },
  interest: { name: "sparkles", bg: Colors.goldMuted, color: Colors.gold },
  "adjustment-credit": { name: "add-circle", bg: Colors.successBg, color: Colors.success },
  "adjustment-debit": { name: "remove-circle", bg: Colors.errorBg, color: Colors.error },
};

interface Props {
  transaction: Transaction;
  onPress?: () => void;
}

export default function TransactionRow({ transaction, onPress }: Props) {
  const isDebit = isDebitType(transaction.type);
  const icon = TX_ICON[transaction.type] || TX_ICON.deposit;
  const isPending = ["pending", "pending_verification", "processing"].includes(transaction.status);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>

      <View style={styles.details}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description || transaction.type}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.date}>{formatDate(transaction.date)}</Text>
          {isPending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>{statusLabel(transaction.status)}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.amount, isDebit ? styles.amountDebit : styles.amountCredit]}>
        {isDebit ? "−" : "+"}{formatCurrency(Math.abs(transaction.amount))}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  details: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  description: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  date: {
    fontSize: FontSize.label,
    color: Colors.textMuted,
  },
  pendingBadge: {
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
  },
  pendingText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  amountDebit: {
    color: Colors.textPrimary,
  },
  amountCredit: {
    color: Colors.success,
  },
});
