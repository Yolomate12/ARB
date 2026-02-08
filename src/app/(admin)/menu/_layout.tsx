import Colors from "@/constants/Colors";
import { Link, Stack } from "expo-router";
import React from "react";
import { Dimensions, Image, Pressable, StyleSheet, View } from "react-native";

const { width } = Dimensions.get("window");
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const scale = (base: number) =>
  clamp((base * width) / 375, base * 0.85, base * 1.25);

export default function AdminMenuLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: "",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#fff" },

        // ✅ headerRight môže byť globálne
        headerRight: () => <HeaderMenuButton />,

        headerRightContainerStyle: { paddingRight: scale(12) },
      }}
    >
      {/* ✅ len tu daj logo namiesto back buttonu */}
      <Stack.Screen
        name="index"
        options={{
          headerLeft: () => <HeaderLogo />,
          headerLeftContainerStyle: { paddingLeft: scale(12) },
        }}
      />

      {/* ostatné nech používajú default back */}
      <Stack.Screen name="items" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="addDevice" />
      <Stack.Screen name="addOrganisation" />

      {/* ✅ organisation routy sú children - musíš uviesť presné mená */}
      <Stack.Screen name="organisation/index" />
      <Stack.Screen name="organisation/items" />
      <Stack.Screen name="organisation/settings" />
      <Stack.Screen name="organisation/[id_org]" />
    </Stack>
  );
}

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
