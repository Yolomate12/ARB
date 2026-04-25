import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
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

type OrgRow = {
  id_org: number;
  nazov_org: string | null;
  latitude: number | null;
  longitude: number | null;
  company_code: string | null;
  online_count: number;
  offline_count: number;
};

const ORANGE = Colors.orange?.background ?? "#F7941D";
const STICKY_THRESHOLD = 4;
const ADMIN_ROOT_ROUTE = "/(admin)/menu/items";
const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function AdminOrganizationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [rows, setRows] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const openSheet = () => {
    if (isClosing) return;

    setDetailsVisible(true);
    sheetY.setValue(SCREEN_HEIGHT);

    Animated.timing(sheetY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    if (isClosing || deleteLoading) return;

    setIsClosing(true);

    Animated.timing(sheetY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDetailsVisible(false);
      setSelectedOrg(null);
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

  const load = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("organisation_list")
      .select(
        "id_org,nazov_org,latitude,longitude,company_code,online_count,offline_count",
      )
      .order("nazov_org", { ascending: true });

    if (error) {
      console.log("organisation_list error:", error);
      setRows([]);
    } else {
      setRows((data ?? []) as OrgRow[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const hay = [r.nazov_org, String(r.id_org), r.company_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, search]);

  const sticky = filtered.length >= STICKY_THRESHOLD;

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace(ADMIN_ROOT_ROUTE);
        return true;
      };

      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => sub.remove();
    }, [router]),
  );

  const openDetails = (org: OrgRow) => {
    setSelectedOrg(org);
    openSheet();
  };

  const closeDetails = () => {
    if (deleteLoading || isClosing) return;
    closeSheet();
  };

  const confirmDeleteOrg = () => {
    if (!selectedOrg || deleteLoading) return;

    Alert.alert(
      t("deleteOrganisation") || "Delete organisation",
      `${
        t("deleteOrganisationConfirm") ||
        "Are you sure you want to delete this organisation?"
      }\n\n${selectedOrg.nazov_org ?? t("adminUnnamed")}`,
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("delete") || "Delete",
          style: "destructive",
          onPress: handleDeleteOrg,
        },
      ],
    );
  };

  const handleDeleteOrg = async () => {
    if (!selectedOrg || deleteLoading) return;

    try {
      setDeleteLoading(true);

      const orgId = selectedOrg.id_org;

      const { error: profilesError } = await supabase
        .from("profiles")
        .update({ id_org: null })
        .eq("id_org", orgId);

      if (profilesError) {
        Alert.alert(
          t("error") || "Error",
          profilesError.message || "Failed to detach profiles.",
        );
        return;
      }

      const { error: binsError } = await supabase
        .from("bin")
        .delete()
        .eq("id_org", orgId);

      if (binsError) {
        Alert.alert(
          t("error") || "Error",
          binsError.message || "Failed to delete bins.",
        );
        return;
      }

      const { error: orgError } = await supabase
        .from("organisation")
        .delete()
        .eq("id", orgId);

      if (orgError) {
        Alert.alert(
          t("error") || "Error",
          orgError.message || "Failed to delete organisation.",
        );
        return;
      }

      closeSheet();
      await load();
    } finally {
      setDeleteLoading(false);
    }
  };

  const Buttons = (
    <>
      <Pressable
        style={styles.outlineBtn}
        onPress={() => router.push("/(admin)/menu/addOrganisation")}
      >
        <Text style={styles.outlineText}>{t("adminNewOrganisation")}</Text>
      </Pressable>

      <Pressable
        style={styles.filledBtn}
        onPress={() => router.push("/(admin)/menu/addDevice")}
      >
        <Text style={styles.filledText}>{t("adminNewDevice")}</Text>
      </Pressable>
    </>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("adminOrganizationsTitle")}</Text>

      <View style={styles.searchBox}>
        <TextInput
          placeholder={t("searchPlaceholder")}
          placeholderTextColor="#A6A6A6"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <FontAwesome name="search" size={18} color="#111" />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id_org)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: sticky ? 150 : 20,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              router.push({
                pathname: "/(admin)/menu/organisation/[id_org]",
                params: {
                  id_org: String(item.id_org),
                  nazov_org: item.nazov_org ?? "",
                },
              });
            }}
            onLongPress={() => openDetails(item)}
            delayLongPress={250}
          >
            <View style={styles.leftBlock}>
              <FontAwesome name="map-marker" size={22} color="#fff" />
            </View>

            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={2}>
                {item.nazov_org ?? t("adminUnnamed")}
              </Text>

              <Text style={styles.meta}>
                {item.online_count} {t("online")}, {item.offline_count}{" "}
                {t("offline")}
              </Text>
            </View>

            <FontAwesome name="chevron-right" size={16} color="#9B9B9B" />
          </Pressable>
        )}
        ListFooterComponent={
          !sticky ? <View style={styles.footer}>{Buttons}</View> : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("adminNoOrganizations")}</Text>
          </View>
        }
      />

      {sticky && <View style={styles.stickyBar}>{Buttons}</View>}

      <Modal
        visible={detailsVisible}
        transparent
        animationType="none"
        onRequestClose={closeDetails}
      >
        <View
          style={styles.modalOverlay}
          pointerEvents={isClosing ? "none" : "auto"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeDetails} />

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

            <Text style={styles.modalTitle}>
              {selectedOrg?.nazov_org ?? t("adminUnnamed")}
            </Text>

            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>
                {t("companyCode") || "Company code"}
              </Text>
              <Text style={styles.codeValue}>
                {selectedOrg?.company_code ?? "-"}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t("online")}</Text>
                <Text style={styles.statValue}>
                  {selectedOrg?.online_count ?? 0}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t("offline")}</Text>
                <Text style={styles.statValue}>
                  {selectedOrg?.offline_count ?? 0}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={closeDetails}
                disabled={deleteLoading}
              >
                <Text style={styles.cancelBtnText}>
                  {t("cancel") || "Cancel"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.deleteBtn}
                onPress={confirmDeleteOrg}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteBtnText}>
                    {t("DeleteOrg") || "Delete bin"}
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

