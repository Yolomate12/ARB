import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
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

        // Načítame všetky biny pre organizáciu prihláseného užívateľa
        const { data, error } = await supabase
          .from("bin_full_info")
          .select("name_city, name_street, nazov_org, latitude, longitude")
          .eq("id_org", profile.id_org);

        if (error) throw error;

        if (data && data.length > 0) {
          // Vyberieme názov organizácie
          const firstOrg = data.find(
            (item) => item.nazov_org && item.nazov_org.trim() !== ""
          )?.nazov_org;

          setOrganisationName(firstOrg ?? profile.organisation);

          // Aggregácia miest a ulíc
          const cityMap = new Map<string, CityItem>();
          data.forEach((item) => {
            const existing = cityMap.get(item.name_city);
            if (!existing) {
              cityMap.set(item.name_city, {
                name_city: item.name_city,
                streets: item.name_street ? [item.name_street] : [],
                latitude: item.latitude ?? 48.1486, // fallback Bratislava
                longitude: item.longitude ?? 17.1077,
                organisation: item.nazov_org ?? null,
              });
            } else if (item.name_street && !existing.streets.includes(item.name_street)) {
              existing.streets.push(item.name_street);
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

  // Dynamické priblíženie/oddialenie mapy
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
      <View style={styles.section}>
        <Text style={styles.orgName}>
          ORGANIZÁCIA: {organisationName ?? "Nie je nastavená"}
        </Text>
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

      {/* ZOZNAM MIEST */}
      <View style={styles.section}>
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
              <View style={styles.overlay} />
              <View style={styles.textBox}>
                <View style={{ width: "25%" }}></View>
                <View style={{ width: "75%" }}>
                  <Text style={styles.title}>{city.name_city}</Text>
                </View>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const { width, height } = Dimensions.get("window");
const scale = width / 375;

const styles = StyleSheet.create({
  container: { flexGrow: 0, backgroundColor: "white" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  section: { paddingHorizontal: 12, marginBottom: 12 },

  orgName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FF9627",
  },

  searchBar: {
    height: 50,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    color: "white",
    fontSize: 16,
  },

  map: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    marginTop: 20,
  },    

  textBox: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 2,
  },

  card: {
    height: height * 0.132,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
    justifyContent: "flex-end",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FF9627",
    opacity: 0.73,
  },

  title: {
    color: "white",
    fontSize: 32 * scale,
    fontWeight: "800",
  },
});
