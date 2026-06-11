import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../constants/theme";

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
}

interface Props {
  actions: Action[];
}

export default function QuickActions({ actions }: Props) {
  return (
    <View style={styles.container}>
      {actions.map((action, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.action, action.accent && styles.actionAccent]}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, action.accent && styles.iconAccent]}>
            <Ionicons
              name={action.icon}
              size={22}
              color={action.accent ? Colors.navyDark : Colors.gold}
            />
          </View>
          <Text style={[styles.label, action.accent && styles.labelAccent]}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  action: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionAccent: {
    backgroundColor: Colors.gold,
    borderColor: Colors.goldDark,
    ...Shadow.gold,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  iconAccent: {
    backgroundColor: "rgba(13, 36, 64, 0.15)",
  },
  label: {
    fontSize: FontSize.label,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
  },
  labelAccent: {
    color: Colors.navyDark,
  },
});
