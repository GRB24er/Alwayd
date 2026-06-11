import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Colors, FontSize, FontWeight, Spacing } from "../constants/theme";

import DashboardScreen from "../screens/dashboard/DashboardScreen";
import TransactionsScreen from "../screens/transactions/TransactionsScreen";
import TransfersScreen from "../screens/transfers/TransfersScreen";
import CardsScreen from "../screens/cards/CardsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: "grid", default: "grid-outline" },
  Transactions: { focused: "receipt", default: "receipt-outline" },
  Transfers: { focused: "swap-horizontal-sharp", default: "swap-horizontal-outline" },
  Cards: { focused: "card", default: "card-outline" },
  Profile: { focused: "person", default: "person-outline" },
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name={focused ? icons.focused : icons.default}
                size={focused ? 22 : 21}
                color={color}
              />
            </View>
          );
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bgCard }]} />
          ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Transfers" component={TransfersScreen} />
      <Tab.Screen name="Cards" component={CardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: Platform.OS === "ios" ? 88 : 65,
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
    paddingTop: Spacing.sm,
    backgroundColor: Platform.OS === "ios" ? "transparent" : Colors.bgCard,
    elevation: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  activeIconWrap: {
    backgroundColor: Colors.goldMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
