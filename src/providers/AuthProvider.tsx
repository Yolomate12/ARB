import { AUTH_STORAGE_KEY, supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Profile = {
  id: string;
  group?: string;
  username?: string;
};

type AuthData = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthData>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // aby sa fetchProfile nepúšťal paralelne a neprepisoval sa
  const profileFetchId = useRef(0);

  const fetchProfile = async (userId: string) => {
    const current = ++profileFetchId.current;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, group, username")
      .eq("id", userId)
      .single();

    // ak medzičasom prišiel nový request, tento ignoruj
    if (current !== profileFetchId.current) return;

    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data);
  };

  // "hard" signOut – vyčistí aj lokálny token (fix na Refresh Token Not Found)
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // nič – aj keď signOut zlyhá, spravíme lokálny reset
    }

    // vyčisti lokálny storage token (kľúč čo používa supabase)
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}

    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      const { data, error } = await supabase.auth.getSession();

      // ak tokeny sú rozbité alebo refresh token chýba → reset
      if (error) {
        await signOut();
        if (mounted) setLoading(false);
        return;
      }

      if (!mounted) return;

      setSession(data.session);

      if (data.session?.user?.id) {
        await fetchProfile(data.session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // niekedy pri štarte príde null session -> normálne to len nastav
        setSession(newSession ?? null);

        if (!newSession?.user?.id) {
          setProfile(null);
          return;
        }

        // ✅ keď refresh zlyhá alebo token chýba, vyčisti všetko a pošli na login
        if (event === "TOKEN_REFRESH_FAILED") {
          await signOut();
          return;
        }

        // pri SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED načítaj profil
        await fetchProfile(newSession.user.id);
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = useMemo(() => profile?.group === "ADMIN", [profile?.group]);

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, isAdmin, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
