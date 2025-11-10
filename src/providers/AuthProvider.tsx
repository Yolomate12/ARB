import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from "react";

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
  fetchProfile: (userId?: string) => Promise<void>;
};

const AuthContext = createContext<AuthData>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  fetchProfile: async () => {},
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false); // 🔒 ochrana proti duplicitnému initu

  const fetchProfile = async (userId?: string) => {
    const id = userId || session?.user?.id;
    if (!id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setProfile(!error && data ? data : null);
  };

  useEffect(() => {
    const init = async () => {
      if (initDone.current) return; // 🔒 iba raz
      initDone.current = true;

      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // 👇 Zabránime dvom rýchlym redirectom
        setLoading(true);
        setSession(session);

        if (!session) {
          setProfile(null);
          setLoading(false);
          return;
        }

        await fetchProfile(session.user.id);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = profile?.group === "ADMIN";

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, isAdmin, fetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
