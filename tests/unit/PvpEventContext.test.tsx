import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  EventProvider,
  useEvent,
} from "../../src/contexts/PvpEventContext";

function EventConsumer() {
  const { selectedEvent, setSelectedEvent } = useEvent();

  return (
    <>
      <output data-testid="selected-event">{selectedEvent}</output>
      <button onClick={() => setSelectedEvent("CM 42")}>
        Select event
      </button>
    </>
  );
}

describe("EventProvider", () => {
  it("restores the selected event from localStorage", () => {
    localStorage.setItem("selectedEvent", "CM 41");

    render(
      <EventProvider>
        <EventConsumer />
      </EventProvider>,
    );

    expect(screen.getByTestId("selected-event")).toHaveTextContent("CM 41");
  });

  it("updates state and persists a newly selected event", async () => {
    const user = userEvent.setup();

    render(
      <EventProvider>
        <EventConsumer />
      </EventProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Select event" }));

    expect(screen.getByTestId("selected-event")).toHaveTextContent("CM 42");
    expect(localStorage.getItem("selectedEvent")).toBe("CM 42");
  });

  it("rejects useEvent outside the provider", () => {
    expect(() => render(<EventConsumer />)).toThrow(
      "useEvent must be used inside EventProvider",
    );
  });
});
