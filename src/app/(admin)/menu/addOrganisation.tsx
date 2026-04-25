import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";
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

export default function AddOrganisationScreen() {
  const router = useRouter();
  const { t } = useLanguage();
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
    const latOk = lat.trim() !== "" && !Number.isNaN(la);
    const lngOk = lng.trim() !== "" && !Number.isNaN(lo);
    return latOk && lngOk ? { latitude: la, longitude: lo } : null;
  }, [lat, lng]);

  const canSubmit = useMemo(() => {
    if (!orgName.trim()) return false;

    if (!selectedCountry) return false;
    if (!city.trim()) return false;
    if (!street.trim()) return false;

    // coords optional, but if one is filled, both must be valid numbers
    const anyCoord = lat.trim() !== "" || lng.trim() !== "";
    if (anyCoord && !coords) return false;

    return true;
  }, [orgName, selectedCountry, city, street, lat, lng, coords]);

  const loadCountries = async () => {
    setCountriesLoading(true);
    try {
      const { data, error } = await supabase
        .from("country")
        .select("id,country_name,iso2,iso3")
        .order("country_name", { ascending: true });

      if (error) {
        console.log("country load error:", error);
        setCountries([]);
        return;
      }

      setCountries((data ?? []) as CountryRow[]);
    } finally {
      setCountriesLoading(false);
    }
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

      // ak check padne, neblokuj usera
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

    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      250,
    );
  };

  const submit = async () => {
    if (!canSubmit || saving) return;

    if (!orgName.trim()) {
      Alert.alert(t("errorLabel"), t("orgNameRequired"));
      return;
    }
    if (!selectedCountry) {
      Alert.alert(t("errorLabel"), t("countryRequired"));
      return;
    }
    if (!city.trim()) {
      Alert.alert(t("errorLabel"), t("cityRequired"));
      return;
    }
    if (!street.trim()) {
      Alert.alert(t("errorLabel"), t("streetRequired"));
      return;
    }

    setSaving(true);

    try {
      const code = await ensureCompanyCode();

      const { data, error } = await supabase.rpc(
        "create_organisation_with_hq",
        {
          p_nazov_org: orgName.trim(),
          p_company_code: onlyDigits(code),
          p_description: description.trim() || null,
          p_latitude: coords ? coords.latitude : null,
          p_longitude: coords ? coords.longitude : null,
          p_country_id: selectedCountry.id,
          p_city_name: city.trim(),
          p_street: street.trim(),
        },
      );

      if (error) {
        console.log("rpc create_organisation_with_hq error:", error);
        Alert.alert(t("errorLabel"), error.message);
        return;
      }

      const orgId = data as number | null;

      Alert.alert(
        t("doneTitle"),
        `${t("orgCreated")}\nID: ${orgId ?? "?"}\n${t("companyCode")}: ${code}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } finally {
      setSaving(false);
    }
  };

  const initialRegion = useMemo(() => {
    const base = coords ?? { latitude: 48.1486, longitude: 17.1077 };
    return { ...base, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }, [coords]);

  const selectedCountryLabel = selectedCountry
    ? `${selectedCountry.country_name} (${selectedCountry.iso2})`
    : t("pickCountry");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t("newOrganisationTitle")}</Text>

        <Text style={styles.sectionLabel}>{t("orgNameLabel")}</Text>
        <TextInput
          value={orgName}
          onChangeText={setOrgName}
          placeholder={t("orgNamePlaceholder")}
          placeholderTextColor="#A8A8A8"
          style={styles.input}
        />

        <Text style={styles.sectionLabel}>{t("descriptionLabel")}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("descriptionPlaceholder")}
          placeholderTextColor="#A8A8A8"
          style={[styles.input, styles.textArea]}
          multiline
        />

        <Text style={styles.sectionLabel}>{t("hqCountryLabel")}</Text>
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

        <Text style={styles.sectionLabel}>{t("hqCityLabel")}</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={t("hqCityPlaceholder")}
          placeholderTextColor="#A8A8A8"
          style={styles.input}
        />

        <Text style={styles.sectionLabel}>{t("hqStreetLabel")}</Text>
        <TextInput
          value={street}
          onChangeText={setStreet}
          placeholder={t("hqStreetPlaceholder")}
          placeholderTextColor="#A8A8A8"
          style={styles.input}
        />

        <View style={styles.coordsHeader}>
          <Text style={styles.sectionLabel}>{t("coordsOptional")}</Text>

          <Pressable style={styles.mapBtn} onPress={() => setMapOpen(true)}>
            <FontAwesome name="map" size={16} color={ORANGE} />
            <Text style={styles.mapBtnText}>{t("pickOnMap")}</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <TextInput
            value={lat}
            onChangeText={setLat}
            placeholder={t("latitude")}
            placeholderTextColor="#A8A8A8"
            style={[styles.input, styles.half]}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={lng}
            onChangeText={setLng}
            placeholder={t("longitude")}
            placeholderTextColor="#A8A8A8"
            style={[styles.input, styles.half]}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>{t("companyCode")}</Text>
          <Pressable
            style={styles.codePill}
            onPress={async () => {
              const c = await ensureCompanyCode();
              Alert.alert(t("companyCode"), c);
            }}
          >
            <Text style={styles.codePillText}>
              {companyCode.trim() ? companyCode : t("companyCodeAuto")}
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
            <Text style={styles.submitText}>{t("doneButton")}</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.cancelLink}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelText}>{t("cancel")}</Text>
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
            <Text style={styles.modalTitle}>{t("pickCountryTitle")}</Text>
            <Pressable
              onPress={() => setCountryOpen(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>{t("doneButton")}</Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={styles.searchBox}>
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder={t("countrySearchPlaceholder")}
                placeholderTextColor="#A8A8A8"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
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
                    {t("noResults")}
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

      {/* MAP MODAL (bez vyhľadávania) */}
      <Modal
        visible={mapOpen}
        animationType="slide"
        onRequestClose={() => setMapOpen(false)}
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapTopBar}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.mapSearchFallback}>
                <Text style={styles.mapSearchFallbackText}>
                  Klikni na mapu pre výber polohy
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setMapOpen(false)}
              style={styles.mapClose}
            >
              <Text style={styles.mapCloseText}>{t("doneButton")}</Text>
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
            <Text style={styles.mapHintText}>{t("mapHint")}</Text>
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
