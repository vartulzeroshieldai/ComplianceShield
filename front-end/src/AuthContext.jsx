// src/AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // State to hold the auth tokens
  const [_authTokens, setAuthTokens] = useState(() =>
    localStorage.getItem("authTokens")
      ? JSON.parse(localStorage.getItem("authTokens"))
      : null
  );

  // Decode the user from the access token
  const [user, setUser] = useState(() =>
    localStorage.getItem("authTokens")
      ? jwtDecode(JSON.parse(localStorage.getItem("authTokens")).access)
      : null
  );

  const login = (tokens) => {
    // Now stores both access and refresh tokens
    localStorage.setItem("authTokens", JSON.stringify(tokens));
    setAuthTokens(tokens);
    setUser(jwtDecode(tokens.access));
  };

  const logout = useCallback(() => {
    localStorage.removeItem("authTokens");
    setAuthTokens(null);
    setUser(null);
  }, []);

  // --- NEW: The API Interceptor Logic ---
  const fetchWithAuth = useCallback(
    async (url, options = {}) => {
      // 1. Get the current access token
      const storedTokens = localStorage.getItem("authTokens");
      if (!storedTokens) {
        console.error("No auth tokens found");
        logout();
        return Promise.reject(new Error("No authentication tokens"));
      }

      let currentTokens = JSON.parse(storedTokens);

      // 2. Check if the access token is expired
      try {
        const decodedToken = jwtDecode(currentTokens.access);
        const isExpired = decodedToken.exp * 1000 < Date.now();

        // 3. If it's expired, get a new one
        if (isExpired) {
          console.log("Access token expired, attempting refresh...");

          if (!currentTokens.refresh) {
            console.error("No refresh token available");
            logout();
            window.location.href = "/login/grc";
            return Promise.reject(new Error("No refresh token"));
          }

          try {
            const response = await fetch("/api/accounts/token/refresh/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: currentTokens.refresh }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error(
                "Token refresh failed:",
                response.status,
                errorData
              );
              throw new Error(`Token refresh failed: ${response.status}`);
            }

            const newTokens = await response.json();
            console.log("Token refresh successful");
            login(newTokens); // This updates localStorage and state
            currentTokens = newTokens; // Use the new tokens for the upcoming request
          } catch (error) {
            console.error("Session expired. Logging out.", error);
            logout(); // If refresh fails, log the user out
            // You might want to redirect to login page here
            window.location.href = "/login/grc";
            return Promise.reject(error);
          }
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        logout();
        window.location.href = "/login/grc";
        return Promise.reject(error);
      }

      // 4. Add the authorization header to the original request
      const headers = {
        ...options.headers,
        Authorization: `Bearer ${currentTokens.access}`,
      };

      // Check if the body is FormData. If it is, DO NOT set Content-Type.
      // The browser will set it automatically with the correct boundary.
      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      // 5. Make the original API call
      options.headers = headers;

      // Prepend the Django server URL if the URL doesn't already start with http
      const fullUrl = url.startsWith("http") ? url : url;
      return fetch(fullUrl, options);
    },
    [logout]
  );

  // Helper function to check if user can edit a project
  const canEditProject = useCallback(
    (project) => {
      if (!user || !project) return false;

      // Owner can always edit
      if (project.owner === user.id || project.owner_name === user.username) {
        return true;
      }

      // Check if user is an explicit member with edit permissions
      if (project.team_members) {
        const userMember = project.team_members.find(
          (member) => member.id === user.id && member.can_edit
        );
        return !!userMember;
      }

      return false;
    },
    [user]
  );

  // Helper function to check if user can add members to a project
  const canManageProjectMembers = useCallback(
    (project) => {
      if (!user || !project) return false;

      // Owner can always manage members
      if (project.owner === user.id || project.owner_name === user.username) {
        return true;
      }

      // Check if user is an admin member
      if (project.team_members) {
        const userMember = project.team_members.find(
          (member) =>
            member.id === user.id && member.permission_level === "admin"
        );
        return !!userMember;
      }

      return false;
    },
    [user]
  );

  // Helper function to get user's organization
  const getUserOrganization = useCallback(() => {
    return user?.organization || null;
  }, [user]);

  const contextData = useMemo(
    () => ({
      user,
      login,
      logout,
      fetchWithAuth, // Provide the new function to the app
      canEditProject,
      canManageProjectMembers,
      getUserOrganization,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      user,
      login,
      logout,
      // Memoized functions (fetchWithAuth, canEditProject, canManageProjectMembers, getUserOrganization)
      // are already memoized with useCallback, no need to include them
    ]
  );

  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
