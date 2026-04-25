import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { Stack, useRouter } from "expo-router";
import * as Updates from "expo-updates";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  DevSettings,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


const { width: W, height: H } = Dimensions.get("window");
const vw = (p: number) => (W * p) / 100;
const vh = (p: number) => (H * p) / 100;
const fs = (b: number) => Math.max(12, (b * W) / 375);
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const s = (base: number) => clamp((base * W) / 375, base * 0.85, base * 1.25);

export default function AdminSettings() {
  const { session } = useAuth();
  const userEmail = session?.user?.email ?? "—";
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();

  const [langVisible, setLangVisible] = useState(false);
  const [langMounted, setLangMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const langY = useRef(new Animated.Value(0)).current;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const reloadWholeApp = async () => {
    if (__DEV__) {
      DevSettings.reload();
      return;
    }
    try {
      await Updates.reloadAsync();
    } catch {
    }
  };

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
    }).start(() => finishClose(setLangVisible, setLangMounted, langY));
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
    if (isClosing) return;

    await setLang(next);

    closeLang();
    await sleep(200);
    reloadWholeApp();
  };


  const handleLogout = async () => {
    if (logoutLoading) return;

    setLogoutLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setTimeout(() => {
        reloadWholeApp();
      }, 100);
      setLogoutLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerShadowVisible: false,
          headerLeft: () => (
            <View style={styles.headerItem}>
              <Image
                source={require("@assets/images/logo.png")}
                style={styles.logo}
              />
            </View>
          ),
          headerRight: () => (
            <Pressable
              hitSlop={s(10)}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(admin)")
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.section}>{t("options")}</Text>
        <Text style={styles.organization}>{t("adminAccount")}</Text>

        <TouchableOpacity style={styles.listItem} activeOpacity={0.8}>
          <View>
            <Text style={styles.listTitle}>{t("account")}</Text>
            <Text style={styles.listSubtitle}>{userEmail}</Text>
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
          disabled={isClosing || logoutLoading}
          activeOpacity={0.8}
        >
          <View style={{ paddingRight: 10 }}>
            <Text style={[styles.listTitle, styles.logoutTitle]}>
              {t("logout")}
            </Text>
            <Text style={styles.listSubtitle}>{t("logoutSubtitle")}</Text>
          </View>

          {logoutLoading ? (
            <ActivityIndicator />
          ) : (
            <Text style={[styles.chevron, styles.logoutChevron]}>›</Text>
          )}
        </TouchableOpacity>

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
                  disabled={isClosing}
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
                  disabled={isClosing}
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
    paddingTop: vh(2),
    alignItems: "center",
    backgroundColor: "white",
    paddingBottom: vh(3),
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
    height: Math.max(vh(45), 360),
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

  joinHint: {
    marginTop: vh(1.6),
    textAlign: "center",
    color: "#8E8E93",
    fontSize: fs(12),
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

  logo: {
    width: s(44),
    height: s(44),
    resizeMode: "contain",
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
