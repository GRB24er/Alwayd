import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/hooks/useAuth";
import RootNavigator from "./src/navigation/RootNavigator";
import { Colors } from "./src/constants/theme";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: Colors.gold,
                background: Colors.bg,
                card: Colors.bgCard,
                text: Colors.textPrimary,
                border: Colors.border,
                notification: Colors.error,
              },
              fonts: {
                regular: { fontFamily: "System", fontWeight: "400" },
                medium: { fontFamily: "System", fontWeight: "500" },
                bold: { fontFamily: "System", fontWeight: "700" },
                heavy: { fontFamily: "System", fontWeight: "800" },
              },
            }}
          >
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
