// web/src/PrivacyDetectionContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";

const PrivacyDetectionContext = createContext();

export const usePrivacyDetection = () => {
  const context = useContext(PrivacyDetectionContext);
  if (!context) {
    throw new Error(
      "usePrivacyDetection must be used within a PrivacyDetectionProvider"
    );
  }
  return context;
};

export const PrivacyDetectionProvider = ({ children }) => {
  const authContext = useAuth();
  const user = authContext?.user;

  // Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState({
    total_projects: 0,
    active_projects: 0,
    total_findings: 0,
    critical_findings: 0,
    total_scans: 0,
    completed_scans: 0,
    completion_rate: 0,
  });

  // Privacy Assessment Results State
  const [privacyResults, setPrivacyResults] = useState({
    pia: [],
    dpia: [],
    ropa: [],
  });

  // Privacy Context Data State (for dashboard charts)
  const [privacyContextData, setPrivacyContextData] = useState({
    risk_level_data: [],
    data_category_data: [],
    assessment_type_data: [],
    summary: {
      total_assessments: 0,
      total_risks: 0,
      business_units: 0,
      last_updated: null,
    },
  });

  // Loading and Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Fetch dashboard stats with caching
  const fetchDashboardStats = async (forceRefresh = false) => {
    // Check if we need to refresh based on cache
    if (
      !forceRefresh &&
      lastUpdated &&
      Date.now() - lastUpdated < CACHE_DURATION
    ) {
      return; // Use cached data
    }

    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const authTokens = localStorage.getItem("authTokens");
      const token = authTokens ? JSON.parse(authTokens).access : null;

      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/privacy-detection/dashboard-stats/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
        setLastUpdated(Date.now());
      } else if (response.status === 401) {
        setError("Authentication expired. Please login again.");
      } else {
        setError("Failed to fetch dashboard stats");
      }
    } catch (err) {
      setError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch privacy assessment results
  const fetchPrivacyResults = async () => {
    if (!user) return;

    try {
      const authTokens = localStorage.getItem("authTokens");
      const token = authTokens ? JSON.parse(authTokens).access : null;

      if (!token) return;

      const [piaResponse, dpiaResponse, ropaResponse] = await Promise.all([
        fetch("/api/privacy-detection/pia-results/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/privacy-detection/dpia-results/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/privacy-detection/ropa-results/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [piaData, dpiaData, ropaData] = await Promise.all([
        piaResponse.ok ? piaResponse.json() : [],
        dpiaResponse.ok ? dpiaResponse.json() : [],
        ropaResponse.ok ? ropaResponse.json() : [],
      ]);

      // Debug logging
      console.log("🔍 Context - Fetched data:", {
        piaData,
        dpiaData,
        ropaData,
        piaType: typeof piaData,
        dpiaType: typeof dpiaData,
        ropaType: typeof ropaData,
        piaIsArray: Array.isArray(piaData),
        dpiaIsArray: Array.isArray(dpiaData),
        ropaIsArray: Array.isArray(ropaData),
      });

      // More detailed logging
      console.log("🔍 Context - Detailed data structure:");
      console.log("PIA Data structure:", piaData);
      console.log("DPIA Data structure:", dpiaData);
      console.log("RoPA Data structure:", ropaData);

      // Handle different response formats
      const normalizeToArray = (data) => {
        if (Array.isArray(data)) {
          return data;
        } else if (data && typeof data === "object") {
          // If it's an object, check if it has a results property or is a single result
          if (data.results && Array.isArray(data.results)) {
            return data.results;
          } else if (data.id || data.project_name) {
            // If it looks like a single result object, wrap it in an array
            return [data];
          } else {
            // If it's an object but not a result, return empty array
            return [];
          }
        }
        return [];
      };

      const normalizedPia = normalizeToArray(piaData);
      const normalizedDpia = normalizeToArray(dpiaData);
      const normalizedRopa = normalizeToArray(ropaData);

      console.log("🔍 Context - Normalized arrays:");
      console.log("Normalized PIA:", normalizedPia);
      console.log("Normalized DPIA:", normalizedDpia);
      console.log("Normalized RoPA:", normalizedRopa);

      setPrivacyResults({
        pia: normalizedPia,
        dpia: normalizedDpia,
        ropa: normalizedRopa,
      });
    } catch (err) {
      console.error("Failed to fetch privacy results:", err);
    }
  };

  // Fetch privacy context data for dashboard charts
  const fetchPrivacyContextData = async () => {
    console.log("🔍 Context - fetchPrivacyContextData called, user:", user);

    if (!user) {
      console.log("🔍 Context - No user, skipping privacy context data fetch");
      return;
    }

    try {
      const authTokens = localStorage.getItem("authTokens");
      const token = authTokens ? JSON.parse(authTokens).access : null;

      if (!token) {
        console.log(
          "🔍 Context - No auth token, skipping privacy context data fetch"
        );
        return;
      }

      console.log(
        "🔍 Context - Fetching privacy context data from /api/privacy-detection/privacy-context-data/"
      );

      const response = await fetch(
        "/api/privacy-detection/privacy-context-data/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "🔍 Context - Privacy context data response status:",
        response.status
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "🔍 Context - Privacy context data fetched successfully:",
        data
      );

      setPrivacyContextData(data);
    } catch (err) {
      console.error("❌ Context - Error fetching privacy context data:", err);
    }
  };

  // Refresh all data
  const refreshData = () => {
    console.log("🔍 Context - refreshData() called");
    console.log("🔍 Context - About to call fetchDashboardStats(true)");
    fetchDashboardStats(true);
    console.log("🔍 Context - About to call fetchPrivacyResults()");
    fetchPrivacyResults();
    console.log("🔍 Context - About to call fetchPrivacyContextData()");
    fetchPrivacyContextData();
  };

  // Auto-fetch on user login
  useEffect(() => {
    console.log("🔍 Context - useEffect triggered, user:", user);
    console.log("🔍 Context - User type:", typeof user);
    console.log(
      "🔍 Context - User details:",
      user
        ? { id: user.id, username: user.username, email: user.email }
        : "null"
    );

    if (user) {
      console.log("🔍 Context - User detected, fetching all data...");
      console.log("🔍 Context - About to call fetchDashboardStats()");
      fetchDashboardStats();
      console.log("🔍 Context - About to call fetchPrivacyResults()");
      fetchPrivacyResults();
      console.log("🔍 Context - About to call fetchPrivacyContextData()");
      fetchPrivacyContextData();
    } else {
      console.log("🔍 Context - No user detected, skipping all fetches");
    }
  }, [user]); // Only depend on user

  // Ensure context is always available, even if user is not loaded yet
  const contextValue = {
    // Dashboard Stats
    dashboardStats,
    loading,
    error,
    lastUpdated,

    // Privacy Results
    privacyResults,

    // Privacy Context Data (for charts)
    privacyContextData,

    // Actions
    refreshData,
    fetchDashboardStats,
    fetchPrivacyResults,
    fetchPrivacyContextData,

    // Computed values
    totalFindings: dashboardStats.total_findings,
    criticalIssues: dashboardStats.critical_findings,
    totalProjects: dashboardStats.total_projects,
    activeScans: dashboardStats.active_projects,
    completionRate: dashboardStats.completion_rate,
  };

  return (
    <PrivacyDetectionContext.Provider value={contextValue}>
      {children}
    </PrivacyDetectionContext.Provider>
  );
};
