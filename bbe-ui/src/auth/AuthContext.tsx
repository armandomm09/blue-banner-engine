import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  team: { id: string; name: string; accent_color: string; team_number: number } | null;
  userRole: 'admin' | 'scout' | 'strategist' | 'viewer' | 'team_lead' | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<{
    id: string;
    name: string;
    accent_color: string;
    team_number: number;
  } | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'scout' | 'strategist' | 'viewer' | 'team_lead' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            fetchTeam(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Only fetch team if it's a new sign in or session refresh
        // to avoid redundant fetches on every state change
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          fetchTeam(session.user.id);
        }
      } else {
        setTeam(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchTeam = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
                    role,
                    team:teams (
                        id,
                        name,
                        team_number,
                        accent_color
                    )
                `
        )
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code !== "PGRST116")
          console.error("Error fetching team in AuthContext:", error);
        setTeam(null);
        setUserRole(null);
        return;
      }

      if (data && data.team) {
        const teamData = Array.isArray(data.team) ? data.team[0] : data.team;
        setTeam({
          id: teamData.id,
          name: teamData.name,
          team_number: teamData.team_number,
          accent_color: teamData.accent_color || "#00eee4",
        });
        setUserRole(data.role as 'admin' | 'scout' | 'strategist' | 'viewer' | 'team_lead');
      } else {
        setTeam(null);
        setUserRole(null);
      }
    } catch (err) {
      console.error("Unexpected error fetching team:", err);
      setTeam(null);
      setUserRole(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const isAdmin = userRole === 'admin' || userRole === 'team_lead';

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut, team, userRole, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