const { width: W, height: H } = Dimensions.get("window");

// helpers iba z width/height
const vw = (p: number) => (W * p) / 100;
const vh = (p: number) => (H * p) / 100;

// jemná typografia viazaná len na width
const fs = (base: number) => Math.max(12, (base * W) / 375);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111",
    marginBottom: 12,
  },

  searchBox: {
    height: Math.max(vh(6.2), 46),
    backgroundColor: "#F6F6F6",
    borderRadius: Math.max(vw(2.2), 8),
    borderColor: "#E2E2E2",
    borderWidth: 1,
    paddingHorizontal: vw(4.2),
    marginTop: vh(1.6),

    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginRight: 10,
    fontSize: fs(16),
    color: "black",
  },

  card: {
    height: 90,
    borderRadius: 18,
    backgroundColor: "#F6F7FB",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 14,
    overflow: "hidden",
  },

  leftBlock: {
    width: 86,
    height: "100%",
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },

  name: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },

  meta: {
    fontSize: 13,
    color: "#6F6F6F",
    fontWeight: "700",
  },

  footer: {
    marginTop: 16,
    gap: 12,
  },

  stickyBar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    gap: 12,
    backgroundColor: "#fff",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
  },

  outlineBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  outlineText: {
    color: ORANGE,
    fontWeight: "900",
    letterSpacing: 0.6,
    fontSize: 13,
  },

  filledBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  filledText: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0.6,
    fontSize: 13,
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
    minHeight: 250,
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

  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 16,
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
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },

  statCard: {
    flex: 1,
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
    fontSize: 22,
    color: "#111",
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

  deleteBtn: {
    flex: 1,
    height: 52,
    borderRadius: 0,
    backgroundColor: "#FF9627",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
});
