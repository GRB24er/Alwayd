import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { maskAccountNumber } from "../../utils/format";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - Spacing.lg * 2;
const CARD_HEIGHT = CARD_WIDTH * 0.63;

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Cards</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Virtual Card */}
        <LinearGradient
          colors={["#1a2a4a", "#0d2440", "#081a30"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardTop}>
            <Text style={styles.cardBrand}>Aldwych European Capital</Text>
            <View style={styles.chipIcon}>
              <Ionicons name="wifi" size={18} color={Colors.gold} style={{ transform: [{ rotate: "90deg" }] }} />
            </View>
          </View>

          <Text style={styles.cardNumber}>
            •••• •••• •••• {user?.accountNumber?.slice(-4) || "0000"}
          </Text>

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardLabel}>Card Holder</Text>
              <Text style={styles.cardValue}>{user?.name || "Account Holder"}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardLabel}>Valid Thru</Text>
              <Text style={styles.cardValue}>12/28</Text>
            </View>
            <View style={styles.networkLogo}>
              <View style={styles.circle1} />
              <View style={styles.circle2} />
            </View>
          </View>

          {/* Gold accent line */}
          <View style={styles.goldStripe} />
        </LinearGradient>

        {/* Card actions */}
        <View style={styles.actions}>
          <CardAction icon="lock-closed-outline" label="Freeze Card" />
          <CardAction icon="settings-outline" label="Card Settings" />
          <CardAction icon="eye-outline" label="Show Details" />
          <CardAction icon="card-outline" label="Virtual Card" />
        </View>

        {/* Card management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Management</Text>
          <MenuItem icon="notifications-outline" label="Transaction Alerts" subtitle="Get notified on every purchase" />
          <MenuItem icon="globe-outline" label="International Usage" subtitle="Enable/disable overseas transactions" />
          <MenuItem icon="speedometer-outline" label="Spending Limits" subtitle="Set daily and monthly limits" />
          <MenuItem icon="shield-outline" label="Card Security" subtitle="PIN, contactless, and online settings" />
        </View>

        <View style={{ height: Spacing.section }} />
      </ScrollView>
    </View>
  );
}

function CardAction({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={Colors.gold} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={Colors.gold} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
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
  content: {
    paddingBottom: Spacing.section,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.xxl,
    justifyContent: "space-between",
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.2)",
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBrand: {
    fontSize: FontSize.label,
    color: Colors.gold,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  chipIcon: {
    width: 36,
    height: 28,
    borderRadius: 4,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  cardNumber: {
    fontSize: FontSize.heading,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
    letterSpacing: 3,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  cardRight: {
    marginLeft: Spacing.xxxl,
  },
  cardLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  networkLogo: {
    flexDirection: "row",
    marginLeft: "auto",
    alignItems: "center",
  },
  circle1: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(201, 169, 98, 0.6)",
    marginRight: -10,
  },
  circle2: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(201, 169, 98, 0.3)",
  },
  goldStripe: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.gold,
    opacity: 0.4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  actionItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxxl,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  menuSub: {
    fontSize: FontSize.label,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
