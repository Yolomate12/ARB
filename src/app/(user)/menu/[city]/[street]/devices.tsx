import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

const { width: W, height: H } = Dimensions.get("window");
const vw = (p: number) => (W * p) / 100;
const vh = (p: number) => (H * p) / 100;
const fs = (b: number) => Math.max(12, (b * W) / 375);

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchDevices = async (opts?: { silent?: boolean }) => {
    if (!city || !street || !profile?.id_org) return;

    const silent = opts?.silent ?? false;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("bin_full_info")
        .select("device_id, device_name, status")
        .eq("name_city", city)
        .eq("name_street", street)
        .eq("id_org", profile.id_org);

      if (error) throw error;

      const withTanks: DeviceItem[] = await Promise.all(
        (data || []).map(async (d) => {
          const { data: tanks } = await supabase
            .from("tank_status")
            .select("tank_id, level")
            .eq("device_id", d.device_id);

          return {
            device_id: d.device_id,
            device_name: d.device_name,
            status: d.status,
            tanks: tanks || [],
          };
        }),
      );

      setDevices(withTanks);
      setFilteredDevices(withTanks);
    } catch (e: any) {
      setError(e?.message || t("errorLoadingDevices"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [city, street, profile?.id_org]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredDevices(
      devices.filter((d) => d.device_name.toLowerCase().includes(q)),
    );
  }, [search, devices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDevices({ silent: true });
    setRefreshing(false);
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
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const circleSize = vw(18);
  const circleWidth = vw(2);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder={t("searchDevice")}
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        placeholderTextColor="#999"
      />

      <Text style={styles.header}>
        ... / {city} / {street}
      </Text>

      <FlatList
        data={filteredDevices}
        keyExtractor={(i) => i.device_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: vh(3) }}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Text style={styles.deviceName}>{item.device_name}</Text>
            <Text style={styles.statusText}>
              {t("statusLabel")}: {item.status}
            </Text>

            {/* PROGRESS BARY – VŽDY V JEDNOM RIADKU */}
            <View style={styles.progressRow}>
              {item.tanks.map((tank) => (
                <View key={tank.tank_id} style={styles.progressItem}>
                  <AnimatedCircularProgress
                    size={circleSize}
                    width={circleWidth}
                    fill={tank.level ?? 0}
                    tintColor={TANK_COLORS[tank.tank_id]}
                    backgroundColor="#FFE5B4"
                  >
                    {() => (
                      <Text style={{ fontSize: fs(12) }}>
                        {tank.level ?? 0}%
                      </Text>
                    )}
                  </AnimatedCircularProgress>

                  <Text style={styles.tankLabel}>
                    {t(TANK_TYPE_KEYS[tank.tank_id])}
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
  container: {
    flex: 1,
    paddingHorizontal: vw(4),
    paddingTop: vh(2),
    backgroundColor: "white",
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "red", fontSize: fs(16) },

  searchInput: {
    height: vh(6),
    borderRadius: vw(2),
    borderWidth: 1,
    borderColor: "#E2E2E2",
    paddingHorizontal: vw(4),
    fontSize: fs(16),
    backgroundColor: "#F6F6F6",
    marginBottom: vh(1.5),
  },

  header: {
    fontSize: fs(18),
    fontWeight: "bold",
    color: "#000",
    opacity: 0.5,
    marginBottom: vh(1),
  },

  card: {
    padding: vw(4),
    borderRadius: vw(3),
    borderWidth: 1,
    borderColor: "#C5C5C5",
    marginBottom: vh(1.5),
  },

  deviceName: { fontSize: fs(18), fontWeight: "bold" },
  statusText: { fontSize: fs(14), color: "gray", marginTop: vh(0.5) },

  /* 🔑 DÔLEŽITÁ ČASŤ */
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vh(1.5),
  },

  progressItem: {
    width: "24%", // 4 progress bary vedľa seba
    alignItems: "center",
  },

  tankLabel: {
    marginTop: vh(0.5),
    fontSize: fs(11),
    textAlign: "center",
  },
});
