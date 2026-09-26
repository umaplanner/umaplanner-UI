import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { config } from "../lib/config";

export type AuthenticatedUser = {
  username: string;
  avatarUrl: string;
};

type AuthContextValue = {
  user: AuthenticatedUser | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        const response = await fetch(`${config.apiBaseUrl}/users/me`, {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status !== 401 && response.status !== 403) {
            throw new Error(`User request failed with status ${response.status}`);
          }
          return;
        }
        const authenticatedUser: AuthenticatedUser = await response.json();
        if (!cancelled) {
          setUser(authenticatedUser);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching authenticated user:", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchUser();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
