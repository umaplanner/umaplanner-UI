import { Routes, Route } from "react-router";
import Layout from "../components/Layout";
import HomePage from "../pages/HomePage";
import PvpOverviewPage from "../pages/PvpOverviewPage";
import PvpPlannerPage from "../pages/PvpPlannerPage";
import { EventProvider } from "../contexts/PvpEventContext";
import { routes } from "./routes";

export default function App() {
  return (
    <EventProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path={routes.overview} element={<PvpOverviewPage />} />
          <Route path={routes.planner} element={<PvpPlannerPage />} />
        </Routes>
      </Layout>
    </EventProvider>
  );
}
