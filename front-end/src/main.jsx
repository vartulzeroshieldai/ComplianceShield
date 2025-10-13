// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./AppRouter";
import { AuthProvider } from "./AuthContext";
import { ProjectControlProvider } from "./ProjectControlContext";
import { PrivacyDetectionProvider } from "./PrivacyDetectionContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ProjectControlProvider>
        <PrivacyDetectionProvider>
          <AppRouter />
        </PrivacyDetectionProvider>
      </ProjectControlProvider>
    </AuthProvider>
  </React.StrictMode>
);
