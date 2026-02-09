import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import MapView, { MapPressEvent, Marker } from "react-native-maps";

const ORANGE = Colors.orange?.background ?? "#F7941D";

function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, "");
}

function randomCompanyCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

type CountryRow = {
  id: number;
  country_name: string;
  iso2: string;
  iso3: string;
};

export default function NewOrganisationScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);

  // form
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");

  // HQ address fields (required for RPC)
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");

  // country dropdown
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesRefreshing, setCountriesRefreshing] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryRow | null>(
    null,
  );

  // location (optional)
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  // map modal
  const [mapOpen, setMapOpen] = useState(false);

  // company code
  const [companyCode, setCompanyCode] = useState<string>("");

  const [saving, setSaving] = useState(false);

  const coords = useMemo(() => {
    const la = Number(lat);
    const lo = Number(lng);
    const latOk = lat.trim() && !Number.isNaN(la);
    const lngOk = lng.trim() && !Number.isNaN(lo);
    return latOk && lngOk ? { latitude: la, longitude: lo } : null;
  }, [lat, lng]);

  const canSubmit = useMemo(() => {
    if (!orgName.trim()) return false;

    // HQ address required
    if (!selectedCountry) return false;
    if (!city.trim()) return false;
    if (!street.trim()) return false;

    // coords optional, but if one is filled, both must be valid numbers
    const anyCoord = lat.trim() || lng.trim();
    if (anyCoord && !coords) return false;

    return true;
  }, [orgName, selectedCountry, city, street, lat, lng, coords]);

  const loadCountries = async () => {
    setCountriesLoading(true);

    const { data, error } = await supabase
      .from("country")
      .select("id,country_name,iso2,iso3")
      .order("country_name", { ascending: true });

    if (error) {
      console.log("country load error:", error);
    } else {
      setCountries((data ?? []) as CountryRow[]);
    }

    setCountriesLoading(false);
  };

  useEffect(() => {
    loadCountries();
  }, []);

  const onRefreshCountries = async () => {
    setCountriesRefreshing(true);
    await loadCountries();
    setCountriesRefreshing(false);
  };

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries;

    return countries.filter((c) => {
      const hay = `${c.country_name} ${c.iso2} ${c.iso3}`.toLowerCase();
      return hay.includes(q);
    });
  }, [countries, countrySearch]);

  const ensureCompanyCode = async () => {
    if (companyCode.trim()) return companyCode.trim();

    for (let i = 0; i < 8; i++) {
      const code = randomCompanyCode6();
      const { data, error } = await supabase
        .from("organisation")
        .select("id")
        .eq("company_code", code)
        .limit(1);

      // if uniqueness check fails, don't block the user
      if (error) {
        setCompanyCode(code);
        return code;
      }

      if (!data || data.length === 0) {
        setCompanyCode(code);
        return code;
      }
    }

    const fallback = randomCompanyCode6();
    setCompanyCode(fallback);
    return fallback;
  };

  const onPickOnMap = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLat(String(latitude));
    setLng(String(longitude));
  };

  const submit = async () => {
    if (!canSubmit || saving) return;

    if (!orgName.trim()) {
      Alert.alert("Chyba", "Zadaj názov organizácie.");
      return;
    }
    if (!selectedCountry) {
      Alert.alert("Chyba", "Vyber krajinu.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Chyba", "Zadaj mesto.");
      return;
    }
    if (!street.trim()) {
      Alert.alert("Chyba", "Zadaj ulicu (aj číslo).");
      return;
    }

    setSaving(true);

    const code = await ensureCompanyCode();

    const { data, error } = await supabase.rpc("create_organisation_with_hq", {
      p_nazov_org: orgName.trim(),
      p_company_code: onlyDigits(code),
      p_description: description.trim() || null,
      p_latitude: coords ? coords.latitude : null,
      p_longitude: coords ? coords.longitude : null,
      p_country_id: selectedCountry.id,
      p_city_name: city.trim(),
      p_street: street.trim(),
    });

    setSaving(false);

    if (error) {
      console.log("rpc create_organisation_with_hq error:", error);
      Alert.alert("Chyba", error.message);
      return;
    }

    const orgId = data as number | null;

    Alert.alert(
      "Hotovo",
      `Organizácia bola vytvorená.\nID: ${orgId ?? "?"}\nCompany code: ${code}`,
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const initialRegion = useMemo(() => {
    const base = coords ?? { latitude: 48.1486, longitude: 17.1077 };
    return { ...base, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }, [coords]);

  const selectedCountryLabel = selectedCountry
    ? `${selectedCountry.country_name} (${selectedCountry.iso2})`
    : "Vyber krajinu";

  const placesApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nová organizácia</Text>

        <Text style={styles.sectionLabel}>Názov organizácie</Text>
        <TextInput
          value={orgName}
          onChangeText={setOrgName}
          placeholder="Názov organizácie"
          placeholderTextColor="#A8A8A8"
          style={styles.input}
        />

        <Text style={styles.sectionLabel}>Popis</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Stručný popis"
          placeholderTextColor="#A8A8A8"
          style={[styles.input, styles.textArea]}
          multiline
        />

        <Text style={styles.sectionLabel}>Krajina (sídlo)</Text>
        <Pressable
          style={[styles.input, styles.dropdownInput]}
          onPress={() => setCountryOpen(true)}
        >
          <Text
            style={{
              fontSize: 16,
              color: selectedCountry ? "#111" : "#A8A8A8",
              fontWeight: "700",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {selectedCountryLabel}
          </Text>
          <FontAwesome name="chevron-down" size={16} color="#999" />
        </Pressable>

        <Text style={styles.sectionLabel}>Mesto (sídlo)</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Napr. Prešov"
          placeholderTextColor="#A8A8A8"
          style={styles.input}
        />

        <Text style={styles.sectionLabel}>Ulica + číslo (sídlo)</Text>
        <TextInput
          value={street}
          onChangeText={setStreet}
          placeholder="Napr. Hlavná 12"
          placeholderTextColor="#A8A8A8"
          style={styles.input}
        />

        <View style={styles.coordsHeader}>
          <Text style={styles.sectionLabel}>Súradnice (voliteľné)</Text>

          <Pressable style={styles.mapBtn} onPress={() => setMapOpen(true)}>
            <FontAwesome name="map" size={16} color={ORANGE} />
            <Text style={styles.mapBtnText}>Vybrať na mape</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <TextInput
            value={lat}
            onChangeText={setLat}
            placeholder="Latitude"
            placeholderTextColor="#A8A8A8"
            style={[styles.input, styles.half]}
            keyboardType="numeric"
          />
          <TextInput
            value={lng}
            onChangeText={setLng}
            placeholder="Longitude"
            placeholderTextColor="#A8A8A8"
            style={[styles.input, styles.half]}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Company code</Text>
          <Pressable
            style={styles.codePill}
            onPress={async () => {
              const c = await ensureCompanyCode();
              Alert.alert("Company code", c);
            }}
          >
            <Text style={styles.codePillText}>
              {companyCode.trim() ? companyCode : "Vygeneruje sa automaticky"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.submitBtn, (!canSubmit || saving) && { opacity: 0.6 }]}
          onPress={submit}
          disabled={!canSubmit || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Hotovo</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.cancelLink}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelText}>Zrušiť</Text>
        </Pressable>
      </ScrollView>

      {/* COUNTRY MODAL */}
      <Modal
        visible={countryOpen}
        animationType="slide"
        onRequestClose={() => setCountryOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitle}>Vyber krajinu</Text>
            <Pressable
              onPress={() => setCountryOpen(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>Hotovo</Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={styles.searchBox}>
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Hľadať (názov, ISO2, ISO3)"
                placeholderTextColor="#A8A8A8"
                style={styles.searchInput}
              />
              <FontAwesome name="search" size={18} color="#111" />
            </View>
          </View>

          {countriesLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={ORANGE} />
            </View>
          ) : (
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => String(item.id)}
              refreshControl={
                <RefreshControl
                  refreshing={countriesRefreshing}
                  onRefresh={onRefreshCountries}
                />
              }
              contentContainerStyle={{ padding: 16, paddingTop: 12 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={
                <View style={{ paddingTop: 40, alignItems: "center" }}>
                  <Text style={{ color: "#777", fontWeight: "700" }}>
                    Žiadne výsledky
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const selected = selectedCountry?.id === item.id;
                return (
                  <Pressable
                    style={[
                      styles.countryRow,
                      selected && { borderColor: ORANGE, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setSelectedCountry(item);
                      setCountryOpen(false);
                      setCountrySearch("");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.countryName} numberOfLines={1}>
                        {item.country_name}
                      </Text>
                      <Text style={styles.countryIso}>
                        {item.iso2} · {item.iso3}
                      </Text>
                    </View>
                    {selected && (
                      <FontAwesome name="check" size={18} color={ORANGE} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* MAP MODAL */}
      <Modal
        visible={mapOpen}
        animationType="slide"
        onRequestClose={() => setMapOpen(false)}
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapTopBar}>
            <View style={{ flex: 1, marginRight: 10, zIndex: 10 }}>
              {placesApiKey ? (
                <GooglePlacesAutocomplete
                  placeholder="Hľadať miesto / adresu"
                  fetchDetails
                  enablePoweredByContainer={false}
                  query={{
                    key: placesApiKey,
                    language: "sk",
                    // components: "country:sk",
                  }}
                  styles={{
                    container: { flex: 1 },
                    textInput: styles.mapSearchInput,
                    listView: styles.mapSearchList,
                  }}
                  onPress={(data, details) => {
                    const loc = details?.geometry?.location;
                    if (!loc) return;

                    const latitude = loc.lat;
                    const longitude = loc.lng;

                    setLat(String(latitude));
                    setLng(String(longitude));

                    mapRef.current?.animateToRegion(
                      {
                        latitude,
                        longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      },
                      350,
                    );
                  }}
                />
              ) : (
                <View style={styles.mapSearchFallback}>
                  <Text style={styles.mapSearchFallbackText}>
                    Chýba EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (Places search je
                    vypnutý).
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => setMapOpen(false)}
              style={styles.mapClose}
            >
              <Text style={styles.mapCloseText}>Hotovo</Text>
            </Pressable>
          </View>

          <MapView
            ref={(r) => (mapRef.current = r)}
            style={styles.map}
            initialRegion={initialRegion}
            onPress={onPickOnMap}
          >
            {coords && <Marker coordinate={coords} />}
          </MapView>

          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>
              Ťukni do mapy pre nastavenie markeru. Súradnice sa vyplnia
              automaticky.
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 26,
  },

  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#111",
    marginBottom: 18,
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },

  input: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCDCDC",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111",
    marginBottom: 12,
    justifyContent: "center",
  },

  textArea: {
    height: 92,
    paddingTop: 14,
    textAlignVertical: "top",
  },

  dropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },

  coordsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 8,
  },

  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ORANGE,
    backgroundColor: "#fff",
  },
  mapBtnText: {
    color: ORANGE,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  codeRow: { marginTop: 6, marginBottom: 6 },
  codeLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#444",
    marginBottom: 8,
  },
  codePill: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#F6F7FB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  codePillText: { fontWeight: "900", color: "#333" },

  submitBtn: {
    height: 62,
    borderRadius: 16,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "900" },

  cancelLink: { alignSelf: "center", marginTop: 14, paddingVertical: 10 },
  cancelText: { color: "#666", fontWeight: "800" },

  // modal
  modalWrap: { flex: 1, backgroundColor: "#fff" },
  modalTopBar: {
    paddingTop: Platform.OS === "ios" ? 56 : 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  modalClose: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCloseText: { color: "#fff", fontWeight: "900" },

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
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginRight: 10,
    fontSize: 15,
    color: "#111",
  },

  countryRow: {
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: "#F6F7FB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F6F7FB",
  },
  countryName: { fontSize: 16, fontWeight: "900", color: "#111" },
  countryIso: { fontSize: 13, fontWeight: "800", color: "#666", marginTop: 3 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // map
  mapContainer: { flex: 1, backgroundColor: "#fff" },
  mapTopBar: {
    paddingTop: Platform.OS === "ios" ? 56 : 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    gap: 10,
    zIndex: 20,
  },

  mapSearchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#fff",
  },
  mapSearchList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    marginTop: 8,
  },
  mapSearchFallback: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  mapSearchFallbackText: { fontSize: 12, color: "#666", fontWeight: "700" },

  mapTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  mapClose: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mapCloseText: { color: "#fff", fontWeight: "900" },
  map: { flex: 1 },
  mapHint: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    backgroundColor: "#fff",
  },
  mapHintText: { color: "#666", fontWeight: "700" },
});
