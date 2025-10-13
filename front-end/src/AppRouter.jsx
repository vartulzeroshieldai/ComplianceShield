// src/AppRouter.jsx
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import ComplianceDashboard from "./ComplianceDashboard";
import { useAuth } from "./AuthContext"; // Import useAuth
import ComplianceProvider from "./ComplianceContext.jsx"; // Import ComplianceProvider

// --- Protected Route Component ---
const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    // If not logged in, redirect to the login page
    return <Navigate to="/login/grc" replace />;
  }

  // If allowedRoles is provided, check if the user's role is included
  const isAllowed = allowedRoles ? allowedRoles.includes(user.role) : true;

  if (!isAllowed) {
    // If the role is not allowed, you can redirect to a dedicated "Unauthorized" page
    // For now, we'll redirect them back to the dashboard.
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />; // Render the child route component (e.g., ComplianceDashboard)
};

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login/:tool" element={<LoginPage />} />

        {/* --- Protected Dashboard Route --- */}
        {/* The dashboard is now wrapped in ProtectedRoute and ComplianceProvider. */}
        {/* Anyone who is logged in can see the dashboard, but the dashboard itself will hide/show components. */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <ComplianceProvider>
                <ComplianceDashboard />
              </ComplianceProvider>
            }
          />
        </Route>

        {/* You could add more role-specific routes here later, for example: */}
        {/* <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/admin-settings" element={<AdminSettingsPage />} />
        </Route> 
        */}
      </Routes>
    </BrowserRouter>
  );
}
