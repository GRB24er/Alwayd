import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../constants/theme";
import { formatCurrency, maskAccountNumber } from "../utils/format";
import type { Balances, User } from "../types";

const { width } = Dimensions.get("window");

interface Props {
  balances: Balances;
  user: User;
  onAccountPress?: (type: string) => void;
}

export default function BalanceCard({ balances, user, onAccountPress }: Props) {
  return (
    <View style={styles.container}>
      {/* Total balance hero */}
      <LinearGradient
        colors={["#1a2a4a", "#0d2440", "#081a30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Total Balance</Text>
            <Text style={styles.heroAmount}>{formatCurrency(balances.total)}</Text>
          </View>
          <View style={styles.accountBadge}>
            <Text style={styles.accountText}>{maskAccountNumber(user.accountNumber)}</Text>
          </View>
        </View>
        <View style={styles.goldBar} />
        <View style={styles.heroBottom}>
          <Text style={styles.heroName}>{user.name}</Text>
          <Text style={styles.heroBrand}>Aldwych European Capital</Text>
        </View>
      </LinearGradient>

      {/* Account breakdown */}
      <View style={styles.accounts}>
        <AccountRow
          icon="wallet-outline"
          label="Checking"
          balance={balances.checking}
          onPress={() => onAccountPress?.("checking")}
        />
        <View style={styles.divider} />
        <AccountRow
          icon="shield-checkmark-outline"
          label="Savings"
          balance={balances.savings}
          onPress={() => onAccountPress?.("savings")}
        />
        <View style={styles.divider} />
        <AccountRow
          icon="trending-up-outline"
          label="Investment"
          balance={balances.investment}
          onPress={() => onAccountPress?.("investment")}
        />
      </View>
    </View>
  );
}

function AccountRow({
  icon,
  label,
  balance,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  balance: number;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.accountRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.accountIcon}>
        <Ionicons name={icon} size={18} color={Colors.gold} />
      </View>
      <Text style={styles.accountLabel}>{label}</Text>
      <Text style={styles.accountBalance}>{formatCurrency(balance)}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.2)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLabel: {
    fontSize: FontSize.label,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  heroAmount: {
    fontSize: FontSize.hero,
    color: Colors.white,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
  },
  accountBadge: {
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.25)",
  },
  accountText: {
    fontSize: FontSize.caption,
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1,
  },
  goldBar: {
    height: 2,
    backgroundColor: Colors.gold,
    marginVertical: Spacing.lg,
    borderRadius: 1,
    opacity: 0.4,
  },
  heroBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroName: {
    fontSize: FontSize.bodyLarge,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  heroBrand: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
  },
  accounts: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  accountLabel: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  accountBalance: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 64,
  },
});
