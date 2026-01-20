import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type DeviceStatus = {
  onlineCount: number;
  offlineCount: number;
};

export default function TabTwoScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    onlineCount: 0,
    offlineCount: 0,
  });

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [language, setLanguage] = useState("Slovenčina");

  /* =====================
     FETCH DATA
  ===================== */
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id_org")
          .eq("id", session.user.id)
          .single();

        if (profileError) throw profileError;

        if (profileData?.id_org) {
          const { data: orgData, error: orgError } = await supabase
            .from("bin_full_info")
            .select("nazov_org, status")
            .eq("id_org", profileData.id_org);

          if (orgError) throw orgError;

          setOrganizationName(
            orgData && orgData.length > 0
              ? orgData[0].nazov_org
              : "No organization",
          );

          const onlineCount =
            orgData?.filter((d) => d.status === "online").length || 0;
          const offlineCount =
            orgData?.filter((d) => d.status === "offline").length || 0;

          setDeviceStatus({ onlineCount, offlineCount });
        }
      } catch (err) {
        console.error(err);
        setOrganizationName("No organization");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.id]);

  /* =====================
     UI
  ===================== */
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

      <Text style={styles.section}>Možnosti</Text>

      {/* ORGANIZATION */}
      <Text style={styles.organization}>
        {loading ? "Loading..." : (organizationName ?? "No organization")}
      </Text>

      {/* DEVICES */}
      <TouchableOpacity style={styles.listItem}>
        <View>
          <Text style={styles.listTitle}>Zariadenia</Text>
          <Text style={styles.listSubtitle}>
            Online: {deviceStatus.onlineCount}, Offline:{" "}
            {deviceStatus.offlineCount}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* NOTIFICATIONS */}
      <TouchableOpacity style={styles.listItem}>
        <View>
          <Text style={styles.listTitle}>Notifikácie</Text>
          <Text style={styles.listSubtitle}>
            Upozornenie pri naplnení koša nad 80 %
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* LANGUAGE */}
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => setLanguageModalVisible(true)}
      >
        <View>
          <Text style={styles.listTitle}>Jazyk</Text>
          <Text style={styles.listSubtitle}>{language}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* JOIN COMPANY */}
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => router.push("/(user)/menu/joinCompany")}
      >
        <View>
          <Text style={styles.listTitle}>Join Company with Code</Text>
          <Text style={styles.listSubtitle}>
            Pripojte sa k svojej spoločnosti pomocou kódu
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* LANGUAGE MODAL */}
      <Modal visible={languageModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Vyber jazyk</Text>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setLanguage("English");
                setLanguageModalVisible(false);
              }}
            >
              <Text style={styles.modalText}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalItem, { marginTop: 10 }]}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={[styles.modalText, { color: "#FF3B30" }]}>
                Zrušiť
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    alignItems: "center",
    backgroundColor: "white",
  },
  header: {
    width: "100%",
    paddingTop: 30,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  close: {
    fontSize: 28,
    fontWeight: "bold",
  },
  section: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: "bold",
  },
  organization: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  listItem: {
    width: "90%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  listSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: "#C7C7CC",
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  modalItem: {
    paddingVertical: 14,
  },
  modalText: {
    fontSize: 16,
  },
});
