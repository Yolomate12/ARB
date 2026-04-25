import Colors from "@/constants/Colors";
import { Link, Stack } from "expo-router";
import { Dimensions, Image, Pressable, StyleSheet, View } from "react-native";

const { width: W } = Dimensions.get("window");
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const s = (base: number) => clamp((base * W) / 375, base * 0.85, base * 1.25);

export default function MenuStack() {
  return (
    <Stack
      screenOptions={{
        title: "",

        headerLeft: () => (
          <View style={styles.headerItem}>
            <Image
              source={require("@assets/images/logo.png")}
              style={styles.logo}
            />
          </View>
        ),

        headerRight: () => (
          <Link href="/(user)/menu/[city]/options/options" asChild>
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
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[city]/[street]" />
      <Stack.Screen name="[city]/[street]/devices" />
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
