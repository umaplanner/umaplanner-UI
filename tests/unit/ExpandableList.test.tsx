import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExpandableList from "../../src/features/overview/components/ExpandableList";

describe("ExpandableList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("virtualizes expanded list items", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () {
      return this.classList.contains("overview-popup__list-viewport") ? 180 : 40;
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);

    render(
      <ExpandableList
        className="item-list"
        label="Items"
        title="Items"
        titleId="items"
        headingLevel="h3"
      >
        {Array.from({ length: 100 }, (_, index) => (
          <li key={index}>Item {index + 1}</li>
        ))}
      </ExpandableList>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    const list = screen.getByRole("list", { name: "Items all" });
    const visibleItems = within(list).getAllByRole("listitem");

    expect(visibleItems.length).toBeGreaterThan(0);
    expect(visibleItems.length).toBeLessThan(100);
    expect(Number.parseInt(list.style.height, 10)).toBeGreaterThan(1000);
    expect(visibleItems[0]).toHaveAttribute("aria-posinset", "1");
    expect(visibleItems[0]).toHaveAttribute("aria-setsize", "100");
  });
});
