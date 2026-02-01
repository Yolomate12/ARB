import Colors from "@/constants/Colors";
import { Link, Stack } from "expo-router";
import React from "react";
import { Dimensions, Image, Pressable, StyleSheet, View } from "react-native";

/* =====================
   Responsive helpers
===================== */
const { width } = Dimensions.get("window");

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const scale = (base: number) =>
  clamp((base * width) / 375, base * 0.85, base * 1.25);

/* =====================
   Layout
===================== */
export default function AdminMenuLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: "",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#fff" },

        headerLeft: () => <HeaderLogo />,
        headerRight: () => <HeaderMenuButton />,

        headerLeftContainerStyle: { paddingLeft: scale(12) },
        headerRightContainerStyle: { paddingRight: scale(12) },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="items" />
      <Stack.Screen name="settings" />
      {/* <Stack.Screen name="[id]" /> */}
    </Stack>
  );
}

/* =====================
   Header components
===================== */
function HeaderLogo() {
  return (
    <View style={styles.headerItem}>
      <Image source={require("@assets/images/logo.png")} style={styles.logo} />
    </View>
  );
}

function HeaderMenuButton() {
  return (
    <Link href="/(admin)/menu/settings" asChild>
      <Pressable hitSlop={scale(10)}>
        <View style={styles.headerItem}>
          <View style={styles.burger}>
            <View style={styles.burgerLine} />
            <View style={styles.burgerLine} />
            <View style={styles.burgerLine} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

/* =====================
   Styles
===================== */
const styles = StyleSheet.create({
  headerItem: {
    height: scale(40),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(8),
  },

  logo: {
    width: scale(44),
    height: scale(44),
    resizeMode: "contain",
  },

  burger: {
    height: scale(14),
    justifyContent: "space-between",
  },

  burgerLine: {
    width: scale(24),
    height: scale(4),
    backgroundColor: Colors.orange.background,
    borderRadius: scale(20),
  },
});
