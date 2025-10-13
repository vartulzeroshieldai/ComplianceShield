// src/Logs.jsx
import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaDownload,
  FaFilter,
  FaEye,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaExclamationCircle,
  FaUser,
  FaShieldAlt,
  FaCog,
  FaFileAlt,
  FaProjectDiagram,
  FaClipboardList,
  FaChartBar,
  FaServer,
  FaKey,
} from "react-icons/fa";
import { useAuth } from "./AuthContext";

export default function Logs() {
  const { fetchWithAuth } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("authTokens");
      if (!token) {
        setError("You are not authorized to view logs.");
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetchWithAuth("/api/auditing/logs/");
        if (!response.ok) throw new Error("Failed to fetch logs.");
        const data = await response.json();
        setLogs(data);
        setFilteredLogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [fetchWithAuth]);

  useEffect(() => {
    let filtered = logs;
    if (searchTerm) {
      filtered = filtered.filter((log) => {
        const { module: detectedModule } = detectModuleAndLevel(
          log.action,
          log.details
        );
        const displayModule =
          log.module && log.module !== "Authentication"
            ? log.module
            : detectedModule;

        return (
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.user &&
            log.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
          log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
          displayModule.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    if (filterLevel !== "all") {
      filtered = filtered.filter((log) => {
        const { level: detectedLevel } = detectModuleAndLevel(
          log.action,
          log.details
        );
        const displayLevel =
          log.level && log.level !== "info" ? log.level : detectedLevel;
        return displayLevel === filterLevel;
      });
    }
    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [logs, searchTerm, filterLevel]);

  const formatTimestamp = (ts) => new Date(ts).toLocaleString();

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Intelligent module and level detection based on action content
  const detectModuleAndLevel = (action, details = "") => {
    const actionLower = action.toLowerCase();
    const detailsLower = details.toLowerCase();
    const combinedText = `${actionLower} ${detailsLower}`;

    // Module detection based on action keywords
    let detectedModule = "System";
    if (
      actionLower.includes("login") ||
      actionLower.includes("logout") ||
      actionLower.includes("authenticate")
    ) {
      detectedModule = "Authentication";
    } else if (
      actionLower.includes("user") ||
      actionLower.includes("account") ||
      actionLower.includes("profile")
    ) {
      detectedModule = "User Management";
    } else if (
      actionLower.includes("risk") ||
      actionLower.includes("threat") ||
      actionLower.includes("vulnerability")
    ) {
      detectedModule = "Risk Management";
    } else if (
      actionLower.includes("auditor review") ||
      actionLower.includes("review") ||
      actionLower.includes("audit review") ||
      actionLower.includes("assessment")
    ) {
      detectedModule = "Auditor Review";
    } else if (
      actionLower.includes("control") ||
      actionLower.includes("compliance") ||
      actionLower.includes("audit")
    ) {
      detectedModule = "Compliance";
    } else if (
      actionLower.includes("evidence") ||
      actionLower.includes("document") ||
      actionLower.includes("file")
    ) {
      detectedModule = "Evidence Management";
    } else if (
      actionLower.includes("project") ||
      actionLower.includes("framework")
    ) {
      detectedModule = "Project Management";
    } else if (
      actionLower.includes("policy") ||
      actionLower.includes("procedure")
    ) {
      detectedModule = "Policy Management";
    } else if (
      actionLower.includes("report") ||
      actionLower.includes("export") ||
      actionLower.includes("download")
    ) {
      detectedModule = "Reporting";
    } else if (
      actionLower.includes("setting") ||
      actionLower.includes("config")
    ) {
      detectedModule = "Settings";
    }

    // Level detection based on action keywords and context
    let detectedLevel = "info";
    if (
      combinedText.includes("error") ||
      combinedText.includes("failed") ||
      combinedText.includes("exception") ||
      combinedText.includes("denied") ||
      combinedText.includes("unauthorized") ||
      combinedText.includes("blocked")
    ) {
      detectedLevel = "error";
    } else if (
      combinedText.includes("warning") ||
      combinedText.includes("caution") ||
      combinedText.includes("alert") ||
      combinedText.includes("expired") ||
      combinedText.includes("timeout") ||
      combinedText.includes("retry")
    ) {
      detectedLevel = "warning";
    } else if (
      combinedText.includes("success") ||
      combinedText.includes("completed") ||
      combinedText.includes("approved") ||
      combinedText.includes("created") ||
      combinedText.includes("updated") ||
      combinedText.includes("saved") ||
      combinedText.includes("uploaded") ||
      combinedText.includes("deleted") ||
      combinedText.includes("exported")
    ) {
      detectedLevel = "success";
    }

    return { module: detectedModule, level: detectedLevel };
  };

  const getLevelColor = (level) => {
    switch (level) {
      case "error":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "success":
        return "bg-green-100 text-green-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case "error":
        return <FaTimes className="text-red-500" size={14} />;
      case "warning":
        return <FaExclamationTriangle className="text-yellow-500" size={14} />;
      case "success":
        return <FaCheckCircle className="text-green-500" size={14} />;
      case "info":
        return <FaInfoCircle className="text-blue-500" size={14} />;
      default:
        return <FaInfoCircle className="text-gray-500" size={14} />;
    }
  };

  // Module color scheme
  const getModuleColor = (module) => {
    switch (module) {
      case "Authentication":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "User Management":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Risk Management":
        return "bg-red-100 text-red-800 border-red-200";
      case "Auditor Review":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Compliance":
        return "bg-green-100 text-green-800 border-green-200";
      case "Evidence Management":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Project Management":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "Policy Management":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "Reporting":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "Settings":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "System":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Module icons
  const getModuleIcon = (module) => {
    switch (module) {
      case "Authentication":
        return <FaKey className="text-blue-600" size={12} />;
      case "User Management":
        return <FaUser className="text-purple-600" size={12} />;
      case "Risk Management":
        return <FaShieldAlt className="text-red-600" size={12} />;
      case "Auditor Review":
        return <FaClipboardList className="text-amber-600" size={12} />;
      case "Compliance":
        return <FaClipboardList className="text-green-600" size={12} />;
      case "Evidence Management":
        return <FaFileAlt className="text-orange-600" size={12} />;
      case "Project Management":
        return <FaProjectDiagram className="text-indigo-600" size={12} />;
      case "Policy Management":
        return <FaCog className="text-teal-600" size={12} />;
      case "Reporting":
        return <FaChartBar className="text-cyan-600" size={12} />;
      case "Settings":
        return <FaCog className="text-gray-600" size={12} />;
      case "System":
        return <FaServer className="text-slate-600" size={12} />;
      default:
        return <FaServer className="text-gray-600" size={12} />;
    }
  };

  // User avatar color generation
  const getUserAvatarColor = (username) => {
    if (!username) return "bg-gray-500";

    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
      "bg-emerald-500",
      "bg-violet-500",
    ];

    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Level", "User", "Action", "Module", "Details"],
      ...filteredLogs.map((log) => {
        const { module: detectedModule, level: detectedLevel } =
          detectModuleAndLevel(log.action, log.details);
        const displayModule =
          log.module && log.module !== "Authentication"
            ? log.module
            : detectedModule;
        const displayLevel =
          log.level && log.level !== "info" ? log.level : detectedLevel;

        return [
          formatTimestamp(log.timestamp),
          displayLevel,
          log.user,
          log.action,
          displayModule,
          `"${log.details.replace(/"/g, '""')}"`,
        ];
      }),
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="h-12 w-12 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <FaExclamationCircle className="text-red-500 text-6xl mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Logs
          </h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaInfoCircle className="text-gray-400" size={22} />
            <h1 className="text-2xl font-semibold text-gray-900">
              System Logs
            </h1>
          </div>
          <button
            onClick={exportLogs}
            className="flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-teal-400 text-base font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-all duration-300 ease-in-out cursor-pointer transform hover:scale-105 active:scale-95"
          >
            <FaDownload className="w-4 h-4" />
            <span>Export Logs</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {["info", "warning", "error", "success"].map((level) => {
            // Count logs using intelligent detection
            const count = logs.filter((log) => {
              const { level: detectedLevel } = detectModuleAndLevel(
                log.action,
                log.details
              );
              const displayLevel =
                log.level && log.level !== "info" ? log.level : detectedLevel;
              return displayLevel === level;
            }).length;

            return (
              <div
                key={level}
                className={`p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all border border-gray-200 ${
                  level === "info" 
                    ? "bg-gradient-to-br from-blue-100/50 via-blue-50/40 to-white"
                    : level === "warning"
                    ? "bg-gradient-to-br from-yellow-100/50 via-yellow-50/40 to-white"
                    : level === "error"
                    ? "bg-gradient-to-br from-red-100/50 via-red-50/40 to-white"
                    : "bg-gradient-to-br from-green-100/50 via-green-50/40 to-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 capitalize">
                      {level}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {count}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${getLevelColor(level)}`}>
                    {getLevelIcon(level)}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Detection Systems Info - Side by Side */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module Detection Info */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
                Module Detection System
              </span>
              <div className="p-2 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors cursor-help">
                <FaInfoCircle className="w-4 h-4 text-purple-500" />
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaKey className="w-3 h-3 text-blue-600" />
                  <span className="text-purple-800">Authentication</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → login, logout, authenticate
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaUser className="w-3 h-3 text-purple-600" />
                  <span className="text-purple-800">User Management</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → user, account, profile
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaShieldAlt className="w-3 h-3 text-red-600" />
                  <span className="text-purple-800">Risk Management</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → risk, threat, vulnerability
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaClipboardList className="w-3 h-3 text-amber-600" />
                  <span className="text-purple-800">Auditor Review</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → review, assessment, audit review
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaClipboardList className="w-3 h-3 text-green-600" />
                  <span className="text-purple-800">Compliance</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → control, compliance, audit
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaFileAlt className="w-3 h-3 text-orange-600" />
                  <span className="text-purple-800">Evidence Management</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → evidence, document, file
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaProjectDiagram className="w-3 h-3 text-indigo-600" />
                  <span className="text-purple-800">Project Management</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → project, framework
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaCog className="w-3 h-3 text-teal-600" />
                  <span className="text-purple-800">Policy Management</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → policy, procedure
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaChartBar className="w-3 h-3 text-cyan-600" />
                  <span className="text-purple-800">Reporting</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → report, export, download
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaServer className="w-3 h-3 text-slate-600" />
                  <span className="text-purple-800">System</span>
                </div>
                <span className="font-semibold text-purple-900 text-xs">
                  → default fallback
                </span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-purple-100 rounded-lg">
              <p className="text-xs text-purple-700">
                <strong>How it works:</strong> The system automatically detects
                the module based on action keywords and context. Each module has
                a unique color scheme and icon for easy identification.
              </p>
            </div>
          </div>

          {/* Level Detection Info */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                Level Detection System
              </span>
              <div className="p-2 bg-green-100 rounded-full hover:bg-green-200 transition-colors cursor-help">
                <FaInfoCircle className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-green-800">Error</span>
                </div>
                <span className="font-semibold text-green-900 text-xs leading-relaxed">
                  → error, failed, exception, denied, unauthorized, blocked
                </span>
              </div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-green-800">Warning</span>
                </div>
                <span className="font-semibold text-green-900 text-xs leading-relaxed">
                  → warning, caution, alert, expired, timeout, retry
                </span>
              </div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">Success</span>
                </div>
                <span className="font-semibold text-green-900 text-xs leading-relaxed">
                  → success, completed, approved, created, updated, saved,
                  uploaded, deleted, exported
                </span>
              </div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-green-800">Info</span>
                </div>
                <span className="font-semibold text-green-900 text-xs leading-relaxed">
                  → default fallback
                </span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <p className="text-xs text-green-700">
                <strong>How it works:</strong> The system analyzes action text
                and details to automatically determine the log level. Keywords
                are matched to assign appropriate severity levels for better log
                categorization.
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-4 lg:space-y-0">
            <div className="flex-1 relative">
              <FaSearch
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
              />
            </div>
            <div className="relative">
              <FaFilter
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="pl-12 pr-6 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
              >
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
        </section>

        {/* Logs Table */}
        <section className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900">
              Showing {filteredLogs.length} of {logs.length} logs
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 align-middle">
                <tr>
                  {[
                    "Timestamp",
                    "Level",
                    "User",
                    "Action",
                    "Module",
                    "Actions",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-8 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left select-none"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentLogs.map((log) => {
                  // Use intelligent detection for module and level
                  const { module: detectedModule, level: detectedLevel } =
                    detectModuleAndLevel(log.action, log.details);
                  const displayModule =
                    log.module && log.module !== "Authentication"
                      ? log.module
                      : detectedModule;
                  const displayLevel =
                    log.level && log.level !== "info"
                      ? log.level
                      : detectedLevel;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-100 even:bg-gray-50 transition-colors align-middle"
                      style={{ verticalAlign: "middle" }}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-left">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-left">
                        <div className="inline-flex items-center space-x-2 justify-start">
                          {getLevelIcon(displayLevel)}
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getLevelColor(
                              displayLevel
                            )}`}
                          >
                            {displayLevel.charAt(0).toUpperCase() +
                              displayLevel.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center space-x-3">
                          <div
                            className={`h-8 w-8 ${getUserAvatarColor(
                              log.user
                            )} rounded-full flex items-center justify-center shadow-sm`}
                          >
                            <span className="text-xs font-medium text-white">
                              {log.user
                                ? log.user.charAt(0).toUpperCase()
                                : "U"}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {log.user}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center space-x-2">
                          {getModuleIcon(displayModule)}
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getModuleColor(
                              displayModule
                            )}`}
                          >
                            {displayModule}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() =>
                            setSelectedLog({
                              ...log,
                              module: displayModule,
                              level: displayLevel,
                            })
                          }
                          className="flex items-center space-x-1 justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all"
                        >
                          <FaEye size={14} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredLogs.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 bg-white border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, filteredLogs.length)} of{" "}
                  {filteredLogs.length} results
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      // Show first page, last page, current page, and pages around current page
                      const shouldShow =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);

                      if (!shouldShow) {
                        // Show ellipsis for gaps
                        if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <span
                              key={page}
                              className="px-4 py-2 text-sm text-gray-500"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                            page === currentPage
                              ? "text-white bg-teal-500 border border-teal-500 shadow-md"
                              : "text-gray-700 bg-white border border-gray-300 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FaInfoCircle className="text-gray-400 text-4xl mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No logs found
              </h3>
              <p className="text-gray-500">No logs match your criteria.</p>
            </div>
          )}
        </section>
      </main>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-transform duration-300 ease-out scale-95"
            style={{ animation: "fadeScaleIn 0.3s forwards" }}
          >
            <style>{`
              @keyframes fadeScaleIn {
                0% {opacity: 0; transform: scale(0.95);}
                100% {opacity: 1; transform: scale(1);}
              }
            `}</style>
            <header className="flex items-center justify-between px-8 py-6 border-b border-gray-200 rounded-t-3xl bg-gray-50">
              <div className="flex items-center space-x-4">
                {getLevelIcon(selectedLog.level)}
                <h3
                  id="modal-title"
                  className="text-2xl font-semibold text-gray-900"
                >
                  Log Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                aria-label="Close modal"
              >
                <FaTimes size={20} />
              </button>
            </header>
            <section className="p-8 space-y-8 text-gray-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <dt className="mb-1 text-sm font-semibold">Timestamp</dt>
                  <dd className="bg-gray-50 p-4 rounded-lg shadow-inner text-base">
                    {formatTimestamp(selectedLog.timestamp)}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-sm font-semibold">Level</dt>
                  <dd>
                    <div className="inline-flex items-center space-x-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-base font-semibold text-gray-900">
                      {getLevelIcon(selectedLog.level)}
                      <span className={getLevelColor(selectedLog.level)}>
                        {selectedLog.level.charAt(0).toUpperCase() +
                          selectedLog.level.slice(1)}
                      </span>
                    </div>
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-sm font-semibold">User</dt>
                  <dd className="bg-gray-50 p-4 rounded-lg shadow-inner text-base">
                    {selectedLog.user}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-sm font-semibold">Module</dt>
                  <dd>
                    <div className="inline-flex items-center space-x-2">
                      {getModuleIcon(selectedLog.module)}
                      <span
                        className={`inline-flex px-3 py-2 rounded-lg border font-medium text-base ${getModuleColor(
                          selectedLog.module
                        )}`}
                      >
                        {selectedLog.module}
                      </span>
                    </div>
                  </dd>
                </div>
              </div>
              <div>
                <dt className="mb-1 text-sm font-semibold">Action</dt>
                <dd className="bg-gray-50 p-4 rounded-lg shadow-inner text-base">
                  {selectedLog.action}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-semibold">Details</dt>
                <dd className="bg-gray-50 p-6 rounded-lg shadow-inner text-base leading-relaxed whitespace-pre-line">
                  {selectedLog.details}
                </dd>
              </div>
            </section>
            <footer className="flex justify-end px-8 py-6 bg-gray-50 rounded-b-3xl border-t border-gray-200">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-8 py-3 bg-red-300 text-white font-semibold rounded-2xl hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
