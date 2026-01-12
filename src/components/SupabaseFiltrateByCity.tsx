import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
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

type CityItem = {
  name_city: string;
  streets: string[];
};

export default function CityListScreen() {
  const { profile } = useAuth();
  const [cities, setCities] = useState<CityItem[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchCities = async () => {
      try {
        setLoading(true);

        // 🔹 načítaj všetky koše pre profil podľa profile_id
        const { data, error } = await supabase
          .from("bin_full_info")
          .select("name_city, name_street, nazov_org")
          .eq("profile_id", profile.id);

        if (error) throw error;

        if (data && data.length > 0) {
          // 🔹 vezmi prvý platný názov organizácie
          const firstOrg = data.find(
            (item) => item.nazov_org && item.nazov_org.trim() !== ""
          )?.nazov_org;

          setOrganisationName(firstOrg ?? profile.organisation);

          // 🔹 spracuj mestá a ulice
          const cityMap = new Map<string, CityItem>();
          data.forEach((item) => {
            const existing = cityMap.get(item.name_city);
            if (!existing) {
              cityMap.set(item.name_city, {
                name_city: item.name_city,
                streets: item.name_street ? [item.name_street] : [],
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

  // 🔹 filter miest podľa vyhľadávania
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
      <TextInput
        placeholder="Hľadaj mesto alebo ulicu..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
        placeholderTextColor="#999"
      />

      {/* ORGANIZÁCIA */}
      <View style={{ marginBottom: 20 }}>
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
              <Text style={styles.title}>{city.name_city}</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const { width, height } = Dimensions.get("window");
const scale = width / 375;

const styles = StyleSheet.create({
  container: { padding: 12, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  orgName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#FF9627",
  },

  searchBar: {
    height: 50,
    backgroundColor: "#1e1e1e",
    borderRadius: 0,
    paddingHorizontal: 16,
    color: "white",
    fontSize: 16,
    marginBottom: 12,
  },

  textBox: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 2,
  },

  card: {
    height: height * 0.132,
    borderRadius: 0,
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
