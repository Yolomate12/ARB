import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";

type Tank = {
  device_id: string;
  tank_id: number;
  level: number | null;
};

type DeviceRow = {
  bin_id: number; // ✅ z view
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

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ✅ modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<DeviceItem | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  const circleSize = vw(18);
  const circleWidth = vw(2);

  const fetchDevices = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    if (!Number.isFinite(idOrg)) {
      setError("Invalid organisation id");
      setDevices([]);
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);

      // ✅ 1) koše/zariadenia cez VIEW (už má bin_id)
      const { data: devData, error: devErr } = await supabase
        .from("bin_full_info")
        .select("bin_id, device_id, device_name, status")
        .eq("id_org", idOrg);

      if (devErr) throw devErr;

      const devRows = (devData ?? []) as DeviceRow[];
      const deviceIds = devRows.map((d) => String(d.device_id));

      if (deviceIds.length === 0) {
        setDevices([]);
        return;
      }

      // ✅ 2) tanky pre všetky zariadenia naraz
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

      setDevices(merged);
    } catch (e: any) {
      const msg =
        e?.code === "42501"
          ? "Nemáš práva čítať dáta (RLS)."
          : e?.message || t("errorLoadingDevices");
      setError(msg);
      setDevices([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
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

  const openModal = (item: DeviceItem) => {
    setSelected(item);
    setEditName(item.device_name);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
    setSelected(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!selected) return;

    const newName = editName.trim();
    if (!newName) {
      Alert.alert("Chyba", "Názov zariadenia nemôže byť prázdny.");
      return;
    }

    try {
      setBusy(true);

      // devices.name podľa tvojej DB
      const { error: updErr } = await supabase
        .from("devices")
        .update({ name: newName })
        .eq("id", selected.device_id);

      if (updErr) throw updErr;

      closeModal();
      await fetchDevices({ silent: true });
    } catch (e: any) {
      Alert.alert("Chyba", e?.message ?? "Nepodarilo sa uložiť zmeny.");
    } finally {
      setBusy(false);
    }
  };

  const deleteBin = async () => {
    if (!selected) return;

    Alert.alert(
      "Odobrať kôš",
      "Naozaj chceš odstrániť tento kôš? (Vymaže sa riadok z tabuľky bin.)",
      [
        { text: "Zrušiť", style: "cancel" },
        {
          text: "Odobrať",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);

              // ✅ správne: delete podľa bin.id
              const { data: deleted, error: delErr } = await supabase
                .from("bin")
                .delete()
                .eq("id", selected.bin_id)
                .select("id");

              if (delErr) throw delErr;

              const deletedCount = deleted?.length ?? 0;
              if (deletedCount === 0) {
                Alert.alert(
                  "Nezmazalo sa nič",
                  "Delete vrátil 0 riadkov. Skontroluj RLS policy na bin.",
                );
                return;
              }

              closeModal();
              await fetchDevices({ silent: true });
            } catch (e: any) {
              Alert.alert(
                "Chyba",
                e?.message ?? "Nepodarilo sa vymazať z bin.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ORANGE} />
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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: orgName || "Organizácia",
          headerBackTitle: "Späť",
        }}
      />

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
          <Pressable style={styles.card} onPress={() => openModal(item)}>
            <Text style={styles.deviceName}>{item.device_name}</Text>
            <Text style={styles.statusText}>
              {t("statusLabel")}: {item.status}
            </Text>

            <View style={styles.progressRow}>
              {normalizeTanks(item.tanks).map((tank) => {
                const fill = clampPercent(tank.level);
                return (
                  <View key={tank.tank_id} style={styles.progressItem}>
                    <AnimatedCircularProgress
                      size={circleSize}
                      width={circleWidth}
                      fill={fill}
                      tintColor={TANK_COLORS[tank.tank_id] ?? ORANGE}
                      backgroundColor="#FFE5B4"
                    >
                      {() => <Text style={{ fontSize: fs(12) }}>{fill}%</Text>}
                    </AnimatedCircularProgress>

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

      {/* ✅ MODAL */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Kôš / zariadenie</Text>

            <Text style={styles.modalLabel}>Názov zariadenia</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={styles.modalInput}
              editable={!busy}
              placeholder="Názov"
              placeholderTextColor="#999"
            />

            <View style={styles.modalRow}>
              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalBtnGhost,
                  busy && { opacity: 0.6 },
                ]}
                onPress={closeModal}
                disabled={busy}
              >
                <Text style={styles.modalBtnGhostText}>Zrušiť</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  busy && { opacity: 0.6 },
                ]}
                onPress={saveEdit}
                disabled={busy}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {busy ? "Ukladám..." : "Uložiť"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.modalDanger, busy && { opacity: 0.6 }]}
              onPress={deleteBin}
              disabled={busy}
            >
              <Text style={styles.modalDangerText}>
                Odobrať kôš z organizácie
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    opacity: 0.6,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
    color: "#111",
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#333",
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: "#F6F6F6",
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: "#DADADA",
    backgroundColor: "#fff",
  },
  modalBtnGhostText: {
    fontWeight: "900",
    color: "#111",
  },
  modalBtnPrimary: {
    backgroundColor: ORANGE,
  },
  modalBtnPrimaryText: {
    fontWeight: "900",
    color: "#fff",
  },
  modalDanger: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  modalDangerText: {
    color: "#fff",
    fontWeight: "900",
  },
});
