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
  RefreshControl,
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

type CountryRow = {
  id: number;
  country_name: string;
  iso2: string;
  iso3: string;
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

  // devices
  const [deviceOptions, setDeviceOptions] = useState<Option[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Option | null>(null);

  // orgs
  const [orgOptions, setOrgOptions] = useState<Option[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Option | null>(null);

  // address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");

  // countries dropdown
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesRefreshing, setCountriesRefreshing] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryRow | null>(
    null,
  );

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries;

    return countries.filter((c) => {
      const hay = `${c.country_name} ${c.iso2} ${c.iso3}`.toLowerCase();
      return hay.includes(q);
    });
  }, [countries, countrySearch]);

  const canSubmit = useMemo(() => {
    return (
      !!selectedOrg &&
      !!selectedDevice &&
      !!selectedCountry &&
      street.trim().length > 0 &&
      city.trim().length > 0 &&
      !loadingDevices &&
      !loadingOrgs &&
      !countriesLoading &&
      !submitting
    );
  }, [
    selectedOrg,
    selectedDevice,
    selectedCountry,
    street,
    city,
    loadingDevices,
    loadingOrgs,
    countriesLoading,
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

      if (selectedDevice && !opts.some((o) => o.value === selectedDevice.value))
        setSelectedDevice(null);
    } catch (e: any) {
      setError(e?.message ?? "Nepodarilo sa načítať dostupné zariadenia.");
    } finally {
      setLoadingDevices(false);
    }
  }

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

      if (selectedOrg && !opts.some((o) => o.value === selectedOrg.value))
        setSelectedOrg(null);
    } catch (e: any) {
      setError(e?.message ?? "Nepodarilo sa načítať organizácie.");
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function loadCountries() {
    setCountriesLoading(true);
    setError(null);

    try {
      const { data, error: cErr } = await supabase
        .from("country")
        .select("id,country_name,iso2,iso3")
        .order("country_name", { ascending: true });

      if (cErr) throw cErr;

      setCountries((data ?? []) as CountryRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Nepodarilo sa načítať krajiny (policy/RLS?).");
      setCountries([]);
    } finally {
      setCountriesLoading(false);
    }
  }

  async function refreshCountries() {
    setCountriesRefreshing(true);
    await loadCountries();
    setCountriesRefreshing(false);
  }

  async function handleSubmit() {
    if (!selectedDevice || !selectedOrg || !selectedCountry) return;

    const p_device_id = selectedDevice.value;
    const p_org_id = Number(selectedOrg.value);

    if (!Number.isFinite(p_org_id)) {
      setError("Neplatná organizácia.");
      return;
    }

    const p_country_name = selectedCountry.country_name;
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

      // reset form
      setSelectedDevice(null);
      setStreet("");
      setCity("");
      setSelectedCountry(null);
      setCountrySearch("");

      // refresh available devices (to reflect that device got assigned)
      await loadAvailableDevices();

      Alert.alert("Hotovo", `Kontajner bol pridaný (bin id: ${binId}).`);
    } catch (e: any) {
      const raw = e?.message ?? "Nepodarilo sa uložiť kontajner.";

      let friendly = raw;
      if (typeof raw === "string") {
        const lower = raw.toLowerCase();
        if (lower.includes("already assigned")) {
          friendly = "Toto zariadenie už je priradené v inom kontajneri.";
          await loadAvailableDevices();
        } else if (lower.includes("country not found")) {
          friendly = "Krajina nebola nájdená v DB (country_name mismatch).";
        } else if (lower.includes("row-level security")) {
          friendly = "Nemáš práva na vytvorenie záznamu (RLS).";
        }
      }

      setError(friendly);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadOrganisations();
    loadAvailableDevices();
    loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countryLabel = selectedCountry
    ? `${selectedCountry.country_name} (${selectedCountry.iso2})`
    : "Vybrať krajinu";

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
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Pressable style={styles.smallBtn} onPress={loadOrganisations}>
                  <Text style={styles.smallBtnText}>Orgy</Text>
                </Pressable>
                <Pressable
                  style={styles.smallBtn}
                  onPress={loadAvailableDevices}
                >
                  <Text style={styles.smallBtnText}>Zariadenia</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={loadCountries}>
                  <Text style={styles.smallBtnText}>Krajiny</Text>
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

          {/* country dropdown */}
          <Pressable
            style={[styles.select, countriesLoading && { opacity: 0.7 }]}
            onPress={() => !countriesLoading && setCountryOpen(true)}
          >
            <Text
              style={[
                styles.selectText,
                !selectedCountry && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {countriesLoading ? "Načítavam..." : countryLabel}
            </Text>
            {countriesLoading ? <ActivityIndicator /> : <ChevronDown />}
          </Pressable>

          <Modal
            visible={countryOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setCountryOpen(false)}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setCountryOpen(false)}
            >
              <Pressable
                style={styles.modalCard}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={styles.modalTitle}>Vyber krajinu</Text>

                <View style={styles.searchBox}>
                  <TextInput
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    placeholder="Hľadať (názov, ISO2, ISO3)"
                    placeholderTextColor="#9AA0A6"
                    style={styles.searchInput}
                  />
                  <Text style={{ fontSize: 16 }}>🔎</Text>
                </View>

                {filteredCountries.length === 0 ? (
                  <View style={{ padding: 12 }}>
                    <Text style={{ color: "#444" }}>Žiadne položky.</Text>
                    <Pressable
                      style={[styles.smallBtn, { marginTop: 12 }]}
                      onPress={refreshCountries}
                    >
                      <Text style={styles.smallBtnText}>Obnoviť</Text>
                    </Pressable>
                  </View>
                ) : (
                  <FlatList
                    data={filteredCountries}
                    keyExtractor={(i) => String(i.id)}
                    refreshControl={
                      <RefreshControl
                        refreshing={countriesRefreshing}
                        onRefresh={refreshCountries}
                      />
                    }
                    ItemSeparatorComponent={() => (
                      <View style={styles.modalDivider} />
                    )}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.modalItem}
                        onPress={() => {
                          setSelectedCountry(item);
                          setCountryOpen(false);
                        }}
                      >
                        <Text style={styles.modalItemText}>
                          {item.country_name} ({item.iso2})
                        </Text>
                      </Pressable>
                    )}
                  />
                )}
              </Pressable>
            </Pressable>
          </Modal>

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
    maxHeight: "75%",
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

  searchBox: {
    height: 44,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    marginRight: 8,
  },
});
