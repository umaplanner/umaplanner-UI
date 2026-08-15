import { Routes, Route } from "react-router";
import Layout from "../components/Layout";
import HomePage from "../pages/HomePage";
import PvpOverviewPage from "../pages/PvpOverviewPage";
import PvpPlannerPage from "../pages/PvpPlannerPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pvp-overview" element={<PvpOverviewPage />} />
        <Route path="/pvp-planner" element={<PvpPlannerPage />} />
      </Routes>
    </Layout>
  );
}
