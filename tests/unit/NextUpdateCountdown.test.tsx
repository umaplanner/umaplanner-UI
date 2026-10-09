import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NextUpdateCountdown from "../../src/features/overview/NextUpdateCountdown";

afterEach(() => {
  vi.useRealTimers();
});

describe("NextUpdateCountdown", () => {
  it("refreshes once three seconds after the timestamp", () => {
    const now = new Date("2026-10-09T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const onRefresh = vi.fn();

    render(
      <NextUpdateCountdown
        event="CM 42/Final"
        nextUpdate={new Date(now.getTime() + 2000).toISOString()}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole("timer")).toHaveTextContent("Next update in 2s");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("Next update in 0s");
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending refresh when the overview unmounts", () => {
    const now = new Date("2026-10-09T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const onRefresh = vi.fn();
    const { unmount } = render(
      <NextUpdateCountdown
        event="CM 42/Final"
        nextUpdate={new Date(now.getTime() + 2000).toISOString()}
        onRefresh={onRefresh}
      />,
    );

    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
