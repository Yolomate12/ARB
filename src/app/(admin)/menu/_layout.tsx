import Colors from "@/constants/Colors";
import { Link, Stack } from "expo-router";
import React from "react";
import { Dimensions, Image, Pressable, StyleSheet, View } from "react-native";

const { width } = Dimensions.get("window");
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const s = (base: number) =>
  clamp((base * width) / 375, base * 0.85, base * 1.25);

export default function AdminMenuLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: "",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#fff" },

        // ✅ VŠADE: logo vľavo (namiesto šípky)
        headerLeft: () => (
          <View style={styles.headerItem}>
            <Image
              source={require("@assets/images/logo.png")}
              style={styles.logo}
            />
          </View>
        ),
        headerLeftContainerStyle: { paddingLeft: s(12) },

        // ✅ VŠADE: hamburger vpravo
        headerRight: () => (
          <Link href="/(admin)/menu/settings" asChild>
            <Pressable hitSlop={s(10)}>
              <View style={styles.headerItem}>
                <View style={styles.menuIcon}>
                  <View style={styles.menuLine} />
                  <View style={styles.menuLine} />
                </View>
              </View>
            </Pressable>
          </Link>
        ),
        headerRightContainerStyle: { paddingRight: s(12) },

        // ✅ vypne default back šípku (ak by ju RN chcel zobraziť)
        headerBackVisible: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="items" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="addDevice" />
      <Stack.Screen name="addOrganisation" />

      <Stack.Screen name="organisation/index" />
      <Stack.Screen name="organisation/items" />
      <Stack.Screen name="organisation/[id_org]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerItem: {
    height: s(40),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: s(10),
  },

  logo: {
    width: s(44),
    height: s(44),
    resizeMode: "contain",
  },

  menuIcon: {
    flexDirection: "column",
    justifyContent: "space-between",
    height: s(12),
  },

  menuLine: {
    height: s(4),
    width: s(23),
    backgroundColor: Colors.orange.background,
    borderRadius: s(20),
  },
});
