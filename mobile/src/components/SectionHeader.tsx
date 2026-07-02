import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Spacing, FontSize, FontWeight } from "../constants/theme";

interface Props {
  title: string;
  action?: string;
  onAction?: () => void;
}

export default function SectionHeader({ title, action, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.subtitle,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  action: {
    fontSize: FontSize.body,
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
  },
});
