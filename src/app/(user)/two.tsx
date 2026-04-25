import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { Stack, useRouter } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  DevSettings,
  Dimensions,
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


const { width: W, height: H } = Dimensions.get("window");
const vw = (p: number) => (W * p) / 100;
const vh = (p: number) => (H * p) / 100;
const fs = (b: number) => Math.max(12, (b * W) / 375);
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const s = (base: number) => clamp((base * W) / 375, base * 0.85, base * 1.25);

export default function TabTwoScreen() {
  const { session } = useAuth();
  const userEmail = session?.user?.email ?? "—";
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();

  const [organizationName, setOrganizationName] = useState("—");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    onlineCount: 0,
    offlineCount: 0,
  });

  const [binsOverLimit, setBinsOverLimit] = useState<Bin[]>([]);

  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsMounted, setNotificationsMounted] = useState(false);

  const [joinVisible, setJoinVisible] = useState(false);
  const [joinMounted, setJoinMounted] = useState(false);

  const [langVisible, setLangVisible] = useState(false);
  const [langMounted, setLangMounted] = useState(false);

  const [isClosing, setIsClosing] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [currentOrgId, setCurrentOrgId] = useState<number | null>(null);


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


  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setTimeout(() => {
        reloadWholeApp();
      }, 100);
    }
  };

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
      toValue: vh(90),
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
        if (g.dy > vh(14)) closeNotifications();
        else resetNotifications();
      },
    }),
  ).current;

 
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
      toValue: vh(90),
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
        if (g.dy > vh(14)) closeJoin();
        else resetJoin();
      },
    }),
  ).current;

  
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
      toValue: vh(90),
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
        if (g.dy > vh(14)) closeLang();
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
      setJoinError(t("alreadyJoinedOrg"));
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

      setOrganizationName(bins[0]?.nazov_org ?? t("unknownOrganisation"));

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
  }, [session?.user?.id]);

  const onRefresh = async () => {
    if (notificationsMounted || joinMounted || langMounted) return;

    setRefreshing(true);
    try {
      await refetch({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              hitSlop={s(10)}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(user)")
              }
            >
              <View style={styles.headerItem}>
                <View style={styles.closeIcon}>
                  <View
                    style={[
                      styles.closeLine,
                      { transform: [{ rotate: "45deg" }] },
                    ]}
                  />
                  <View
                    style={[
                      styles.closeLine,
                      { transform: [{ rotate: "-45deg" }] },
                    ]}
                  />
                </View>
              </View>
            </Pressable>
          ),
        }}
      />

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
        {refreshing && (
          <View style={styles.refreshRow}>
            <ActivityIndicator />
            <Text style={styles.refreshText}>{t("reloading")}</Text>
          </View>
        )}

        <Text style={styles.section}>{t("options")}</Text>

        <Text style={styles.organization}>
          {loading ? t("loading") : organizationName}
        </Text>

        <TouchableOpacity style={styles.listItem} activeOpacity={0.8}>
          <View>
            <Text style={styles.listTitle}>{t("account")}</Text>
            <Text style={styles.listSubtitle}>{userEmail}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.listItem} activeOpacity={0.8}>
          <View>
            <Text style={styles.listTitle}>{t("devices")}</Text>
            <Text style={styles.listSubtitle}>
              {t("online")}: {deviceStatus.onlineCount} · {t("offline")}:{" "}
              {deviceStatus.offlineCount}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.listItem}
          onPress={openNotifications}
          disabled={isClosing}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.listTitle}>{t("notifications")}</Text>
            <Text style={styles.listSubtitle}>{t("binsOver80")}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.listItem}
          onPress={openJoin}
          disabled={isClosing}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.listTitle}>{t("joinCompany")}</Text>
            <Text style={styles.listSubtitle}>{t("joinSubtitle")}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.listItem}
          onPress={openLang}
          disabled={isClosing}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.listTitle}>{t("language")}</Text>
            <Text style={styles.listSubtitle}>
              {lang === "sk" ? t("slovak") : t("english")}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.listItem, styles.logoutItem]}
          onPress={handleLogout}
          disabled={isClosing}
          activeOpacity={0.8}
        >
          <View>
            <Text style={[styles.listTitle, styles.logoutTitle]}>
              {t("logout")}
            </Text>
            <Text style={styles.listSubtitle}>{t("logoutSubtitle")}</Text>
          </View>
          <Text style={[styles.chevron, styles.logoutChevron]}>›</Text>
        </TouchableOpacity>

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
                  contentContainerStyle={{ paddingBottom: vh(2.5) }}
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
                  activeOpacity={0.85}
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
                  style={[
                    styles.langRow,
                    lang === "sk" && styles.langRowActive,
                  ]}
                  onPress={() => handleChangeLanguage("sk")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.langText}>{t("slovak")}</Text>
                  <Text style={styles.langCheck}>
                    {lang === "sk" ? "✓" : ""}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.langRow,
                    lang === "en" && styles.langRowActive,
                  ]}
                  onPress={() => handleChangeLanguage("en")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.langText}>{t("english")}</Text>
                  <Text style={styles.langCheck}>
                    {lang === "en" ? "✓" : ""}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.joinHint}>{t("pullDownToClose")}</Text>
              </Animated.View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: vh(6),
    alignItems: "center",
    backgroundColor: "white",
    paddingBottom: vh(3),
  },

  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Math.max(vw(2.2), 8),
    marginTop: vh(1.2),
    marginBottom: vh(0.8),
  },

  refreshText: {
    color: "#8E8E93",
    fontSize: fs(13),
  },

  section: {
    marginTop: vh(2.2),
    fontSize: fs(14),
    fontWeight: "bold",
  },

  organization: {
    marginTop: vh(1.4),
    fontSize: fs(18),
    fontWeight: "600",
  },

  listItem: {
    width: "90%",
    paddingVertical: vh(1.8),
    paddingHorizontal: vw(4.2),
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: vh(1.2),
  },

  listTitle: {
    fontSize: fs(16),
    fontWeight: "500",
  },

  listSubtitle: {
    fontSize: fs(14),
    color: "#8E8E93",
    marginTop: vh(0.4),
  },

  chevron: {
    fontSize: fs(24),
    color: "#C7C7CC",
  },

  modalWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },

  bottomModalBox: {
    height: Math.max(vh(60), 420),
    backgroundColor: "white",
    padding: vw(5),
    borderTopLeftRadius: Math.max(vw(5), 20),
    borderTopRightRadius: Math.max(vw(5), 20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },

  handleTouchArea: {
    paddingTop: vh(1),
    paddingBottom: vh(1.6),
    marginTop: -vh(0.6),
  },

  modalHandle: {
    width: Math.max(vw(10), 40),
    height: Math.max(vh(0.6), 5),
    backgroundColor: "#D1D1D6",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: vh(1.2),
  },

  modalTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    marginBottom: vh(1.4),
  },

  binItem: {
    paddingVertical: vh(1.8),
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },

  binName: {
    fontSize: fs(16),
    fontWeight: "600",
  },

  binLocation: {
    fontSize: fs(14),
    color: "#8E8E93",
    marginTop: vh(0.3),
  },

  binPercent: {
    fontSize: fs(14),
    marginTop: vh(0.6),
    color: "#FF3B30",
    fontWeight: "600",
  },

  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: vh(2.5),
    fontSize: fs(14),
  },

  joinInput: {
    borderWidth: 1,
    borderColor: "#FF9627",
    borderRadius: Math.max(vw(2.2), 8),
    paddingVertical: vh(1.4),
    paddingHorizontal: vw(3.2),
    width: "100%",
    fontSize: fs(18),
    textAlign: "center",
    marginTop: vh(0.8),
    marginBottom: vh(1.4),
    letterSpacing: Math.max(vw(0.8), 3),
  },

  joinButton: {
    backgroundColor: "#FF9627",
    paddingVertical: vh(1.8),
    borderRadius: Math.max(vw(2.2), 8),
    alignItems: "center",
  },

  joinButtonText: {
    color: "white",
    fontSize: fs(18),
    fontWeight: "600",
  },

  joinError: {
    color: "#D32F2F",
    marginBottom: vh(1.2),
    textAlign: "center",
    fontSize: fs(13),
  },

  joinHint: {
    marginTop: vh(1.6),
    textAlign: "center",
    color: "#8E8E93",
    fontSize: fs(12),
  },

  langRow: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: Math.max(vw(3.2), 12),
    paddingVertical: vh(1.8),
    paddingHorizontal: vw(4),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: vh(1.2),
  },

  langRowActive: {
    borderColor: "#FF9627",
  },

  langText: {
    fontSize: fs(16),
    fontWeight: "600",
  },

  langCheck: {
    fontSize: fs(18),
    fontWeight: "800",
  },

  logoutItem: {
    borderBottomColor: "transparent",
    marginTop: vh(2.2),
  },

  logoutTitle: {
    color: "#FF3B30",
    fontWeight: "700",
  },

  logoutChevron: {
    color: "#FF3B30",
  },

  headerItem: {
    height: s(40),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: s(10),
  },

  closeIcon: {
    width: s(24),
    height: s(24),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  closeLine: {
    position: "absolute",
    width: s(22),
    height: s(4),
    backgroundColor: Colors.orange.background,
    borderRadius: s(20),
  },
});
