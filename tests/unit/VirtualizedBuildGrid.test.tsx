import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VirtualizedBuildGrid from "../../src/components/VirtualizedBuildGrid";

describe("VirtualizedBuildGrid", () => {
  it("renders visible items plus an overscan buffer instead of the full list", () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 640,
    });
    const offsetHeight = vi.spyOn(
      HTMLElement.prototype,
      "offsetHeight",
      "get",
    ).mockReturnValue(320);

    try {
      render(
        <VirtualizedBuildGrid
          items={Array.from({ length: 300 }, (_, index) => index)}
          getKey={(item) => item}
          renderItem={(item) => <article data-testid="virtual-build">{item}</article>}
        />,
      );

      const renderedItems = screen.getAllByTestId("virtual-build");
      expect(renderedItems.length).toBeGreaterThanOrEqual(20);
      expect(renderedItems.length).toBeLessThan(300);
    } finally {
      offsetHeight.mockRestore();
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      });
    }
  });
});
