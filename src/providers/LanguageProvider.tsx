import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

type Lang = "sk" | "en";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  t: (key: keyof (typeof dict)["sk"]) => string;
};

const STORAGE_KEY = "app_lang";

const dict = {
  sk: {
    // --- two.tsx
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
    tankGlass: "Sklo",
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

    // --- CityListScreen + všeobecné
    searchCityStreet: "Hľadaj mesto alebo ulicu...",
    loadingProfile: "Načítavam profil...",
    unknownOrganisation: "Neznáma organizácia",
    notSet: "Nie je nastavená",
    yourBranches: "Vaše pobočky",
    noBranchesFound: "Nenašli sa žiadne pobočky.",
    errorLabel: "Chyba",
    errorLoadingCities: "Chyba pri načítaní miest",
  },
  en: {
    // --- two.tsx
    options: "Options",
    devices: "Devices",
    notifications: "Notifications",
    logout: "Sign out",
    logoutSubtitle: "Sign out of your account",
    binsOver80: "Bins over 80%",
    joinCompany: "Join company",
    joinSubtitle: "Enter code / add organization",
    joinTitle: "Join a company",
    joinPlaceholder: "Enter company code",
    searchStreet: "Search street...",
    searchDevice: "Search device...",
    statusLabel: "Status",
    noDevicesFound: "No devices found.",
    errorLoadingDevices: "Error while loading devices",
    tankPlastic: "Plastic",
    tankPaper: "Paper",
    tankGlass: "Glass",
    tankMixed: "Mixed",
    tankUnknown: "Unknown",
    noStreetsFound: "No streets found.",
    joinButton: "Join",
    pullDownToClose: "Pull down on the handle to close.",
    noneOver80: "No bin is filled above 80%",
    language: "Language",
    languageTitle: "App language",
    slovak: "Slovak",
    english: "English",
    online: "Online",
    offline: "Offline",

    // --- CityListScreen + general
    searchCityStreet: "Search city or street...",
    loadingProfile: "Loading profile...",
    unknownOrganisation: "Unknown organisation",
    notSet: "Not set",
    yourBranches: "Your branches",
    noBranchesFound: "No branches found.",
    errorLabel: "Error",
    errorLoadingCities: "Error while loading cities",
  },
} as const;

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
      t: (key) => dict[lang][key],
    };
  }, [lang]);

  // nech nevzniká "bliknutie" / null render
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
