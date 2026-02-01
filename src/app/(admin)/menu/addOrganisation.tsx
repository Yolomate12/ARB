import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

export default function NewOrganisationScreen() {
  const router = useRouter();

  // UI podľa fotky (bez vytvárania účtu)
  const [orgName, setOrgName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [country, setCountry] = useState("");

  // lokácia
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  // map modal
  const [mapOpen, setMapOpen] = useState(false);

  // company code auto
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

    // coords sú voliteľné – ale ak vyplníš jedno, musí byť aj druhé a číslo
    const anyCoord = lat.trim() || lng.trim();
    if (anyCoord && !coords) return false;

    return true;
  }, [orgName, lat, lng, coords]);

  const ensureCompanyCode = async () => {
    if (companyCode.trim()) return companyCode.trim();

    for (let i = 0; i < 6; i++) {
      const code = randomCompanyCode6();
      const { data, error } = await supabase
        .from("organisation")
        .select("id")
        .eq("company_code", code)
        .limit(1);

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
    if (!canSubmit) return;

    if (!orgName.trim()) {
      Alert.alert("Chyba", "Zadaj názov organizácie.");
      return;
    }

    setSaving(true);

    const code = await ensureCompanyCode();

    const payload = {
      nazov_org: orgName.trim(),
      company_code: onlyDigits(code),
      latitude: coords ? coords.latitude : null,
      longitude: coords ? coords.longitude : null,
    };

    // NOTE: shortDesc/country sú len UI. Ak ich chceš ukladať, treba pridať stĺpce do DB.
    // payload.description = shortDesc.trim() || null
    // payload.country = country.trim() || null

    const { error } = await supabase
      .from("organisation")
      .insert(payload)
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      console.log("insert organisation error:", error);
      Alert.alert("Chyba", error.message);
      return;
    }

    Alert.alert(
      "Hotovo",
      `Organizácia bola vytvorená.\nCompany code: ${code}`,
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const initialRegion = useMemo(() => {
    const base = coords ?? { latitude: 48.1486, longitude: 17.1077 };
    return {
      ...base,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [coords]);

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

        <TextInput
          value={shortDesc}
          onChangeText={setShortDesc}
          placeholder="Stručný popis"
          placeholderTextColor="#A8A8A8"
          style={styles.input}
        />

        <TextInput
          value={country}
          onChangeText={setCountry}
          placeholder="Krajina"
          placeholderTextColor="#A8A8A8"
          style={styles.input}
        />

        <View style={styles.coordsHeader}>
          <Text style={styles.sectionLabel}>Súradnice</Text>

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

      {/* MAP MODAL */}
      <Modal
        visible={mapOpen}
        animationType="slide"
        onRequestClose={() => setMapOpen(false)}
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapTopBar}>
            <Text style={styles.mapTitle}>Vyber polohu</Text>
            <Pressable
              onPress={() => setMapOpen(false)}
              style={styles.mapClose}
            >
              <Text style={styles.mapCloseText}>Hotovo</Text>
            </Pressable>
          </View>

          <MapView
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
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },

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

  codeRow: {
    marginTop: 6,
    marginBottom: 6,
  },
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
  codePillText: {
    fontWeight: "900",
    color: "#333",
  },

  submitBtn: {
    height: 62,
    borderRadius: 16,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  submitText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },

  cancelLink: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 10,
  },
  cancelText: {
    color: "#666",
    fontWeight: "800",
  },

  // MAP
  mapContainer: { flex: 1, backgroundColor: "#fff" },
  mapTopBar: {
    paddingTop: Platform.OS === "ios" ? 56 : 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
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
