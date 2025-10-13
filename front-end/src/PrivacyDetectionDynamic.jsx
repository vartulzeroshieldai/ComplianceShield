// src/PrivacyDetectionDynamic.jsx
import React, { useState, useEffect } from "react";
import {
  FaShieldAlt,
  FaPlay,
  FaMobileAlt,
  FaDesktop,
  FaGithub,
  FaGitlab,
  FaSearch,
  FaDownload,
  FaFilter,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaEye,
  FaEyeSlash,
  FaChevronDown,
  FaLink,
  FaFileAlt,
  FaDatabase,
  FaCode,
  FaCalendarAlt,
  FaSpinner,
  FaPlus,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import { useAuth } from "./AuthContext";

export default function PrivacyDetectionDynamic({ selectedProject }) {
  const { user } = useAuth();

  // Role-based access control - only Admin and Contributor can access Privacy Detection
  const canAccessPrivacyDetection =
    user && ["Admin", "Contributor"].includes(user.role);

  // If user doesn't have permission, show access denied message
  if (!canAccessPrivacyDetection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access this feature.
          </p>
        </div>
      </div>
    );
  }

  const [projects, setProjects] = useState([]);
  const [selectedPrivacyProject, setSelectedPrivacyProject] = useState(null);
  const [scans, setScans] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    project_type: "web",
    compliance_project: selectedProject?.id || null,
  });

  // Fetch privacy detection projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authTokens")
        ? JSON.parse(localStorage.getItem("authTokens")).access
        : null;
      const response = await fetch("/api/privacy-detection/user-projects/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        if (data.length > 0 && !selectedPrivacyProject) {
          setSelectedPrivacyProject(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  // Create new privacy detection project
  const createProject = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authTokens")
        ? JSON.parse(localStorage.getItem("authTokens")).access
        : null;
      const response = await fetch("/api/privacy-detection/api/projects/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        const data = await response.json();
        setProjects([...projects, data]);
        setSelectedPrivacyProject(data);
        setShowCreateModal(false);
        setNewProject({
          name: "",
          description: "",
          project_type: "web",
          compliance_project: null,
        });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to create project");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      setError("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  // Start a new scan
  const startScan = async (scanType, parameters = {}) => {
    if (!selectedPrivacyProject) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("authTokens")
        ? JSON.parse(localStorage.getItem("authTokens")).access
        : null;
      const response = await fetch(
        `/api/privacy-detection/api/projects/${selectedPrivacyProject.id}/start_scan/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scan_type: scanType,
            parameters: parameters,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setScans([data, ...scans]);
        // Refresh project data
        fetchProjects();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to start scan");
      }
    } catch (err) {
      console.error("Error starting scan:", err);
      setError("Failed to start scan");
    } finally {
      setLoading(false);
    }
  };

  // Fetch scans for selected project
  const fetchScans = async () => {
    if (!selectedPrivacyProject) return;

    try {
      const token = localStorage.getItem("authTokens")
        ? JSON.parse(localStorage.getItem("authTokens")).access
        : null;
      const response = await fetch(
        `/api/privacy-detection/api/projects/${selectedPrivacyProject.id}/dashboard_data/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setScans(data.recent_scans || []);
      }
    } catch (err) {
      console.error("Error fetching scans:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedPrivacyProject) {
      fetchScans();
    }
  }, [selectedPrivacyProject]);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "running":
        return "text-blue-600 bg-blue-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading privacy detection projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Privacy Detection
            </h1>
            <p className="text-gray-600">
              Analyze your applications for privacy compliance
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <FaPlus size={16} />
            <span>New Project</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <FaExclamationTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Project Selection */}
        {projects.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Project
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedPrivacyProject(project)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPrivacyProject?.id === project.id
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {project.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {project.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{project.project_type}</span>
                    <span>{project.total_scans} scans</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Dashboard */}
        {selectedPrivacyProject && (
          <div className="space-y-6">
            {/* Project Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Scans</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedPrivacyProject.total_scans}
                    </p>
                  </div>
                  <FaShieldAlt className="w-8 h-8 text-teal-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedPrivacyProject.completed_scans}
                    </p>
                  </div>
                  <FaCheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Findings</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {selectedPrivacyProject.total_findings}
                    </p>
                  </div>
                  <FaExclamationTriangle className="w-8 h-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-600">
                      {selectedPrivacyProject.critical_findings}
                    </p>
                  </div>
                  <FaExclamationTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>

            {/* Scan Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Start New Scan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    const url = prompt("Enter website URL:");
                    if (url) startScan("cookie_analysis", { url });
                  }}
                  className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors"
                >
                  <FaDesktop className="w-6 h-6 text-teal-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">
                      Cookie Analysis
                    </h3>
                    <p className="text-sm text-gray-600">
                      Analyze website cookies
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => startScan("security_headers")}
                  className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <FaLock className="w-6 h-6 text-green-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">
                      Security Headers
                    </h3>
                    <p className="text-sm text-gray-600">
                      Check security headers
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => startScan("data_flow")}
                  className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <FaDatabase className="w-6 h-6 text-blue-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Data Flow</h3>
                    <p className="text-sm text-gray-600">Analyze data flow</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Scans */}
            {scans.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Scans
                </h2>
                <div className="space-y-3">
                  {scans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            scan.status
                          )}`}
                        >
                          {scan.status}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {scan.scan_type.replace("_", " ")}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {scan.findings_count} findings • {scan.risk_level}{" "}
                            risk
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Project
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    rows="3"
                    placeholder="Enter project description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Type
                  </label>
                  <select
                    value={newProject.project_type}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        project_type: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="web">Web Application</option>
                    <option value="mobile">Mobile Application</option>
                    <option value="desktop">Desktop Application</option>
                    <option value="api">API Service</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  disabled={!newProject.name || loading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <FaSpinner className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
