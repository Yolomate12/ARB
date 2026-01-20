import Colors from "@/constants/Colors";
import { Link, Stack } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";

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
          <Link href="/(user)/two" asChild>
            <Pressable>
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
    height: 44,               // 🔥 dôležité pre iOS "bublinu"
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  logo: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },

  menuIcon: {
    flexDirection: "column",
    justifyContent: "space-between",
    height: 12,
  },

  menuLine: {
    height: 4,
    width: 23,
    backgroundColor: Colors.orange.background,
    borderRadius: 20,
  },
});
