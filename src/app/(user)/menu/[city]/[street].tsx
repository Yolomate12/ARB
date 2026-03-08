import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type StreetItem = {
  name_street: string;
  onlineCount: number;
  offlineCount: number;
};

const { width: W, height: H } = Dimensions.get("window");
const vw = (p: number) => (W * p) / 100;
const vh = (p: number) => (H * p) / 100;
const fs = (base: number) => Math.max(12, (base * W) / 375);

export default function StreetListScreen() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { city } = useLocalSearchParams<{ city: string }>();

  const [streets, setStreets] = useState<StreetItem[]>([]);
  const [filteredStreets, setFilteredStreets] = useState<StreetItem[]>([]);
  const [organisationName, setOrganisationName] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = async (opts?: { silent?: boolean }) => {
    if (!city) return;
    if (!profile?.id_org) return;

    const silent = opts?.silent ?? false;

    if (!silent) setLoading(true);
    setError(null);

    try {
      // OPRAVA: filtrujeme aj podľa organizácie (rovnako ako CityListScreen)
      const { data, error } = await supabase
        .from("bin_full_info")
        .select("name_street, status, nazov_org")
        .eq("name_city", city)
        .eq("id_org", profile.id_org);

      if (error) throw error;

      if (data && data.length > 0) {
        const firstOrg =
          data.find(
            (d: any) => d.nazov_org && String(d.nazov_org).trim() !== "",
          )?.nazov_org ?? null;

        setOrganisationName(firstOrg ?? profile.organisation ?? null);

        const streetCounts: Record<
          string,
          { onlineCount: number; offlineCount: number }
        > = {};

        data.forEach((item: any) => {
          if (!item.name_street) return;

          if (!streetCounts[item.name_street]) {
            streetCounts[item.name_street] = {
              onlineCount: 0,
              offlineCount: 0,
            };
          }

          if (item.status === "online")
            streetCounts[item.name_street].onlineCount += 1;
          else streetCounts[item.name_street].offlineCount += 1;
        });

        const uniqueStreets: StreetItem[] = Object.entries(streetCounts)
          .map(([name_street, counts]) => ({
            name_street,
            onlineCount: counts.onlineCount,
            offlineCount: counts.offlineCount,
          }))
          .sort((a, b) => a.name_street.localeCompare(b.name_street, "sk"));

        setStreets(uniqueStreets);
        setFilteredStreets(uniqueStreets);
      } else {
        setOrganisationName(profile.organisation ?? null);
        setStreets([]);
        setFilteredStreets([]);
      }
    } catch (err: any) {
      console.error("Error fetching streets:", err);
      setError(err?.message || t("errorLoadingStreets"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.id_org) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, profile?.id_org]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFilteredStreets(streets);
      return;
    }
    setFilteredStreets(
      streets.filter((s) => s.name_street.toLowerCase().includes(q)),
    );
  }, [search, streets]);

  if (!profile) {
    return (
      <View style={[styles.center, { flex: 1 }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: vh(1.2), color: "#FF9627" }}>
          {t("loadingProfile")}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF9627" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {t("errorLabel")}: {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, width: "100%" }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      alwaysBounceVertical
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {refreshing && (
        <View style={styles.refreshRow}>
          <ActivityIndicator />
          <Text style={styles.refreshText}>Reloadujem…</Text>
        </View>
      )}

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder={t("searchStreet")}
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {organisationName ? `${organisationName} / ${city}` : city}
        </Text>
      </View>

      <View style={{ paddingHorizontal: vw(5), paddingVertical: vw(2.4) }}>
        <Text style={{ fontSize: 14, fontWeight: "bold" }}>Ulica</Text>
      </View>
      {/* LIST */}
      <View style={styles.list}>
        {filteredStreets.map((street) => (
          <Link
            key={street.name_street}
            href={{
              pathname: "/(user)/menu/[city]/[street]/devices",
              params: { city, street: street.name_street },
            }}
            asChild
          >
            <Pressable style={styles.card}>
              <View style={styles.leftBox}>
                <FontAwesome
                  name="map-marker"
                  size={Math.round(vw(6.2))}
                  color="white"
                />
              </View>

              <View style={styles.rightBox}>
                <Text style={styles.streetName} numberOfLines={1}>
                  {street.name_street}
                </Text>
                <Text style={styles.statusText} numberOfLines={1}>
                  {t("online")}: {street.onlineCount} | {t("offline")}:{" "}
                  {street.offlineCount}
                </Text>
              </View>
            </Pressable>
          </Link>
        ))}

        {!loading && !error && !filteredStreets.length ? (
          <View style={{ paddingVertical: vh(2.5) }}>
            <Text
              style={{
                textAlign: "center",
                color: "#8E8E93",
                fontSize: fs(14),
              }}
            >
              {t("noStreetsFound")}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "white",
    paddingBottom: vh(2.5),
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  error: {
    color: "red",
    fontSize: fs(16),
    textAlign: "center",
    paddingHorizontal: vw(6),
  },

  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Math.max(vw(2.2), 8),
    marginTop: vh(1.2),
    marginBottom: vh(0.8),
    paddingHorizontal: vw(4.2),
  },

  refreshText: {
    color: "#8E8E93",
    fontSize: fs(13),
  },

  searchContainer: {
    paddingHorizontal: vw(4.2),
    paddingVertical: vh(1.6),
  },

  searchInput: {
    height: Math.max(vh(6.2), 46),
    backgroundColor: "#F6F6F6",
    borderRadius: Math.max(vw(2.2), 8),
    borderColor: "#E2E2E2",
    borderWidth: 1,
    paddingHorizontal: vw(4.2),
    marginTop: vh(1.6),
    color: "black",
    fontSize: fs(16),
  },

  header: {
    paddingHorizontal: vw(4.2),
    paddingVertical: vh(1),
  },

  headerTitle: {
    fontSize: fs(20),
    fontWeight: "bold",
    color: "#1E1E1E",
    opacity: 0.5,
    marginBottom: 10,
  },

  list: {
    paddingHorizontal: vw(4.2),
  },

  card: {
    flexDirection: "row",
    height: Math.max(vh(9.5), 70),
    borderRadius: Math.max(vw(2.2), 8),
    overflow: "hidden",
    marginBottom: vh(1.4),
    backgroundColor: "#f3f3f3",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  leftBox: {
    width: "25%",
    backgroundColor: "#FF9627",
    justifyContent: "center",
    alignItems: "center",
  },

  rightBox: {
    width: "75%",
    paddingHorizontal: vw(4.2),
    justifyContent: "center",
  },

  streetName: {
    fontSize: fs(16),
    fontWeight: "800",
    color: "black",
  },

  statusText: {
    fontSize: fs(14),
    color: "#666",
    marginTop: vh(0.3),
  },
});
