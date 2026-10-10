import type { AuthenticatedUser } from "../contexts/AuthContext";

export function isAdminUser(user: AuthenticatedUser | null) {
  return user?.isAdmin === true;
}
