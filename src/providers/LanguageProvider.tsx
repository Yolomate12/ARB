import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Lang = "sk" | "en";

const STORAGE_KEY = "app_lang";

const dict = {
  sk: {
    // --- common / shared
    back: "Späť",
    cancel: "Zrušiť",
    remove: "Odobrať",
    save: "Uložiť",
    saving: "Ukladám...",
    loading: "Načítavam...",
    errorTitle: "Chyba",
    errorLabel: "Chyba",

    // --- two.tsx
    adminAccount: "ADMIN ÚČET",
    account: "Účet",
    options: "Možnosti",
    devices: "Zariadenia",
    notifications: "Notifikácie",
    binsOver80: "Koše nad 80 %",
    joinCompany: "Pripojiť firmu",
    joinSubtitle: "Zadať kód / pridať organizáciu",
    joinTitle: "Pripojenie ku spoločnosti",
    joinPlaceholder: "Zadaj kód spoločnosti",
    joinButton: "Pripojiť sa",
    pullDownToClose: "Potiahni dole za čiaru pre zavretie.",
    noneOver80: "Žiadny kôš nie je naplnený nad 80 %",
    searchStreet: "Hľadaj ulicu...",
    searchDevice: "Hľadaj zariadenie...",
    statusLabel: "Status",
    noDevicesFound: "Nenašli sa žiadne zariadenia.",
    errorLoadingDevices: "Chyba pri načítaní zariadení",
    tankPlastic: "Plast",
    tankPaper: "Papier",
    tankMetal: "Kov",
    tankMixed: "Komunál",
    tankUnknown: "Neznáme",
    noStreetsFound: "Nenašli sa žiadne ulice.",
    language: "Jazyk",
    languageTitle: "Jazyk aplikácie",
    slovak: "Slovenčina",
    english: "Angličtina",
    logout: "Odhlásiť sa",
    logoutSubtitle: "Odhlásiť sa z účtu",
    online: "Online",
    offline: "Offline",

    // --- Admin org list
    adminOrganizationsTitle: "Organizácie",
    adminNewOrganisation: "NOVÁ ORGANIZÁCIA",
    adminNewDevice: "NOVÉ ZARIADENIE",
    adminNoOrganizations: "Žiadne organizácie",
    adminUnnamed: "Bez názvu",
    searchPlaceholder: "Hľadať...",

    // --- CityListScreen + general
    searchCityStreet: "Hľadaj mesto alebo ulicu...",
    loadingProfile: "Načítavam profil...",
    unknownOrganisation: "Neznáma organizácia",
    notSet: "Nie je nastavená",
    yourBranches: "Vaše pobočky",
    noBranchesFound: "Nenašli sa žiadne pobočky.",
    errorLoadingCities: "Chyba pri načítaní miest",

    // --- New organisation
    newOrganisationTitle: "Nová organizácia",
    orgNameLabel: "Názov organizácie",
    orgNamePlaceholder: "Názov organizácie",
    descriptionLabel: "Popis",
    descriptionPlaceholder: "Stručný popis",
    hqCountryLabel: "Krajina (sídlo)",
    hqCityLabel: "Mesto (sídlo)",
    hqCityPlaceholder: "Napr. Prešov",
    hqStreetLabel: "Ulica + číslo (sídlo)",
    hqStreetPlaceholder: "Napr. Hlavná 12",
    coordsOptional: "Súradnice (voliteľné)",
    pickOnMap: "Vybrať na mape",
    latitude: "Latitude",
    longitude: "Longitude",
    companyCode: "Company code",
    companyCodeAuto: "Vygeneruje sa automaticky",
    doneButton: "Hotovo",
    pickCountryTitle: "Vyber krajinu",
    countrySearchPlaceholder: "Hľadať (názov, ISO2, ISO3)",
    noResults: "Žiadne výsledky",
    mapSearchPlaceholder: "Hľadať miesto / adresu",
    mapHint:
      "Ťukni do mapy pre nastavenie markeru. Súradnice sa vyplnia automaticky.",
    missingPlacesKey: "Chýba GOOGLE_MAPS_API_KEY (Places search je vypnutý).",
    orgCreated: "Organizácia bola vytvorená.",
    orgNameRequired: "Zadaj názov organizácie.",
    countryRequired: "Vyber krajinu.",
    cityRequired: "Zadaj mesto.",
    streetRequired: "Zadaj ulicu (aj číslo).",

    // --- New bin
    newBinTitle: "Nový kontajner",
    organisation: "Organizácia",
    device: "Zariadenie",
    address: "Adresa",
    streetAndNumber: "Ulica a číslo",
    city: "Mesto",
    pickOrganisationPlaceholder: "Vybrať organizáciu",
    pickAvailableDevicePlaceholder: "Vybrať dostupné zariadenie",
    pickCountry: "Vybrať krajinu",
    refresh: "Obnoviť",
    noItems: "Žiadne položky.",
    doneTitle: "Hotovo",
    binCreated: "Kontajner bol pridaný",
    errorSaveBin: "Nepodarilo sa uložiť kontajner.",
    errorLoadAvailableDevices: "Nepodarilo sa načítať dostupné zariadenia.",
    errorLoadOrganisations: "Nepodarilo sa načítať organizácie.",
    errorLoadCountries: "Nepodarilo sa načítať krajiny (policy/RLS?).",
    invalidOrganisation: "Neplatná organizácia.",
    deviceAlreadyAssigned: "Toto zariadenie už je priradené v inom kontajneri.",
    countryNotFound: "Krajina nebola nájdená v DB (country_name mismatch).",
    noPermissionsRls: "Nemáš práva na vytvorenie záznamu (RLS).",
    retryOrgs: "Organizácie",
    retryDevices: "Zariadenia",
    retryCountries: "Krajiny",
    organisationHash: "Organizácia #",

    // --- Admin organisation devices
    organisationId: "ID organizácie",
    invalidOrganisationId: "Neplatné ID organizácie.",
    noName: "Bez názvu",
    noPermissionsRlsRead: "Nemáš práva čítať dáta (RLS).",
    noDevicesInOrganisation: "Žiadne zariadenia",
    binDeviceTitle: "Kôš / zariadenie",
    deviceNameLabel: "Názov zariadenia",
    deviceNamePlaceholder: "Názov",
    deviceNameEmpty: "Názov zariadenia nemôže byť prázdny.",
    errorSavingChanges: "Nepodarilo sa uložiť zmeny.",
    removeBinTitle: "Odobrať kôš",
    removeBinConfirm:
      "Naozaj chceš odstrániť tento kôš? (Vymaže sa riadok z tabuľky bin.)",
    nothingDeletedTitle: "Nezmazalo sa nič",
    nothingDeletedBody:
      "Delete vrátil 0 riadkov. Skontroluj RLS policy na bin.",
    errorDeletingBin: "Nepodarilo sa vymazať z bin.",
    removeBinFromOrg: "Odobrať Kôš",
    DeleteOrg: "Odstrániť Org",
  },

  en: {
    // --- common / shared
    DeleteOrg: "Delete Org",
    back: "Back",
    cancel: "Cancel",
    remove: "Remove",
    save: "Save",
    saving: "Saving...",
    loading: "Loading...",
    errorTitle: "Error",
    errorLabel: "Error",

    // --- two.tsx
    adminAccount: "ADMIN ACCOUNT",
    account: "Account",
    options: "Options",
    devices: "Devices",
    notifications: "Notifications",
    binsOver80: "Bins over 80%",
    joinCompany: "Join company",
    joinSubtitle: "Enter code / add organization",
    joinTitle: "Join a company",
    joinPlaceholder: "Enter company code",
    joinButton: "Join",
    pullDownToClose: "Pull down on the handle to close.",
    noneOver80: "No bin is filled above 80%",
    searchStreet: "Search street...",
    searchDevice: "Search device...",
    statusLabel: "Status",
    noDevicesFound: "No devices found.",
    errorLoadingDevices: "Error while loading devices",
    tankPlastic: "Plastic",
    tankPaper: "Paper",
    tankMetal: "Metal",
    tankMixed: "Mixed",
    tankUnknown: "Unknown",
    noStreetsFound: "No streets found.",
    language: "Language",
    languageTitle: "App language",
    slovak: "Slovak",
    english: "English",
    logout: "Sign out",
    logoutSubtitle: "Sign out of your account",
    online: "Online",
    offline: "Offline",

    // --- Admin org list
    adminOrganizationsTitle: "Organizations",
    adminNewOrganisation: "NEW ORGANIZATION",
    adminNewDevice: "NEW DEVICE",
    adminNoOrganizations: "No organizations",
    adminUnnamed: "Untitled",
    searchPlaceholder: "Search...",

    // --- CityListScreen + general
    searchCityStreet: "Search city or street...",
    loadingProfile: "Loading profile...",
    unknownOrganisation: "Unknown organisation",
    notSet: "Not set",
    yourBranches: "Your branches",
    noBranchesFound: "No branches found.",
    errorLoadingCities: "Error while loading cities",

    // --- New organisation
    newOrganisationTitle: "New organization",
    orgNameLabel: "Organization name",
    orgNamePlaceholder: "Organization name",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Short description",
    hqCountryLabel: "Country (HQ)",
    hqCityLabel: "City (HQ)",
    hqCityPlaceholder: "e.g. Presov",
    hqStreetLabel: "Street + number (HQ)",
    hqStreetPlaceholder: "e.g. Main St 12",
    coordsOptional: "Coordinates (optional)",
    pickOnMap: "Pick on map",
    latitude: "Latitude",
    longitude: "Longitude",
    companyCode: "Company code",
    companyCodeAuto: "Will be generated automatically",
    doneButton: "Done",
    pickCountryTitle: "Select country",
    countrySearchPlaceholder: "Search (name, ISO2, ISO3)",
    noResults: "No results",
    mapSearchPlaceholder: "Search place / address",
    mapHint:
      "Tap on the map to place a marker. Coordinates will be filled automatically.",
    missingPlacesKey:
      "Missing GOOGLE_MAPS_API_KEY (Places search is disabled).",
    orgCreated: "Organization has been created.",
    orgNameRequired: "Enter the organization name.",
    countryRequired: "Select a country.",
    cityRequired: "Enter a city.",
    streetRequired: "Enter a street (including number).",

    // --- New bin
    newBinTitle: "New bin",
    organisation: "Organization",
    device: "Device",
    address: "Address",
    streetAndNumber: "Street and number",
    city: "City",
    pickOrganisationPlaceholder: "Select organization",
    pickAvailableDevicePlaceholder: "Select available device",
    pickCountry: "Select country",
    refresh: "Refresh",
    noItems: "No items.",
    doneTitle: "Done",
    binCreated: "Bin has been created",
    errorSaveBin: "Failed to save bin.",
    errorLoadAvailableDevices: "Failed to load available devices.",
    errorLoadOrganisations: "Failed to load organizations.",
    errorLoadCountries: "Failed to load countries (policy/RLS?).",
    invalidOrganisation: "Invalid organization.",
    deviceAlreadyAssigned: "This device is already assigned to another bin.",
    countryNotFound: "Country was not found in DB (country_name mismatch).",
    noPermissionsRls: "You don't have permission to create this record (RLS).",
    retryOrgs: "Organizations",
    retryDevices: "Devices",
    retryCountries: "Countries",
    organisationHash: "Organization #",

    // --- Admin organisation devices
    organisationId: "Organization ID",
    invalidOrganisationId: "Invalid organization ID.",
    noName: "Untitled",
    noPermissionsRlsRead: "You don't have permission to read data (RLS).",
    noDevicesInOrganisation: "No devices",
    binDeviceTitle: "Bin / device",
    deviceNameLabel: "Device name",
    deviceNamePlaceholder: "Name",
    deviceNameEmpty: "Device name cannot be empty.",
    errorSavingChanges: "Failed to save changes.",
    removeBinTitle: "Remove bin",
    removeBinConfirm:
      "Do you really want to remove this bin? (This deletes a row from the bin table.)",
    nothingDeletedTitle: "Nothing deleted",
    nothingDeletedBody: "Delete returned 0 rows. Check your RLS policy on bin.",
    errorDeletingBin: "Failed to delete from bin.",
    removeBinFromOrg: "Remove bin ",
  },
} as const;

type DictKey = keyof typeof dict.sk;

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  t: (key: DictKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sk");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "sk" || saved === "en") setLangState(saved);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setLang = async (newLang: Lang) => {
    setLangState(newLang);
    await AsyncStorage.setItem(STORAGE_KEY, newLang);
  };

  const value = useMemo<LanguageContextValue>(() => {
    return {
      lang,
      setLang,
      t: (key) => {
        // fallback: current lang -> en -> key
        return dict[lang][key] ?? dict.en[key] ?? String(key);
      },
    };
  }, [lang]);

  // ak chceš úplne eliminovať "bliknutie", daj: if (!loaded) return null;
  if (!loaded) return <>{children}</>;

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
