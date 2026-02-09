import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

type TankRow = {
  device_id: string;
  tank_id: number | string;
  level: number | string | null;
};

type DeviceRow = {
  device_id: string;
  device_name: string | null;
  status: string | null;
};

type Tank = {
  tank_id: number;
  level: number; // ✅ vždy number 0..100
};

type DeviceItem = {
  device_id: string;
  device_name: string;
  status: string;
  tanks: Tank[]; // ✅ vždy 4 tanky
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

const TANK_IDS = [1, 2, 3, 4] as const;

const { width: W, height: H } = Dimensions.get("window");
const vw = (p: number) => (W * p) / 100;
const vh = (p: number) => (H * p) / 100;
const fs = (b: number) => Math.max(12, (b * W) / 375);

const firstParam = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const clampPercent = (v: unknown): number => {
  // zvládne number, "42", "42.5", null, undefined
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const normalizeTanks = (tanks: Tank[]): Tank[] => {
  const map = new Map<number, Tank>();
  for (const t of tanks) map.set(t.tank_id, t);
  return TANK_IDS.map((id) => map.get(id) ?? { tank_id: id, level: 0 });
};

export default function StreetDevicesScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ city?: string; street?: string }>();
  const { profile } = useAuth();

  const city = (firstParam(params.city) ?? "").trim();
  const street = (firstParam(params.street) ?? "").trim();
  const orgId = profile?.id_org ?? null;

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const canQuery = !!city && !!street && !!orgId;

  const fetchDevices = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    if (!canQuery) {
      if (!silent) setLoading(false);
      setDevices([]);
      setError(!orgId ? "Chýba organizácia v profile." : "Neplatná adresa.");
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);

      // 1) devices
      const { data: devData, error: devErr } = await supabase
        .from("bin_full_info")
        .select("device_id, device_name, status")
        .eq("name_city", city)
        .eq("name_street", street)
        .eq("id_org", orgId);

      if (devErr) throw devErr;

      const devRows = (devData ?? []) as DeviceRow[];
      const deviceIds = devRows.map((d) => String(d.device_id));

      // DEBUG: zistíš, či vôbec niečo fetchuješ
      // eslint-disable-next-line no-console
      console.log("USER DEVICES DEBUG", {
        city,
        street,
        orgId,
        count: deviceIds.length,
      });

      if (deviceIds.length === 0) {
        setDevices([]);
        return;
      }

      // 2) tank_status pre všetky deviceIds naraz
      const { data: tankData, error: tankErr } = await supabase
        .from("tank_status")
        .select("device_id, tank_id, level")
        .in("device_id", deviceIds);

      if (tankErr) throw tankErr;

      const tankRows = (tankData ?? []) as TankRow[];

      // DEBUG: ak je 0, je to RLS/join problém
      // eslint-disable-next-line no-console
      console.log("USER TANKS DEBUG", {
        tankRows: tankRows.length,
        sample: tankRows.slice(0, 3),
      });

      // group tanks
      const tanksByDevice = new Map<string, Tank[]>();
      for (const tr of tankRows) {
        const did = String(tr.device_id);
        const arr = tanksByDevice.get(did) ?? [];
        arr.push({
          tank_id: Number(tr.tank_id),
          level: clampPercent(tr.level),
        });
        tanksByDevice.set(did, arr);
      }

      const merged: DeviceItem[] = devRows.map((d) => {
        const did = String(d.device_id);
        const raw = tanksByDevice.get(did) ?? [];
        return {
          device_id: did,
          device_name: (d.device_name ?? "Bez názvu").toString(),
          status: (d.status ?? "unknown").toString(),
          tanks: normalizeTanks(raw),
        };
      });

      setDevices(merged);
    } catch (e: any) {
      setError(e?.message || t("errorLoadingDevices"));
      setDevices([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, street, orgId]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => d.device_name.toLowerCase().includes(q));
  }, [search, devices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDevices({ silent: true });
    setRefreshing(false);
  };

  const circleSize = vw(18);
  const circleWidth = Math.max(2, vw(2));

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
        <Pressable style={styles.retryBtn} onPress={() => fetchDevices()}>
          <Text style={styles.retryBtnText}>Skúsiť znova</Text>
        </Pressable>
      </View>
    );
  }

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
        ... / {city || "-"} / {street || "-"}
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

            <View style={styles.progressRow}>
              {item.tanks.map((tank) => {
                const fill = tank.level; // ✅ už je clampnuté
                const color = TANK_COLORS[tank.tank_id] ?? "#FF9627";
                const labelKey = TANK_TYPE_KEYS[tank.tank_id] ?? "tankMixed";

                return (
                  <View key={tank.tank_id} style={styles.progressItem}>
                    <AnimatedCircularProgress
                      size={circleSize}
                      width={circleWidth}
                      fill={fill}
                      tintColor={color}
                      backgroundColor="#FFE5B4"
                      rotation={0}
                      lineCap="round"
                    >
                      {() => (
                        <Text style={{ fontSize: fs(12), fontWeight: "900" }}>
                          {fill}%
                        </Text>
                      )}
                    </AnimatedCircularProgress>

                    <Text style={styles.tankLabel}>{t(labelKey)}</Text>
                  </View>
                );
              })}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: "#777", fontWeight: "600" }}>
              Žiadne zariadenia
            </Text>
          </View>
        }
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
  error: { color: "red", fontSize: fs(16), textAlign: "center" },

  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  retryBtnText: { color: "#fff", fontWeight: "900" },

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

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vh(1.5),
  },

  progressItem: {
    width: "24%",
    alignItems: "center",
  },

  tankLabel: {
    marginTop: vh(0.5),
    fontSize: fs(11),
    textAlign: "center",
  },
});
