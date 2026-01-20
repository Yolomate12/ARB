import Button from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TabTwoScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    const fetchOrganization = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("bin_full_info")
        .select("nazov_org")
        .eq("device_id", session.user.id) // alebo uprav podľa svojho stĺpca v DB
        .maybeSingle(); // <-- nezrúti sa, keď je 0 riadkov

      if (error) {
        console.error("Organization fetch error:", error);
        setOrganizationName(null);
      } else {
        setOrganizationName(data?.nazov_org ?? null);
      }

      setLoading(false);
    };

    fetchOrganization();
  }, [session]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={require("@assets/images/logo.png")}
          style={styles.logo}
        />

        <TouchableOpacity onPress={() => router.replace("/(user)/menu")}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* AVATAR + ORGANIZATION */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarBox}>
          <Image
            source={require("../../../assets/images/profile.jpg")}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.organization}>
          {loading ? "Loading..." : (organizationName ?? "No organization")}
        </Text>
      </View>

      <Text style={styles.title}>PROFILE</Text>

      <Text style={styles.mail}>{session?.user?.email}</Text>

      <Button
        onPress={() => router.push("/(user)/menu")}
        text="Go to Menu"
        style={{ marginTop: 30 }}
      />

      <Button
        onPress={() => router.push("/(user)/menu/joinCompany")}
        text="Join Company"
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, alignItems: "center" },
  header: {
    width: "100%",
    paddingTop: 30,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarContainer: { alignItems: "center", marginTop: 30 },
  avatarBox: {
    width: 100,
    height: 100,
    backgroundColor: "#FFC180",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 90, height: 90, borderRadius: 20 },
  organization: { marginTop: 4, fontSize: 14, color: "#666" },
  close: { fontSize: 28, fontWeight: "bold" },
  title: { fontSize: 30, fontWeight: "bold", marginTop: 30 },
  mail: { marginTop: 10, fontSize: 16 },
});
