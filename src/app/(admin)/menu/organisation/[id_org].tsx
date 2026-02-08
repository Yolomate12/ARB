import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

type Tank = {
  device_id: string;
  tank_id: number;
  level: number | null;
};

type DeviceRow = {
  bin_id: number;
  device_id: string;
  device_name: string | null;
  status: string | null;
};

type DeviceItem = {
  bin_id: number;
  device_id: string;
  device_name: string;
  status: string;
  tanks: { tank_id: number; level: number | null }[];
};

const ORANGE = Colors.orange?.background ?? "#F7941D";

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

const clampPercent = (v: number | null | undefined) => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const normalizeTanks = (tanks: { tank_id: number; level: number | null }[]) => {
  const map = new Map<number, { tank_id: number; level: number | null }>();
  for (const t of tanks) map.set(t.tank_id, t);
  return TANK_IDS.map((id) => map.get(id) ?? { tank_id: id, level: 0 });
};

export default function AdminOrganisationDevicesScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  const params = useLocalSearchParams<{
    id_org?: string;
    nazov_org?: string;
  }>();

  const idOrgStr = Array.isArray(params.id_org)
    ? params.id_org[0]
    : params.id_org;
  const orgNameStr = Array.isArray(params.nazov_org)
    ? params.nazov_org[0]
    : params.nazov_org;

  const idOrg = idOrgStr ? Number(idOrgStr) : NaN;
  const orgName = (orgNameStr ?? "").trim();
  const isValidOrg = !!idOrgStr && Number.isFinite(idOrg);

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ✅ zabráni setState po unmount (už si to mal, nechávam)
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const safeSet = (fn: () => void) => {
    if (aliveRef.current) fn();
  };

  // ✅ KRITICKÉ: nepoužívaj router.back() -> robí pop/removal transition
  const goBackSafe = () => {
    router.replace("/(admin)/menu/organisation/index");
  };

  const fetchDevices = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    if (!isValidOrg) {
      safeSet(() => {
        setDevices([]);
        setError("Invalid organisation id");
        setLoading(false);
      });
      return;
    }

    try {
      if (!silent) safeSet(() => setLoading(true));
      safeSet(() => setError(null));

      const { data: devData, error: devErr } = await supabase
        .from("bin_full_info")
        .select("bin_id, device_id, device_name, status")
        .eq("id_org", idOrg);

      if (devErr) throw devErr;

      const devRows = (devData ?? []) as DeviceRow[];
      const deviceIds = devRows.map((d) => String(d.device_id));

      if (deviceIds.length === 0) {
        safeSet(() => setDevices([]));
        return;
      }

      const { data: tankData, error: tankErr } = await supabase
        .from("tank_status")
        .select("device_id, tank_id, level")
        .in("device_id", deviceIds);

      if (tankErr) throw tankErr;

      const tanks = (tankData ?? []) as Tank[];

      const tanksByDevice = new Map<
        string,
        { tank_id: number; level: number | null }[]
      >();
      for (const tk of tanks) {
        const did = String(tk.device_id);
        const arr = tanksByDevice.get(did) ?? [];
        arr.push({ tank_id: tk.tank_id, level: tk.level });
        tanksByDevice.set(did, arr);
      }

      const merged: DeviceItem[] = devRows.map((d) => {
        const did = String(d.device_id);
        return {
          bin_id: Number(d.bin_id),
          device_id: did,
          device_name: d.device_name ?? "Bez názvu",
          status: d.status ?? "unknown",
          tanks: tanksByDevice.get(did) ?? [],
        };
      });

      safeSet(() => setDevices(merged));
    } catch (e: any) {
      const msg =
        e?.code === "42501"
          ? "Nemáš práva čítať dáta (RLS)."
          : e?.message || t("errorLoadingDevices");
      safeSet(() => {
        setError(msg);
        setDevices([]);
      });
    } finally {
      if (!silent) safeSet(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (isValidOrg) fetchDevices();
    else {
      setLoading(false);
      setDevices([]);
      setError("Invalid organisation id");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOrgStr]);

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

  // ✅ iba JEDEN Stack.Screen – nehádzaj ho do viacerých branchov
  return (
    <View
      style={
        loading || error || !isValidOrg ? styles.centered : styles.container
      }
    >
      <Stack.Screen
        options={{
          title: orgName || "Organizácia",
          headerBackTitle: "Späť",
          animation: "none",
          gestureEnabled: false,

          // ✅ tieto dva často zmenia timing removalu
          detachPreviousScreen: false,
          freezeOnBlur: false,

          headerLeft: () => (
            <Pressable
              onPress={goBackSafe}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ fontWeight: "900" }}>{"‹"}</Text>
            </Pressable>
          ),
        }}
      />

      {!isValidOrg ? (
        <>
          <Text style={styles.error}>Neplatné ID organizácie.</Text>
          <Pressable onPress={goBackSafe} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Späť na zoznam</Text>
          </Pressable>
        </>
      ) : loading ? (
        <ActivityIndicator size="large" color={ORANGE} />
      ) : error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => fetchDevices()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Skúsiť znova</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            placeholder={t("searchDevice")}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#999"
          />

          <Text style={styles.header}>{orgName || `ID: ${idOrg}`}</Text>

          <FlatList
            data={filteredDevices}
            keyExtractor={(i) => `${i.bin_id}-${i.device_id}`}
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
                  {normalizeTanks(item.tanks).map((tank) => {
                    const fill = clampPercent(tank.level);
                    const color = TANK_COLORS[tank.tank_id] ?? ORANGE;

                    return (
                      <View key={tank.tank_id} style={styles.progressItem}>
                        <Text style={styles.percentText}>{fill}%</Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${fill}%`, backgroundColor: color },
                            ]}
                          />
                        </View>
                        <Text style={styles.tankLabel}>
                          {t(TANK_TYPE_KEYS[tank.tank_id] ?? "tankMixed")}
                        </Text>
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
        </>
      )}
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
  error: {
    color: "red",
    fontSize: fs(16),
    textAlign: "center",
    paddingHorizontal: 16,
  },

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
    width: "100%",
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

  percentText: {
    fontSize: fs(12),
    fontWeight: "900",
    marginBottom: vh(0.4),
  },

  barTrack: {
    width: "100%",
    height: vh(1.1),
    borderRadius: vw(2),
    backgroundColor: "#FFE5B4",
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: vw(2),
  },

  tankLabel: {
    marginTop: vh(0.5),
    fontSize: fs(11),
    textAlign: "center",
  },
});
