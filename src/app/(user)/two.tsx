import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useRouter } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  DevSettings,
  Image,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/* =====================
   TYPES
===================== */
type DeviceStatus = {
  onlineCount: number;
  offlineCount: number;
};

type Bin = {
  bin_id: number;
  id_org: number;
  nazov_org: string | null;
  status: string | null;
  naplnenie: number | string | null;
  name_street: string | null;
  name_city: string | null;
};

/* =====================
   COMPONENT
===================== */
export default function TabTwoScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();

  const [organizationName, setOrganizationName] = useState("—");
  const [loading, setLoading] = useState(true);

  // pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    onlineCount: 0,
    offlineCount: 0,
  });

  const [binsOverLimit, setBinsOverLimit] = useState<Bin[]>([]);

  // ---- Notifications sheet state
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsMounted, setNotificationsMounted] = useState(false);

  // ---- Join company sheet state
  const [joinVisible, setJoinVisible] = useState(false);
  const [joinMounted, setJoinMounted] = useState(false);

  // ---- Language sheet state
  const [langVisible, setLangVisible] = useState(false);
  const [langMounted, setLangMounted] = useState(false);

  // shared: block clicks while closing any sheet
  const [isClosing, setIsClosing] = useState(false);

  // Join company form
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // držíme poslednú org id (kvôli “wait” po join)
  const [currentOrgId, setCurrentOrgId] = useState<number | null>(null);

  /* =====================
     ANIMATIONS (3 sheets)
  ===================== */
  const notifY = useRef(new Animated.Value(0)).current;
  const joinY = useRef(new Animated.Value(0)).current;
  const langY = useRef(new Animated.Value(0)).current;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const finishClose = (
    setVisible: (v: boolean) => void,
    setMounted: (v: boolean) => void,
    translateY: Animated.Value,
  ) => {
    setVisible(false);
    setTimeout(() => {
      setMounted(false);
      translateY.setValue(0);
      setIsClosing(false);
    }, 60);
  };

  const reloadWholeApp = async () => {
    if (__DEV__) {
      DevSettings.reload();
      return;
    }
    try {
      await Updates.reloadAsync();
    } catch {
      router.replace("/(user)/menu");
    }
  };

  /* =====================
     LOGOUT
  ===================== */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setTimeout(() => {
        reloadWholeApp();
      }, 100);
    }
  };

  /* =====================
     NOTIFICATIONS SHEET
  ===================== */
  const openNotifications = () => {
    if (isClosing) return;
    setNotificationsMounted(true);
    notifY.setValue(0);
    setNotificationsVisible(true);
  };

  const closeNotifications = () => {
    if (isClosing) return;
    setIsClosing(true);

    Animated.timing(notifY, {
      toValue: 700,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      finishClose(setNotificationsVisible, setNotificationsMounted, notifY);
    });
  };

  const resetNotifications = () => {
    Animated.spring(notifY, { toValue: 0, useNativeDriver: true }).start();
  };

  const notifPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, g) => {
        if (g.dy > 0) notifY.setValue(g.dy);
      },
      onPanResponderRelease: (_evt, g) => {
        if (g.dy > 120) closeNotifications();
        else resetNotifications();
      },
    }),
  ).current;

  /* =====================
     JOIN SHEET
  ===================== */
  const openJoin = () => {
    if (isClosing) return;
    setJoinError(null);
    setJoinCode("");
    setJoinMounted(true);
    joinY.setValue(0);
    setJoinVisible(true);
  };

  const closeJoin = () => {
    if (isClosing) return;
    setIsClosing(true);

    Animated.timing(joinY, {
      toValue: 700,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      finishClose(setJoinVisible, setJoinMounted, joinY);
    });
  };

  const resetJoin = () => {
    Animated.spring(joinY, { toValue: 0, useNativeDriver: true }).start();
  };

  const joinPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, g) => {
        if (g.dy > 0) joinY.setValue(g.dy);
      },
      onPanResponderRelease: (_evt, g) => {
        if (g.dy > 120) closeJoin();
        else resetJoin();
      },
    }),
  ).current;

  /* =====================
     LANGUAGE SHEET
  ===================== */
  const openLang = () => {
    if (isClosing) return;
    setLangMounted(true);
    langY.setValue(0);
    setLangVisible(true);
  };

  const closeLang = () => {
    if (isClosing) return;
    setIsClosing(true);

    Animated.timing(langY, {
      toValue: 700,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      finishClose(setLangVisible, setLangMounted, langY);
    });
  };

  const resetLang = () => {
    Animated.spring(langY, { toValue: 0, useNativeDriver: true }).start();
  };

  const langPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, g) => {
        if (g.dy > 0) langY.setValue(g.dy);
      },
      onPanResponderRelease: (_evt, g) => {
        if (g.dy > 120) closeLang();
        else resetLang();
      },
    }),
  ).current;

  const handleChangeLanguage = async (next: "sk" | "en") => {
    if (next === lang) return;

    await setLang(next);

    closeLang();
    setTimeout(() => {
      reloadWholeApp();
    }, 200);
  };

  /* =====================
     HELPERS
  ===================== */
  const fetchProfileOrgId = async (): Promise<number | null> => {
    if (!session?.user?.id) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id_org")
      .eq("id", session.user.id)
      .single();

    if (error) return null;
    return profile?.id_org ?? null;
  };

  /* =====================
     JOIN COMPANY RPC (WAIT + RELOAD)
  ===================== */
  const handleJoinCompany = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    const beforeOrgId = currentOrgId;

    setJoinLoading(true);
    setJoinError(null);

    const { error } = await supabase.rpc("join_company", { p_code: code });

    setJoinLoading(false);

    if (error) {
      setJoinError(error.message);
      return;
    }

    closeJoin();

    let newOrgId: number | null = null;
    for (let i = 0; i < 12; i++) {
      await sleep(250);
      newOrgId = await fetchProfileOrgId();
      if (newOrgId && newOrgId !== beforeOrgId) break;
    }

    if (!newOrgId || newOrgId === beforeOrgId) {
      setJoinError(
        "Firma sa pripojila, ale profiles.id_org sa nezmenilo. Skontroluj join_company, či aktualizuje profiles.id_org.",
      );
      setJoinMounted(true);
      joinY.setValue(0);
      setJoinVisible(true);
      return;
    }

    setCurrentOrgId(newOrgId);

    setTimeout(() => {
      reloadWholeApp();
    }, 200);
  };

  /* =====================
     FETCH DATA
  ===================== */
  const refetch = async (opts?: { silent?: boolean }) => {
    if (!session?.user?.id) return;

    const silent = opts?.silent ?? false;

    if (!silent) setLoading(true);
    try {
      const orgId = await fetchProfileOrgId();
      setCurrentOrgId(orgId);

      if (!orgId) {
        setOrganizationName("—");
        setDeviceStatus({ onlineCount: 0, offlineCount: 0 });
        setBinsOverLimit([]);
        return;
      }

      const { data: bins } = await supabase
        .from("bin_full_info")
        .select(
          `
          bin_id,
          id_org,
          nazov_org,
          status,
          naplnenie,
          name_street,
          name_city
        `,
        )
        .eq("id_org", orgId);

      if (!bins || bins.length === 0) {
        setOrganizationName("—");
        setDeviceStatus({ onlineCount: 0, offlineCount: 0 });
        setBinsOverLimit([]);
        return;
      }

      setOrganizationName(bins[0]?.nazov_org ?? "Neznáma organizácia");

      setDeviceStatus({
        onlineCount: bins.filter((b) => b.status === "online").length,
        offlineCount: bins.filter((b) => b.status === "offline").length,
      });

      setBinsOverLimit(bins.filter((b) => Number(b.naplnenie ?? 0) >= 80));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // pull-to-refresh
  const onRefresh = async () => {
    // ak je otvorený nejaký sheet, nerefreshuj (aby sa nebilo s gestami)
    if (notificationsMounted || joinMounted || langMounted) return;

    setRefreshing(true);
    try {
      await refetch({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  /* =====================
     UI
  ===================== */
  return (
    <ScrollView
      style={{ flex: 1, width: "100%" }}
      contentContainerStyle={styles.container}
      alwaysBounceVertical
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={require("@assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={() => router.replace("/(user)/menu")}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* vlastný indikátor - viditeľný vždy pri refresh */}
      {refreshing && (
        <View style={styles.refreshRow}>
          <ActivityIndicator />
          <Text style={styles.refreshText}>Reloadujem…</Text>
        </View>
      )}

      <Text style={styles.section}>{t("options")}</Text>

      <Text style={styles.organization}>
        {loading ? "Načítavam…" : organizationName}
      </Text>

      {/* DEVICES */}
      <TouchableOpacity style={styles.listItem}>
        <View>
          <Text style={styles.listTitle}>{t("devices")}</Text>
          <Text style={styles.listSubtitle}>
            {t("online")}: {deviceStatus.onlineCount} · {t("offline")}:{" "}
            {deviceStatus.offlineCount}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* NOTIFICATIONS */}
      <TouchableOpacity
        style={styles.listItem}
        onPress={openNotifications}
        disabled={isClosing}
      >
        <View>
          <Text style={styles.listTitle}>{t("notifications")}</Text>
          <Text style={styles.listSubtitle}>{t("binsOver80")}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* JOIN COMPANY */}
      <TouchableOpacity
        style={styles.listItem}
        onPress={openJoin}
        disabled={isClosing}
      >
        <View>
          <Text style={styles.listTitle}>{t("joinCompany")}</Text>
          <Text style={styles.listSubtitle}>{t("joinSubtitle")}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* LANGUAGE */}
      <TouchableOpacity
        style={styles.listItem}
        onPress={openLang}
        disabled={isClosing}
      >
        <View>
          <Text style={styles.listTitle}>{t("language")}</Text>
          <Text style={styles.listSubtitle}>
            {lang === "sk" ? t("slovak") : t("english")}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* LOGOUT */}
      <TouchableOpacity
        style={[styles.listItem, styles.logoutItem]}
        onPress={handleLogout}
        disabled={isClosing}
      >
        <View>
          <Text style={[styles.listTitle, styles.logoutTitle]}>
            Odhlásiť sa
          </Text>
          <Text style={styles.listSubtitle}>Odhlásiť sa z účtu</Text>
        </View>
        <Text style={[styles.chevron, styles.logoutChevron]}>›</Text>
      </TouchableOpacity>

      {/* =====================
         NOTIFICATIONS SHEET
      ===================== */}
      {notificationsMounted && (
        <Modal
          visible={notificationsVisible}
          animationType="none"
          transparent
          onRequestClose={closeNotifications}
        >
          <View
            style={styles.modalWrapper}
            pointerEvents={isClosing ? "none" : "auto"}
          >
            <Pressable style={{ flex: 1 }} onPress={closeNotifications} />
            <Animated.View
              style={[
                styles.bottomModalBox,
                { transform: [{ translateY: notifY }] },
              ]}
            >
              <View style={styles.handleTouchArea} {...notifPan.panHandlers}>
                <View style={styles.modalHandle} />
              </View>

              <Text style={styles.modalTitle}>{t("binsOver80")}</Text>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {binsOverLimit.length === 0 ? (
                  <Text style={styles.emptyText}>{t("noneOver80")}</Text>
                ) : (
                  binsOverLimit.map((bin) => (
                    <View key={bin.bin_id} style={styles.binItem}>
                      <Text style={styles.binName}>
                        {bin.name_street ?? "—"}
                      </Text>
                      <Text style={styles.binLocation}>
                        {bin.name_city ?? ""}
                      </Text>
                      <Text style={styles.binPercent}>
                        {Math.round(Number(bin.naplnenie ?? 0))} %
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* =====================
         JOIN COMPANY SHEET
      ===================== */}
      {joinMounted && (
        <Modal
          visible={joinVisible}
          animationType="none"
          transparent
          onRequestClose={closeJoin}
        >
          <View
            style={styles.modalWrapper}
            pointerEvents={isClosing ? "none" : "auto"}
          >
            <Pressable style={{ flex: 1 }} onPress={closeJoin} />
            <Animated.View
              style={[
                styles.bottomModalBox,
                { transform: [{ translateY: joinY }] },
              ]}
            >
              <View style={styles.handleTouchArea} {...joinPan.panHandlers}>
                <View style={styles.modalHandle} />
              </View>

              <Text style={styles.modalTitle}>{t("joinTitle")}</Text>

              <TextInput
                style={styles.joinInput}
                placeholder={t("joinPlaceholder")}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                maxLength={6}
              />

              {joinError ? (
                <Text style={styles.joinError}>{joinError}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.joinButton}
                onPress={handleJoinCompany}
                disabled={joinLoading}
              >
                {joinLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.joinButtonText}>{t("joinButton")}</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.joinHint}>{t("pullDownToClose")}</Text>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* =====================
         LANGUAGE SHEET
      ===================== */}
      {langMounted && (
        <Modal
          visible={langVisible}
          animationType="none"
          transparent
          onRequestClose={closeLang}
        >
          <View
            style={styles.modalWrapper}
            pointerEvents={isClosing ? "none" : "auto"}
          >
            <Pressable style={{ flex: 1 }} onPress={closeLang} />
            <Animated.View
              style={[
                styles.bottomModalBox,
                { transform: [{ translateY: langY }] },
              ]}
            >
              <View style={styles.handleTouchArea} {...langPan.panHandlers}>
                <View style={styles.modalHandle} />
              </View>

              <Text style={styles.modalTitle}>{t("languageTitle")}</Text>

              <TouchableOpacity
                style={[styles.langRow, lang === "sk" && styles.langRowActive]}
                onPress={() => handleChangeLanguage("sk")}
              >
                <Text style={styles.langText}>{t("slovak")}</Text>
                <Text style={styles.langCheck}>{lang === "sk" ? "✓" : ""}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langRow, lang === "en" && styles.langRowActive]}
                onPress={() => handleChangeLanguage("en")}
              >
                <Text style={styles.langText}>{t("english")}</Text>
                <Text style={styles.langCheck}>{lang === "en" ? "✓" : ""}</Text>
              </TouchableOpacity>

              <Text style={styles.joinHint}>{t("pullDownToClose")}</Text>
            </Animated.View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 50,
    alignItems: "center",
    backgroundColor: "white",
    paddingBottom: 24,
  },
  header: {
    width: "100%",
    paddingTop: 14,
    paddingHorizontal: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  close: { fontSize: 28, fontWeight: "bold" },

  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  refreshText: {
    color: "#8E8E93",
    fontSize: 13,
  },

  section: { marginTop: 20, fontSize: 14, fontWeight: "bold" },
  organization: { marginTop: 12, fontSize: 18, fontWeight: "600" },

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
  listTitle: { fontSize: 16, fontWeight: "500" },
  listSubtitle: { fontSize: 14, color: "#8E8E93" },
  chevron: { fontSize: 24, color: "#C7C7CC" },

  logo: {
    width: 50,
    height: 50,
  },

  modalWrapper: { flex: 1, justifyContent: "flex-end" },

  bottomModalBox: {
    height: "60%",
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },

  handleTouchArea: {
    paddingTop: 10,
    paddingBottom: 14,
    marginTop: -6,
  },

  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#D1D1D6",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 10,
  },

  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  binItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  binName: { fontSize: 16, fontWeight: "600" },
  binLocation: { fontSize: 14, color: "#8E8E93", marginTop: 2 },
  binPercent: {
    fontSize: 14,
    marginTop: 4,
    color: "#FF3B30",
    fontWeight: "600",
  },
  emptyText: { textAlign: "center", color: "#8E8E93", marginTop: 20 },

  joinInput: {
    borderWidth: 1,
    borderColor: "#FF9627",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    fontSize: 18,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 12,
    letterSpacing: 3,
  },
  joinButton: {
    backgroundColor: "#FF9627",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  joinButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  joinError: {
    color: "#D32F2F",
    marginBottom: 10,
    textAlign: "center",
  },
  joinHint: {
    marginTop: 12,
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 12,
  },

  // language rows
  langRow: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  langRowActive: {
    borderColor: "#FF9627",
  },
  langText: {
    fontSize: 16,
    fontWeight: "600",
  },
  langCheck: {
    fontSize: 18,
    fontWeight: "800",
  },

  // logout
  logoutItem: {
    borderBottomColor: "transparent",
    marginTop: 18,
  },
  logoutTitle: {
    color: "#FF3B30",
    fontWeight: "700",
  },
  logoutChevron: {
    color: "#FF3B30",
  },
});
