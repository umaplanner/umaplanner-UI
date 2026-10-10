import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import { routes } from "../app/routes";
import { config } from "../lib/config";
import { useAuth } from "../contexts/AuthContext";
import { isAdminUser } from "../lib/userAccess";

export default function UserMenu() {
  const { user: authenticatedUser, isLoading } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  if (isLoading) {
    return null;
  }

  if (!authenticatedUser) {
    return (
      <a
        className="login-button"
        href={`${config.apiBaseUrl}/auth/discord?returnUrl=${encodeURIComponent(window.location.href)}`}
      >
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
          {isAdminUser(authenticatedUser) && (
            <NavLink
              to={routes.admin}
              role="menuitem"
              onClick={() => setIsUserMenuOpen(false)}
            >
              Admin
            </NavLink>
          )}
          <button type="button" role="menuitem" disabled>
            Settings
          </button>
          <a href={`${config.apiBaseUrl}/auth/logout/?returnUrl=${encodeURIComponent(window.location.href)}`} role="menuitem">
            Log out
          </a>
        </div>
      )}
    </div>
  );
}
