import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import MapView, { Marker } from "react-native-maps";

type CityItem = {
  name_city: string;
  streets: string[];
  latitude: number;
  longitude: number;
  organisation: string | null;
  onlineCount: number;
  offlineCount: number;
};

const { width: W, height: H } = Dimensions.get("window");

// helpers iba z width/height
const vw = (p: number) => (W * p) / 100;
const vh = (p: number) => (H * p) / 100;

const fs = (base: number) => Math.max(12, (base * W) / 375);

export default function CityListScreen() {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [cities, setCities] = useState<CityItem[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);

  const fetchCities = async (opts?: { silent?: boolean }) => {
    if (!profile?.id_org) return;

    const silent = opts?.silent ?? false;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("bin_full_info")
        .select(
          "name_city, name_street, nazov_org, latitude, longitude, status",
        )
        .eq("id_org", profile.id_org);

      if (error) throw error;

      if (data && data.length > 0) {
        const firstOrg = data.find(
          (item: any) => item.nazov_org && String(item.nazov_org).trim() !== "",
        )?.nazov_org;

        setOrganisationName(firstOrg ?? profile.organisation ?? null);

        const cityMap = new Map<string, CityItem>();

        data.forEach((item: any) => {
          const existing = cityMap.get(item.name_city);
          const isOnline = item.status === "online";

          if (!existing) {
            cityMap.set(item.name_city, {
              name_city: item.name_city,
              streets: item.name_street ? [item.name_street] : [],
              latitude: item.latitude ?? 48.1486,
              longitude: item.longitude ?? 17.1077,
              organisation: item.nazov_org ?? null,
              onlineCount: isOnline ? 1 : 0,
              offlineCount: isOnline ? 0 : 1,
            });
          } else {
            if (
              item.name_street &&
              !existing.streets.includes(item.name_street)
            ) {
              existing.streets.push(item.name_street);
            }
            if (isOnline) existing.onlineCount += 1;
            else existing.offlineCount += 1;
          }
        });

        const uniqueCities = Array.from(cityMap.values());
        setCities(uniqueCities);
        setFilteredCities(uniqueCities);
      } else {
        setOrganisationName(profile.organisation ?? null);
        setCities([]);
        setFilteredCities([]);
      }
    } catch (err: any) {
      console.error("Error fetching cities:", err);
      setError(err?.message || t("errorLoadingCities"));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.id_org) return;
    fetchCities();
  }, [profile?.id_org]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCities({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const q = search.toLowerCase();
    const filtered = cities.filter(
      (city) =>
        city.name_city.toLowerCase().includes(q) ||
        city.streets.some((street) => street.toLowerCase().includes(q)),
    );
    setFilteredCities(filtered);
  }, [search, cities]);

  useEffect(() => {
    if (mapRef.current && filteredCities.length > 0) {
      const coords = filteredCities.map((c) => ({
        latitude: c.latitude,
        longitude: c.longitude,
      }));

      if (coords.length === 1) {
        mapRef.current.animateToRegion(
          {
            ...coords[0],
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          1000,
        );
      } else {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: {
            top: vh(10),
            right: vw(10),
            bottom: vh(10),
            left: vw(10),
          },
          animated: true,
        });
      }
    }
  }, [filteredCities]);

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: vh(1.2), color: "#FF9627" }}>
          {t("loadingProfile")}
        </Text>
      </View>
    );
  }

  const mapHeight = Math.min(vh(32), 320); 
  const orgMinHeight = Math.max(vh(52), 360);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      
      <View style={styles.section}>
        <TextInput
          placeholder={t("searchCityStreet")}
          value={search}
          onChangeText={setSearch}
          style={styles.searchBar}
          placeholderTextColor="#999"
        />
      </View>

    
      {filteredCities.length > 0 && (
        <MapView
          ref={mapRef}
          style={[styles.map, { height: mapHeight }]}
          initialRegion={{
            latitude: filteredCities[0].latitude,
            longitude: filteredCities[0].longitude,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          }}
        >
          {filteredCities.map((city) => (
            <Marker
              key={city.name_city}
              coordinate={{
                latitude: city.latitude,
                longitude: city.longitude,
              }}
              title={city.name_city}
              description={city.organisation ?? t("unknownOrganisation")}
            />
          ))}
        </MapView>
      )}

      
      <View
        style={[
          styles.bottomSection,
          styles.orgSection,
          { minHeight: orgMinHeight },
        ]}
      >
        <Text style={styles.orgName}>{organisationName ?? t("notSet")}</Text>

        <Text style={styles.branchesTitle}>{t("yourBranches")}</Text>

        
        <View style={{ marginTop: vh(1.5) }}>
          {filteredCities.map((city) => (
            <Link
              key={city.name_city}
              href={{
                pathname: "/(user)/menu/[city]/[street]",
                params: { city: city.name_city },
              }}
              asChild
            >
              <Pressable style={styles.card}>
                <View style={styles.rowContent}>
                  <View style={styles.leftBox}>
                    <FontAwesome
                      name="flag-o"
                      size={Math.round(vw(6.2))}
                      color="white"
                    />
                  </View>

                  <View style={styles.rightBox}>
                    <Text style={styles.title}>{city.name_city}</Text>
                    <Text style={styles.subText}>
                      {t("online")}: {city.onlineCount}, {t("offline")}:{" "}
                      {city.offlineCount}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>

        {!loading && !error && filteredCities.length === 0 ? (
          <View style={{ paddingVertical: vh(2.2) }}>
            <Text
              style={{
                textAlign: "center",
                color: "#8E8E93",
                fontSize: fs(14),
              }}
            >
              {t("noBranchesFound")}
            </Text>
          </View>
        ) : null}
      </View>

      
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      )}

      
      {error && (
        <View style={styles.center}>
          <Text style={{ color: "red", fontSize: fs(14) }}>
            {t("errorLabel")}: {error}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "white",
    paddingBottom: vh(2),
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  section: {
    paddingHorizontal: vw(3.2),
    marginBottom: vh(1.2),
  },

  searchBar: {
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

  map: {
    width: "100%",
    borderRadius: 0,
    overflow: "hidden",
    marginTop: vh(1.6),
  },

  bottomSection: {
    flex: 1,
    backgroundColor: "white",
    paddingHorizontal: vw(3.2),
    paddingTop: vh(1.2),
  },

  orgSection: {
    flex: 1,
    marginTop: -vh(3),
    backgroundColor: "white",
    paddingVertical: vh(1.2),
    paddingHorizontal: vw(3.2),
    borderTopLeftRadius: Math.max(vw(3.2), 12),
    borderTopRightRadius: Math.max(vw(3.2), 12),
    zIndex: 5,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },

  orgName: {
    fontSize: fs(28),
    paddingTop: vh(2),
    paddingBottom: vh(2),
    fontWeight: "900",
    color: "black",
  },

  branchesTitle: {
    fontSize: fs(14),
    fontWeight: "bold",
    paddingTop: vh(1.2),
    paddingBottom: vh(1.2),
    color: "black",
  },

  card: {
    height: Math.max(vh(9.5), 70),
    borderRadius: Math.max(vw(2.2), 8),
    overflow: "hidden",
    marginBottom: vh(1.4),
    flexDirection: "row",
  },

  rowContent: {
    flex: 1,
    flexDirection: "row",
  },

  leftBox: {
    width: "25%",
    justifyContent: "center",
    backgroundColor: "#FF9627",
    alignItems: "center",
  },

  rightBox: {
    width: "75%",
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    paddingHorizontal: vw(4.2),
    paddingVertical: vh(1),
  },

  title: {
    color: "black",
    fontSize: fs(15),
    fontWeight: "800",
  },

  subText: {
    marginTop: vh(0.5),
    color: "black",
    fontSize: fs(13),
  },
});
