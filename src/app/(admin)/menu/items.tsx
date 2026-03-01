import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
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
  online_count: number;
  offline_count: number;
};

const ORANGE = Colors.orange?.background ?? "#F7941D";
const STICKY_THRESHOLD = 4;

// kam má "Back" na tomto screen-e viesť (admin root)
const ADMIN_ROOT_ROUTE = "/(admin)/menu/items";

export default function AdminOrganizationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [rows, setRows] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("organisation_list")
      .select("id_org,nazov_org,latitude,longitude,online_count,offline_count")
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
      const hay = [r.nazov_org, String(r.id_org)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const sticky = filtered.length >= STICKY_THRESHOLD;

  // ✅ zabráni tomu, aby Android hard-back padol do user stacku
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
          paddingBottom: sticky ? 160 : 20,
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
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: "#777", fontWeight: "600" }}>
              {t("adminNoOrganizations")}
            </Text>
          </View>
        }
      />

      {sticky && <View style={styles.stickyBar}>{Buttons}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111",
    marginBottom: 12,
  },

  searchBox: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },

  searchInput: {
    flex: 1,
    marginRight: 10,
    fontSize: 15,
    color: "#111",
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
    bottom: 14,
    gap: 12,
    backgroundColor: "#fff",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
  },

  outlineBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  outlineText: {
    color: ORANGE,
    fontWeight: "900",
    letterSpacing: 0.6,
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
  },
});
