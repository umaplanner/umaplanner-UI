import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type EventContextValue = {
  selectedEvent: string;
  setSelectedEvent: (event: string) => void;
};

const EventContext = createContext<EventContextValue | undefined>(
  undefined
);

export function EventProvider({ children }: { children: ReactNode }) {
  const [selectedEvent, setSelectedEvent] = useState<string>(() => {
    return localStorage.getItem("selectedEvent") ?? "";
  });

  function handleEventChange(event: string) {
    setSelectedEvent(event);
    localStorage.setItem("selectedEvent", event);
  }

  return (
    <EventContext.Provider
      value={{ 
        selectedEvent,
        setSelectedEvent: handleEventChange,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);

  if (!context) {
    throw new Error("useEvent must be used inside EventProvider");
  }

  return context;
}
