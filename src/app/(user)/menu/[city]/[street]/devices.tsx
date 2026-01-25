import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";

type Tank = {
  tank_id: number;
  level: number | null;
};

type DeviceItem = {
  device_id: string;
  device_name: string;
  status: string;
  tanks: Tank[];
};

// NOTE: typy ostali rovnaké, len labely idú cez t()
const TANK_TYPE_KEYS: Record<
  number,
  "tankPlastic" | "tankPaper" | "tankGlass" | "tankMixed"
> = {
  1: "tankPlastic",
  2: "tankPaper",
  3: "tankGlass",
  4: "tankMixed",
};

const TANK_COLORS: Record<number, string> = {
  1: "#FFA500",
  2: "#FFA500",
  3: "#FFA500",
  4: "#FF0000",
};

export default function StreetDevicesScreen() {
  const { t } = useLanguage();
  const { city, street } = useLocalSearchParams<{
    city: string;
    street: string;
  }>();
  const { profile } = useAuth();

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // reload
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchDevices = async (opts?: { silent?: boolean }) => {
    if (!city || !street || !profile?.id_org) return;

    const silent = opts?.silent ?? false;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const { data: deviceData, error: deviceError } = await supabase
        .from("bin_full_info")
        .select("device_id, device_name, status")
        .eq("name_city", city)
        .eq("name_street", street)
        .eq("id_org", profile.id_org);

      if (deviceError) throw deviceError;

      const devicesWithTanks: DeviceItem[] = await Promise.all(
        (deviceData || [])
          .filter((d) => d.device_id)
          .map(async (device) => {
            const { data: tanksData, error: tanksError } = await supabase
              .from("tank_status")
              .select("tank_id, level")
              .eq("device_id", device.device_id);

            if (tanksError) {
              // nech to nespadne celé, ale logni
              console.warn("Tank status error:", tanksError);
            }

            return {
              device_id: device.device_id,
              device_name: device.device_name,
              status: device.status,
              tanks: tanksData || [],
            };
          }),
      );

      setDevices(devicesWithTanks);
      setFilteredDevices(devicesWithTanks);
    } catch (err: any) {
      console.error("Error fetching devices:", err);
      setError(err?.message || t("errorLoadingDevices"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, street, profile?.id_org]);

  // Filter podľa search inputu
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFilteredDevices(devices);
      return;
    }
    setFilteredDevices(
      devices.filter((d) => (d.device_name ?? "").toLowerCase().includes(q)),
    );
  }, [search, devices]);

  // pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDevices({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF9627" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {t("errorLabel")}: {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* SEARCH BAR */}
      <TextInput
        placeholder={t("searchDevice")}
        placeholderTextColor="#999"
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      {/* HEADER */}
      <Text style={styles.header}>
        .../ {city} / {street}
      </Text>

      <FlatList
        data={filteredDevices}
        keyExtractor={(item) => item.device_id}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          refreshing ? (
            <View style={styles.refreshRow}>
              <ActivityIndicator />
              <Text style={styles.refreshText}>Reloadujem…</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 20 }}>
            <Text style={{ textAlign: "center", color: "#8E8E93" }}>
              {t("noDevicesFound")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Text style={styles.deviceName}>{item.device_name}</Text>
            <Text style={styles.statusText}>
              {t("statusLabel")}: {item.status}
            </Text>

            <View style={styles.progressContainer}>
              {item.tanks.map((tank) => (
                <View key={tank.tank_id} style={styles.progressItem}>
                  <AnimatedCircularProgress
                    size={70}
                    width={8}
                    fill={tank.level ?? 0}
                    tintColor={TANK_COLORS[tank.tank_id]}
                    backgroundColor="#FFE5B4"
                  >
                    {() => <Text>{tank.level ?? 0}%</Text>}
                  </AnimatedCircularProgress>

                  <Text style={styles.tankLabel}>
                    {t(TANK_TYPE_KEYS[tank.tank_id] ?? "tankUnknown")}
                  </Text>
                </View>
              ))}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "red", fontSize: 16, textAlign: "center" },

  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  refreshText: {
    color: "#8E8E93",
    fontSize: 13,
  },

  searchInput: {
    height: 50,
    fontSize: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    paddingHorizontal: 16,
    backgroundColor: "#F6F6F6",
    color: "#1E1E1E",
    marginBottom: 12,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 5,
    color: "#1E1E1E",
    opacity: 0.5,
  },
  card: {
    padding: 15,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C5C5C5",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  deviceName: { fontSize: 20, fontWeight: "bold", color: "black" },
  statusText: { fontSize: 14, color: "gray", marginTop: 4 },
  progressContainer: {
    flexDirection: "row",
    marginTop: 12,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  progressItem: { alignItems: "center", marginRight: 12, marginBottom: 12 },
  tankLabel: { fontSize: 12, color: "#333", marginTop: 4 },
});
