import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";

export default function Layout() {
  return (
    <PaperProvider>
      {/* Status bar */}
      <StatusBar style="dark" backgroundColor="#f2f6fc" />

      <SafeAreaView style={styles.safeArea}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#ffffff",
              borderTopWidth: 0.5,
              borderTopColor: "#ddd",
              height: 60,
              paddingBottom: 8,
            },
            tabBarActiveTintColor: "#0056b3",
            tabBarInactiveTintColor: "gray",
          }}
        >
          {/* Dashboard (Home) */}
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="speedometer" size={size} color={color} />
              ),
            }}
          />

          {/* Reminders */}
          <Tabs.Screen
            name="reminders"
            options={{
              title: "Reminders",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="notifications" size={size} color={color} />
              ),
            }}
          />

          {/* Chat Screen */}
          

          {/* Profile */}
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f2f6fc",
    paddingTop: 40,
  },
});
