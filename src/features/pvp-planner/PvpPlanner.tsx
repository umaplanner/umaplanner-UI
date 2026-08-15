import { useState } from "react";

type PlannerTab = "event" | "teams";

export default function PvpPlanner() {
  const [activeTab, setActiveTab] = useState<PlannerTab>("event");

  return (
    <section>
      <h1>PvP Planner</h1>
      <p>Hello from the PvP planner page.</p>

      <div role="tablist" aria-label="PvP planner sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "event"}
          onClick={() => setActiveTab("event")}
        >
          PvP Event
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "teams"}
          onClick={() => setActiveTab("teams")}
        >
          Other Teams
        </button>
      </div>

      {activeTab === "event" ? (
        <p>Event planning will be implemented here.</p>
      ) : (
        <p>Information about other teams will be implemented here.</p>
      )}
    </section>
  );
}
