import { supabase } from "@/lib/supabase";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

type AvailableDeviceRow = {
  id: string;
  name: string | null;
};

type OrganisationRow = {
  id: number;
  nazov_org: string | null;
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
                <Text style={{ color: "#444" }}>Žiadne položky.</Text>
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
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deviceOptions, setDeviceOptions] = useState<Option[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Option | null>(null);

  const [orgOptions, setOrgOptions] = useState<Option[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Option | null>(null);

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const canSubmit = useMemo(() => {
    return (
      !!selectedOrg &&
      !!selectedDevice &&
      street.trim().length > 0 &&
      city.trim().length > 0 &&
      country.trim().length > 0 &&
      !loadingDevices &&
      !loadingOrgs &&
      !submitting
    );
  }, [
    selectedOrg,
    selectedDevice,
    street,
    city,
    country,
    loadingDevices,
    loadingOrgs,
    submitting,
  ]);

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
        label: d.name ? `${d.name} (${d.id.slice(0, 8)})` : d.id,
      }));

      setDeviceOptions(opts);

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

  // DÔLEŽITÉ: Toto musíš napojiť na view/policy, aby si videl len orgy, ktoré smieš.
  // Zatiaľ to ťahá z organisation priamo.
  async function loadOrganisations() {
    setLoadingOrgs(true);
    setError(null);

    try {
      const { data, error: orgErr } = await supabase
        .from("organisation")
        .select("id, nazov_org")
        .order("nazov_org", { ascending: true });

      if (orgErr) throw orgErr;

      const rows = (data ?? []) as OrganisationRow[];

      const opts: Option[] = rows.map((o) => ({
        value: String(o.id),
        label: o.nazov_org ?? `Organisation #${o.id}`,
      }));

      setOrgOptions(opts);

      if (selectedOrg && !opts.some((o) => o.value === selectedOrg.value)) {
        setSelectedOrg(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Nepodarilo sa načítať organizácie.");
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function handleSubmit() {
    if (!selectedDevice || !selectedOrg) return;

    const p_device_id = selectedDevice.value;
    const p_org_id = Number(selectedOrg.value);

    if (!Number.isFinite(p_org_id)) {
      setError("Neplatná organizácia.");
      return;
    }

    const p_country_name = country.trim();
    const p_city_name = city.trim();
    const p_street = street.trim();

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc(
        "create_bin_with_address",
        {
          p_device_id,
          p_org_id,
          p_country_name,
          p_city_name,
          p_street,
        },
      );

      if (rpcErr) throw rpcErr;

      const binId = data as number;

      setSelectedDevice(null);
      setStreet("");
      setCity("");
      setCountry("");

      await loadAvailableDevices();

      Alert.alert("Hotovo", `Kontajner bol pridaný (bin id: ${binId}).`);
    } catch (e: any) {
      const raw = e?.message ?? "Nepodarilo sa uložiť kontajner.";

      let friendly = raw;
      if (typeof raw === "string") {
        const lower = raw.toLowerCase();
        if (lower.includes("not allowed"))
          friendly = "Nemáš právo zapisovať do tejto organizácie.";
        if (lower.includes("different organisation"))
          friendly = "Zariadenie patrí do inej organizácie.";
        if (lower.includes("already assigned")) {
          friendly = "Toto zariadenie už niekto priradil.";
          await loadAvailableDevices();
        }
        if (lower.includes("row-level security"))
          friendly = "Nemáš práva na vytvorenie záznamu (RLS).";
      }

      setError(friendly);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadOrganisations();
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
          <Text style={styles.title}>Nový kontajner</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable style={styles.smallBtn} onPress={loadOrganisations}>
                  <Text style={styles.smallBtnText}>Orgy</Text>
                </Pressable>
                <Pressable
                  style={styles.smallBtn}
                  onPress={loadAvailableDevices}
                >
                  <Text style={styles.smallBtnText}>Zariadenia</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Organizácia</Text>
          <SelectField
            placeholder="Vybrať organizáciu"
            value={selectedOrg}
            options={orgOptions}
            loading={loadingOrgs}
            onChange={setSelectedOrg}
            onRetry={loadOrganisations}
          />

          <Text style={styles.sectionLabel}>Zariadenie</Text>
          <SelectField
            placeholder="Vybrať dostupné zariadenie"
            value={selectedDevice}
            options={deviceOptions}
            loading={loadingDevices}
            onChange={setSelectedDevice}
            onRetry={loadAvailableDevices}
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
              (!canSubmit || submitting) && { opacity: 0.5 },
              pressed && canSubmit && !submitting ? { opacity: 0.85 } : null,
            ]}
            disabled={!canSubmit}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryBtnText}>Uložiť</Text>
            )}
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
