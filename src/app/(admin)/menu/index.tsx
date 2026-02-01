import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AdminMenuIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Menu</Text>

      <Link href="/(admin)" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Späť na Admin</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#111",
    alignSelf: "center",
    minWidth: 220,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
