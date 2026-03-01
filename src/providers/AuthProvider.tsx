import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
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

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        //  neplatný refresh token → reset
        await signOut();
        setLoading(false);
        return;
      }

      setSession(data.session);

      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "TOKEN_REFRESH_FAILED") {
          await signOut();
          return;
        }

        setSession(session);

        if (!session) {
          setProfile(null);
          return;
        }

        await fetchProfile(session.user.id);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = profile?.group === "ADMIN";

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, isAdmin, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
