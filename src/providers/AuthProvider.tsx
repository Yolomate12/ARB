import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

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

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
  setSession(session);

  // ak sa user odhlásil, len vymaž profil a nefetchuj
  if (!session) {
    setProfile(null);
    return;
  }

  // ak je user prihlásený, fetchni profil
  await fetchProfile(session.user.id);
  });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const isAdmin = profile?.group === "ADMIN";

  return (
    <AuthContext.Provider value={{ session, profile, loading, isAdmin, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
