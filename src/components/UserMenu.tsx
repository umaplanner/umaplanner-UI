import { useEffect, useRef, useState } from "react";
import { config } from "../lib/config";

type AuthenticatedUser = {
  username: string;
  avatarUrl: string;
};

export default function UserMenu() {
  const [authenticatedUser, setAuthenticatedUser] = useState<
    AuthenticatedUser | null | undefined
  >(undefined);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAuthenticatedUser = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/users/me`, {
          credentials: "include",
        });

        if (cancelled) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setAuthenticatedUser(null);
          return;
        }

        if (!response.ok) {
          throw new Error(`User request failed with status ${response.status}`);
        }

        const user: AuthenticatedUser = await response.json();
        setAuthenticatedUser(user);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching authenticated user:", error);
          setAuthenticatedUser(null);
        }
      }
    };

    void fetchAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  if (authenticatedUser === undefined) {
    return null;
  }

  if (!authenticatedUser) {
    return (
      <a className="login-button" href={`${config.apiBaseUrl}/auth/discord/`}>
        Log in with Discord
      </a>
    );
  }

  return (
    <div className="user-menu" ref={userMenuRef}>
      <button
        type="button"
        className="user-profile"
        aria-expanded={isUserMenuOpen}
        aria-haspopup="menu"
        onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
      >
        <span>{authenticatedUser.username}</span>
        <img
          className="user-profile-image"
          src={authenticatedUser.avatarUrl}
          alt={`${authenticatedUser.username} profile`}
        />
      </button>
      {isUserMenuOpen && (
        <div className="user-menu-dropdown" role="menu">
          <button type="button" role="menuitem" disabled>
            Settings
          </button>
          <a href={`${config.apiBaseUrl}/auth/logout/`} role="menuitem">
            Log out
          </a>
        </div>
      )}
    </div>
  );
}
