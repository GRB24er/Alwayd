import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Colors } from "../constants/theme";
import { useAuth } from "../hooks/useAuth";

import LoginScreen from "../screens/auth/LoginScreen";
import TabNavigator from "./TabNavigator";
import TransactionDetailScreen from "../screens/transactions/TransactionDetailScreen";
import TransferFormScreen from "../screens/transfers/TransferFormScreen";
import AccountDetailScreen from "../screens/accounts/AccountDetailScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="TransactionDetail"
            component={TransactionDetailScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="TransferForm"
            component={TransferFormScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="AccountDetail"
            component={AccountDetailScreen}
            options={{ animation: "slide_from_right" }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={LoginScreen} options={{ animation: "fade" }} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
});
