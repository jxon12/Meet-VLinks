import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AuthCtx = {
  user: any | null;
  loading: boolean;
  recovery: boolean; // 新增：是不是 recovery 模式
};

const Ctx = createContext<AuthCtx>({ user: null, loading: true, recovery: false });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
      } else {
        setRecovery(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, recovery }}>
      {children}
    </Ctx.Provider>
  );
}
