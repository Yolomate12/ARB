import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
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

export default function CityListScreen() {
  const { profile } = useAuth();
  const [cities, setCities] = useState<CityItem[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);

  // Načítanie miest z DB
  useEffect(() => {
    if (!profile?.id_org) return;

    const fetchCities = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("bin_full_info")
          .select("name_city, name_street, nazov_org, latitude, longitude, status")
          .eq("id_org", profile.id_org);

        if (error) throw error;

        if (data && data.length > 0) {
          // Názov organizácie
          const firstOrg = data.find(
            (item) => item.nazov_org && item.nazov_org.trim() !== ""
          )?.nazov_org;

          setOrganisationName(firstOrg ?? profile.organisation);

          // Agregácia miest a online/offline kontajnerov
          const cityMap = new Map<string, CityItem>();

          data.forEach((item) => {
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
              if (item.name_street && !existing.streets.includes(item.name_street)) {
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
          setOrganisationName(profile.organisation);
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching cities:", err);
        setError(err.message || "Chyba pri načítaní miest");
        setLoading(false);
      }
    };

    fetchCities();
  }, [profile]);

  // Filter miest podľa vyhľadávania
  useEffect(() => {
    const filtered = cities.filter(
      (city) =>
        city.name_city.toLowerCase().includes(search.toLowerCase()) ||
        city.streets.some((street) =>
          street.toLowerCase().includes(search.toLowerCase())
        )
    );
    setFilteredCities(filtered);
  }, [search, cities]);

  // Dynamické priblíženie mapy
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
          1000
        );
      } else {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 150, right: 150, bottom: 150, left: 150 },
          animated: true,
        });
      }
    }
  }, [filteredCities]);

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: "#FF9627" }}>Načítavam profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* SEARCHBAR */}
      <View style={styles.section}>
        <TextInput
          placeholder="Hľadaj mesto alebo ulicu..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchBar}
          placeholderTextColor="#999"
        />
      </View>

      {/* MAPA */}
      {filteredCities.length > 0 && (
        <MapView
          ref={mapRef}
          style={styles.map}
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
              coordinate={{ latitude: city.latitude, longitude: city.longitude }}
              title={city.name_city}
              description={city.organisation ?? "Neznáma organizácia"}
            />
          ))}
        </MapView>
      )}

      {/* ORGANIZÁCIA */}
      <View style={[styles.bottomSection, styles.orgSection]}>
        <Text style={styles.orgName}>
          {organisationName ?? "Nie je nastavená"}
        </Text>

        <Text style={{fontSize: 14, fontWeight: 'bold', paddingTop: 10, paddingBottom: 10,}}>Vaše pobočky</Text>
        {/* ZOZNAM MIEST */}
        <View style={{ marginTop: 12 }}>
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
                  {/* 25 % box */}
                  <View style={styles.leftBox}>
                    <FontAwesome name="map-marker" size={24} color="white" />
                  </View>

                  {/* 75 % box */}
                  <View style={styles.rightBox}>
                    <Text style={styles.title}>{city.name_city}</Text>
                    <Text>
                      Online: {city.onlineCount}, Offline: {city.offlineCount}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      {/* LOADING */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {/* ERROR */}
      {error && (
        <View style={styles.center}>
          <Text style={{ color: "red" }}>Chyba: {error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const { width, height } = Dimensions.get("window");
const scale = width / 375;

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "white" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: { paddingHorizontal: 12, marginBottom: 12 },

  searchBar: {
    height: 50,
    backgroundColor: "#F6F6F6",
    borderRadius: 8,
    borderColor: "#E2E2E2",
    borderWidth: 1,
    paddingHorizontal: 16,
    marginTop: 10,
    color: "white",
    fontSize: 16,
  },

  map: {
    width: "100%",
    height: 250,
    borderRadius: 0,
    overflow: "hidden",
    marginTop: 20,
  },

  bottomSection: {
    flex: 1,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  orgSection: {
    flex: 1, // zabere celý dostupný priestor
    marginTop: -25,
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    zIndex: 5,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    minHeight: Dimensions.get("window").height / 2, // zabezpečí aspoň polovicu obrazovky
  },


  orgName: {
    fontSize: 28,
    paddingTop: 16,
    paddingBottom: 16,
    fontWeight: "900",
    color: "black",
  },

  card: {
    height: height * 0.10,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
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
    paddingHorizontal: 16,
  },

  title: {
    color: "black",
    fontSize: 14 * scale,
    fontWeight: "800",
  },
});
