import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserMenu from "../../src/components/UserMenu";
import { useAuth } from "../../src/contexts/AuthContext";

vi.mock("../../src/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        username: "admin",
        avatarUrl: "/avatar.png",
        isAdmin: true,
      },
      isLoading: false,
    });
  });

  it("shows the admin page in the user menu for admins", () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /admin/ }));

    expect(screen.getByRole("menuitem", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("does not show the admin page in the user menu for non-admins", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        username: "user",
        avatarUrl: "/avatar.png",
        isAdmin: false,
      },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /user/ }));

    expect(screen.queryByRole("menuitem", { name: "Admin" })).not.toBeInTheDocument();
  });
});
