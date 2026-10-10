import { Navigate, Routes, Route } from "react-router";
import Layout from "../components/Layout";
import OverviewPage from "../pages/OverviewPage";
import PlannerPage from "../pages/PlannerPage";
import UmaImport from "../features/uma-import/UmaImport";
import AdminPage from "../pages/AdminPage";
import { EventProvider } from "../contexts/EventContext";
import { AuthProvider } from "../contexts/AuthContext";
import { routes } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <Layout>
          <Routes>
            <Route
              path={routes.plannerLegacy}
              element={<Navigate to={routes.planner} replace />}
            />
            <Route path={routes.overview} element={<OverviewPage />} />
            <Route path={routes.planner} element={<PlannerPage />} />
            <Route path={routes.umaImport} element={<UmaImport />} />
            <Route path={routes.admin} element={<AdminPage />} />
          </Routes>
        </Layout>
      </EventProvider>
    </AuthProvider>
  );
}
