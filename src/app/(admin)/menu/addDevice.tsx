import { supabase } from "@/lib/supabase"; // uprav path podľa projektu
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type Option = { label: string; value: string };

// VIEW: available_devices musí mať aspoň stĺpce: id (uuid), name (text)
type AvailableDeviceRow = {
  id: string;
  name: string | null;
};

function ChevronDown({ color = "#8A8A8A" }: { color?: string }) {
  return <Text style={{ color, fontSize: 18, marginLeft: 8 }}>⌄</Text>;
}

function SelectField({
  placeholder,
  value,
  options,
  loading,
  onChange,
  onRetry,
}: {
  placeholder: string;
  value: Option | null;
  options: Option[];
  loading?: boolean;
  onChange: (opt: Option) => void;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={[styles.select, loading && { opacity: 0.7 }]}
        onPress={() => !loading && setOpen(true)}
      >
        <Text style={[styles.selectText, !value && styles.placeholderText]}>
          {loading ? "Načítavam..." : value ? value.label : placeholder}
        </Text>
        {loading ? <ActivityIndicator /> : <ChevronDown />}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{placeholder}</Text>

            {options.length === 0 ? (
              <View style={{ padding: 12 }}>
                <Text style={{ color: "#444" }}>
                  Žiadne dostupné zariadenia (všetky sú už priradené).
                </Text>
                {onRetry && (
                  <Pressable
                    style={[styles.smallBtn, { marginTop: 12 }]}
                    onPress={onRetry}
                  >
                    <Text style={styles.smallBtnText}>Obnoviť</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(i) => i.value}
                ItemSeparatorComponent={() => (
                  <View style={styles.modalDivider} />
                )}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function NewDeviceScreen() {
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deviceOptions, setDeviceOptions] = useState<Option[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Option | null>(null);

  const [deviceDesc, setDeviceDesc] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const canSubmit = useMemo(() => {
    // minimum validácia (uprav si podľa potreby)
    return (
      !!selectedDevice && street.trim().length > 0 && city.trim().length > 0
    );
  }, [selectedDevice, street, city]);

  async function loadAvailableDevices() {
    setLoadingDevices(true);
    setError(null);

    try {
      const { data, error: viewErr } = await supabase
        .from("available_devices")
        .select("id, name")
        .order("name", { ascending: true });

      if (viewErr) throw viewErr;

      const rows = (data ?? []) as AvailableDeviceRow[];

      const opts: Option[] = rows.map((d) => ({
        value: d.id,
        // odporúčanie: ak name nie je unikátne, pridaj suffix id
        label: d.name ? `${d.name} (${d.id.slice(0, 8)})` : d.id,
      }));

      setDeviceOptions(opts);

      // ak bolo vybrané zariadenie a už nie je available → zruš selection
      if (
        selectedDevice &&
        !opts.some((o) => o.value === selectedDevice.value)
      ) {
        setSelectedDevice(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Nepodarilo sa načítať dostupné zariadenia.");
    } finally {
      setLoadingDevices(false);
    }
  }

  useEffect(() => {
    loadAvailableDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Nové zariadenie</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.smallBtn} onPress={loadAvailableDevices}>
                <Text style={styles.smallBtnText}>Skúsiť znova</Text>
              </Pressable>
            </View>
          ) : null}

          <SelectField
            placeholder="Vybrať dostupné zariadenie"
            value={selectedDevice}
            options={deviceOptions}
            loading={loadingDevices}
            onChange={setSelectedDevice}
            onRetry={loadAvailableDevices}
          />

          <Text style={styles.sectionLabel}>Popis zariadenia</Text>
          <TextInput
            value={deviceDesc}
            onChangeText={setDeviceDesc}
            placeholder="Stručný popis"
            placeholderTextColor="#9AA0A6"
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Adresa</Text>
          <TextInput
            value={street}
            onChangeText={setStreet}
            placeholder="Ulica a číslo"
            placeholderTextColor="#9AA0A6"
            style={styles.input}
          />
          <TextInput
            value={zip}
            onChangeText={(t) => setZip(t.replace(/[^\d]/g, ""))}
            placeholder="PSČ"
            placeholderTextColor="#9AA0A6"
            keyboardType="number-pad"
            style={styles.input}
          />
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Mesto"
            placeholderTextColor="#9AA0A6"
            style={styles.input}
          />
          <TextInput
            value={country}
            onChangeText={setCountry}
            placeholder="Krajina"
            placeholderTextColor="#9AA0A6"
            style={styles.input}
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              (!canSubmit || loadingDevices) && { opacity: 0.5 },
              pressed && canSubmit && !loadingDevices
                ? { opacity: 0.85 }
                : null,
            ]}
            disabled={!canSubmit || loadingDevices}
            onPress={() => {
              // TODO: insert (address + bin) ideálne cez RPC transakciu
              // selectedDevice.value je id zariadenia
              console.log("SUBMIT", {
                deviceId: selectedDevice?.value,
                deviceDesc,
                street,
                zip,
                city,
                country,
              });
            }}
          >
            <Text style={styles.primaryBtnText}>Uložiť</Text>
          </Pressable>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BORDER = "#DADCE0";
const TEXT = "#111";
const ORANGE = "#F28C28";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "#fff",
  },
  title: {
    marginBottom: 18,
    fontSize: 34,
    fontWeight: "800",
    color: TEXT,
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: TEXT,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  select: {
    height: 56,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  selectText: {
    fontSize: 16,
    color: TEXT,
    flex: 1,
  },
  placeholderText: { color: "#9AA0A6" },

  primaryBtn: {
    marginTop: 18,
    height: 56,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  errorBox: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { color: "#991B1B", marginBottom: 10 },
  smallBtn: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallBtnText: { color: ORANGE, fontWeight: "800" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  modalDivider: { height: 1, backgroundColor: "#EEE" },
  modalItem: { paddingVertical: 14, paddingHorizontal: 10 },
  modalItemText: { fontSize: 16, color: TEXT },
});
