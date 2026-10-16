import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";

type AuthState = { session: Session | null; ready: boolean };

export const useAuth = create<AuthState>(() => ({ session: null, ready: false }));

supabase.auth.getSession().then(({ data }) => {
  useAuth.setState({ session: data.session, ready: true });
});

supabase.auth.onAuthStateChange((_event, session) => {
  useAuth.setState({ session, ready: true });
});
