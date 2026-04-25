import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
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
const SCREEN_HEIGHT = Dimensions.get("window").height;

const { width: W, height: H } = Dimensions.get("window");
const vw = (p: number) => (W * p) / 100;
const vh = (p: number) => (H * p) / 100;
const fs = (b: number) => Math.max(12, (b * W) / 375);

const getTankColor = (value: number, isOnline: boolean) => {
  if (!isOnline) return "#BDBDBD";

  if (value <= 25) return "#2ECC71"; // zelená
  if (value <= 79) return "#F7941D"; // oranžová
  return "#FF3B30"; // červená
};
const TANK_TYPE_KEYS: Record<
  number,
  "tankPlastic" | "tankPaper" | "tankMetal" | "tankMixed"
> = {
  1: "tankMetal",
  2: "tankPaper",
  3: "tankPlastic",
  4: "tankMixed",
};

const TANK_COLORS: Record<number, string> = {
  1: "#ffdd00",
  2: "#0048ff",
  3: "#FFA500",
  4: "#FF0000",
};

const TANK_IDS = [1, 2, 3, 4] as const;

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

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<DeviceItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const circleSize = vw(18);
  const circleWidth = Math.max(2, vw(2));

  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const openSheet = () => {
    if (isClosing) return;

    setModalOpen(true);
    sheetY.setValue(SCREEN_HEIGHT);

    Animated.timing(sheetY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    if (isClosing || busy) return;

    setIsClosing(true);

    Animated.timing(sheetY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setModalOpen(false);
      setSelected(null);
      sheetY.setValue(SCREEN_HEIGHT);
      setIsClosing(false);
    });
  };

  const resetSheet = () => {
    Animated.spring(sheetY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const sheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_evt, g) => {
        if (g.dy > 0) {
          sheetY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_evt, g) => {
        if (g.dy > 120 || g.vy > 1.2) {
          closeSheet();
        } else {
          resetSheet();
        }
      },
      onPanResponderTerminate: () => {
        resetSheet();
      },
    }),
  ).current;

  const fetchDevices = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    if (!Number.isFinite(idOrg)) {
      setError(t("invalidOrganisationId"));
      setDevices([]);
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);

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
          device_name: d.device_name ?? t("noName"),
          status: (d.status ?? "offline").toString(),
          tanks: tanksByDevice.get(did) ?? [],
        };
      });

      setDevices(merged);
    } catch (e: any) {
      const msg =
        e?.code === "42501"
          ? t("noPermissionsRlsRead")
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
    openSheet();
  };

  const closeModal = () => {
    if (busy || isClosing) return;
    closeSheet();
  };

  const deleteBin = async () => {
    if (!selected) return;

    Alert.alert(t("removeBinTitle"), t("removeBinConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("remove"),
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);

            const { data: deleted, error: delErr } = await supabase
              .from("bin")
              .delete()
              .eq("id", selected.bin_id)
              .select("id");

            if (delErr) throw delErr;

            const deletedCount = deleted?.length ?? 0;
            if (deletedCount === 0) {
              Alert.alert(t("nothingDeletedTitle"), t("nothingDeletedBody"));
              return;
            }

            closeSheet();
            await fetchDevices({ silent: true });
          } catch (e: any) {
            Alert.alert(t("errorTitle"), e?.message ?? t("errorDeletingBin"));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
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
          title: orgName || t("organisation"),
          headerBackTitle: t("back"),
        }}
      />

      <TextInput
        placeholder={t("searchDevice")}
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        placeholderTextColor="#999"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />

      <Text style={styles.header}>
        {orgName || `${t("organisationId")}: ${idOrg}`}
      </Text>

      <FlatList
        data={filteredDevices}
        keyExtractor={(i) => `${i.bin_id}-${i.device_id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: vh(3) }}
        renderItem={({ item }) => {
          const isOnline = item.status === "online";

          return (
            <Pressable
              style={[
                styles.card,
                isOnline ? styles.cardOnline : styles.cardOffline,
              ]}
              onPress={() => openModal(item)}
            >
              <View style={styles.cardTopRow}>
                <Text
                  style={[styles.deviceName, !isOnline && styles.offlineText]}
                >
                  {item.device_name}
                </Text>

                <View style={styles.statusPill}>
                  <View
                    style={[
                      styles.statusDot,
                      isOnline ? styles.dotOnline : styles.dotOffline,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      !isOnline && styles.offlineText,
                    ]}
                  >
                    {isOnline ? "Online" : "Offline"}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.statusText, !isOnline && styles.offlineSubText]}
              >
                {t("statusLabel")}: {item.status}
              </Text>

              <View
                style={[styles.progressRow, !isOnline && styles.offlineRow]}
              >
                {normalizeTanks(item.tanks).map((tank) => {
                  const fill = clampPercent(tank.level);

                  // 👇 TU JE ZMENA
                  const color = getTankColor(fill, isOnline);

                  const labelKey = TANK_TYPE_KEYS[tank.tank_id] ?? "tankMixed";

                  return (
                    <View key={tank.tank_id} style={styles.progressItem}>
                      <AnimatedCircularProgress
                        size={circleSize}
                        width={circleWidth}
                        fill={fill}
                        tintColor={color}
                        backgroundColor={isOnline ? "#FFE5B4" : "#E6E6E6"}
                        rotation={0}
                        lineCap="round"
                      >
                        {() => (
                          <Text
                            style={[
                              styles.progressValue,
                              !isOnline && styles.offlineText,
                            ]}
                          >
                            {fill}%
                          </Text>
                        )}
                      </AnimatedCircularProgress>

                      <Text
                        style={[
                          styles.tankLabel,
                          !isOnline && styles.offlineSubText,
                        ]}
                      >
                        {t(labelKey)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("noDevicesInOrganisation")}</Text>
          </View>
        }
      />

      <Modal
        visible={modalOpen}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View
          style={styles.modalOverlay}
          pointerEvents={isClosing ? "none" : "auto"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <View style={styles.dragArea} {...sheetPan.panHandlers}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>{t("deviceNameLabel")}</Text>
              <Text style={styles.codeValue}>
                {selected?.device_name ?? t("noName")}
              </Text>
            </View>

            <View style={styles.infoStack}>
              <View style={styles.statCardFull}>
                <Text style={styles.statLabel}>{t("statusLabel")}</Text>
                <Text style={styles.statValue}>{selected?.status ?? "-"}</Text>
              </View>

              <View style={styles.statCardFull}>
                <Text style={styles.statLabel}>ID</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {selected?.device_id ?? "-"}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={closeModal}
                disabled={busy}
              >
                <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, busy && { opacity: 0.6 }]}
                onPress={deleteBin}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    {t("removeBinTitle")}
                  </Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
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

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  error: {
    color: "red",
    fontSize: fs(16),
    textAlign: "center",
    paddingHorizontal: 16,
  },

  searchInput: {
    height: Math.max(vh(6.2), 46),
    backgroundColor: "#F6F6F6",
    borderRadius: Math.max(vw(2.2), 8),
    borderColor: "#E2E2E2",
    borderWidth: 1,
    paddingHorizontal: vw(4.2),
    marginTop: vh(1.6),
    marginBottom: vh(1.6),
    color: "black",
    fontSize: fs(16),
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

  cardOnline: {
    backgroundColor: "white",
  },

  cardOffline: {
    backgroundColor: "#F3F3F3",
    opacity: 0.85,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },

  dotOnline: {
    backgroundColor: "#2ECC71",
  },

  dotOffline: {
    backgroundColor: "#9E9E9E",
  },

  statusPillText: {
    fontSize: fs(12),
    fontWeight: "800",
    color: "#111",
  },

  offlineText: {
    color: "#777",
  },

  offlineSubText: {
    color: "#888",
  },

  deviceName: {
    fontSize: fs(18),
    fontWeight: "bold",
  },

  statusText: {
    fontSize: fs(14),
    color: "gray",
    marginTop: vh(0.5),
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vh(1.5),
  },

  offlineRow: {
    opacity: 0.9,
  },

  progressItem: {
    width: "24%",
    alignItems: "center",
  },

  progressValue: {
    fontSize: fs(12),
    fontWeight: "900",
  },

  tankLabel: {
    marginTop: vh(0.5),
    fontSize: fs(11),
    textAlign: "center",
  },

  emptyWrap: {
    paddingTop: 40,
    alignItems: "center",
  },

  emptyText: {
    color: "#777",
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  modalBackdrop: {
    flex: 1,
  },

  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 18,
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },

  dragArea: {
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: "center",
  },

  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D7D7DC",
  },

  codeCard: {
    backgroundColor: "#FF9627",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: "#FF9627",
  },

  codeLabel: {
    fontSize: 13,
    color: "white",
    fontWeight: "800",
    marginBottom: 4,
  },

  codeValue: {
    fontSize: 20,
    color: "white",
    fontWeight: "900",
  },

  infoStack: {
    gap: 12,
    marginBottom: 20,
  },

  statCardFull: {
    backgroundColor: "white",
    borderColor: "#FF9627",
    borderWidth: 1.2,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },

  statLabel: {
    fontSize: 13,
    color: "#6F6F6F",
    fontWeight: "700",
    marginBottom: 6,
  },

  statValue: {
    fontSize: 16,
    color: "#111",
    flexWrap: "nowrap",
    fontWeight: "900",
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },

  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: "#FF9627",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  cancelBtnText: {
    color: "#FF9627",
    fontWeight: "800",
    fontSize: 15,
  },

  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 0,
    backgroundColor: "#FF9627",
    alignItems: "center",
    justifyContent: "center",
  },

  actionBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
});
