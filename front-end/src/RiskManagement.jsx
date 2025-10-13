// web/src/RiskManagement.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FaSearch,
  FaDownload,
  FaTrash,
  FaFilter,
  FaSort,
  FaFileCsv,
  FaEye,
  FaExclamationTriangle,
  FaChevronDown,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import CreateRiskModal from "./CreateRiskModal";
import { useAuth } from "./AuthContext";

// --- Helper Functions for Styling ---
const getCategoryColor = (category) => {
  const colors = {
    Compliance: "bg-blue-100 text-blue-800",
    Security: "bg-red-100 text-red-800",
    Financial: "bg-green-100 text-green-800",
    Operational: "bg-orange-100 text-orange-800",
    Technical: "bg-purple-100 text-purple-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
};

const getStatusColor = (status) => {
  // Note: This maps frontend display names to colors
  const colors = {
    New: "bg-blue-100 text-blue-800",
    "In Progress": "bg-purple-100 text-purple-800",
    Accepted: "bg-gray-100 text-gray-800", // This can remain for display of old data if needed
    Mitigated: "bg-green-100 text-green-800",
    Closed: "bg-zinc-100 text-zinc-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getRatingColor = (rating) => {
  const colors = {
    Critical: "bg-red-100 text-red-800",
    High: "bg-orange-100 text-orange-800",
    Moderate: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800",
  };
  return colors[rating] || "bg-gray-100 text-gray-800";
};

// Helper functions for dropdown option colors
const getCategoryBadgeColor = (category) => {
  const colors = {
    Compliance: "bg-blue-100 text-blue-800",
    Security: "bg-red-100 text-red-800",
    Financial: "bg-green-100 text-green-800",
    Operational: "bg-orange-100 text-orange-800",
    Technical: "bg-purple-100 text-purple-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
};

const getStatusBadgeColor = (status) => {
  const colors = {
    New: "bg-blue-100 text-blue-800",
    "In Progress": "bg-purple-100 text-purple-800",
    Mitigated: "bg-green-100 text-green-800",
    Closed: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getRatingBadgeColor = (rating) => {
  const colors = {
    Critical: "bg-red-100 text-red-800",
    High: "bg-orange-100 text-orange-800",
    Moderate: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800",
  };
  return colors[rating] || "bg-gray-100 text-gray-800";
};

export default function RiskManagement({
  project,
  risksData = [],
  onDataUpdate,
}) {
  const [risks, setRisks] = useState(risksData);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { fetchWithAuth, user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRisks, setSelectedRisks] = useState([]);
  const [filters, setFilters] = useState({
    category: "Filter by Category",
    status: "Filter by Status",
    rating: "Filter by Rating",
  });
  const [showModal, setShowModal] = useState(false);
  const [dropdowns, setDropdowns] = useState({
    category: false,
    status: false,
    rating: false,
  });
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [showRiskDetailsModal, setShowRiskDetailsModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "dateIdentified",
    direction: "desc",
  });
  const dropdownRefs = {
    category: useRef(),
    status: useRef(),
    rating: useRef(),
  };

  const categories = [
    "Compliance",
    "Security",
    "Financial",
    "Operational",
    "Technical",
  ];
  // --- FIX: Removed "Accepted" from the statuses array ---
  const statuses = ["New", "In Progress", "Mitigated", "Closed"];
  const ratings = ["Critical", "High", "Moderate", "Low"];

  useEffect(() => {
    // Update risks when risksData prop changes
    if (risksData.length > 0) {
      const likelihoodDisplayMap = {
        1: "Very Unlikely",
        2: "Unlikely",
        3: "Possible",
        4: "Likely",
        5: "Very Likely",
      };
      const statusDisplayMap = {
        open: "New",
        in_progress: "In Progress",
        mitigated: "Mitigated",
        closed: "Closed",
      };

      const mappedRisks = risksData.map((risk) => {
        const displayStatus = statusDisplayMap[risk.status] || risk.status;
        return {
          id: risk.id,
          title: risk.title,
          description: risk.description,
          category: risk.risk_category,
          categoryColor: getCategoryColor(risk.risk_category),
          likelihood: likelihoodDisplayMap[risk.likelihood] || risk.likelihood,
          impact: risk.impact,
          status: displayStatus,
          statusColor: getStatusColor(displayStatus),
          rating: risk.risk_rating,
          ratingColor: getRatingColor(risk.risk_rating),
          owner: risk.owner_name || "Unassigned",
          dateIdentified: risk.identified_at
            ? new Date(risk.identified_at)
            : null,
          targetMitigation: risk.target_mitigation_date,
          mitigationPlan: risk.mitigation_strategy,
        };
      });

      setRisks(mappedRisks);
    }
  }, [risksData]);

  useEffect(() => {
    // Fetch projects for the create modal
    const fetchProjects = async () => {
      try {
        const projectsRes = await fetchWithAuth("/api/projects/");
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    };
    fetchProjects();
  }, [fetchWithAuth]);

  // Function to create risk approval task
  const createRiskApprovalTask = async (risk, project) => {
    try {
      const taskData = {
        title: `Risk Assessment Approval`,
        type: "Risk Management",
        description: `Approve risk assessment for "${risk.title}". Category: ${risk.risk_category}, Rating: ${risk.risk_rating}, Impact: ${risk.impact}`,
        priority:
          risk.risk_rating === "Critical" || risk.risk_rating === "High"
            ? "High"
            : "Medium",
        status: "Pending",
        category: "risk_approval",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 7 days from now in YYYY-MM-DD format
        details: {
          riskId: risk.id,
          riskTitle: risk.title,
          riskDescription: risk.description,
          riskCategory: risk.risk_category,
          riskRating: risk.risk_rating,
          impact: risk.impact,
          likelihood: risk.likelihood,
          projectId: project.id,
          projectName: project.name,
          targetMitigationDate: risk.target_mitigation_date,
          mitigationStrategy: risk.mitigation_strategy,
          department: "Risk Management",
        },
      };

      // Create the task via API
      const response = await fetchWithAuth("/api/auditing/todos/", {
        method: "POST",
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        console.log("Risk approval task created successfully");
        return true;
      } else {
        console.error("Failed to create risk approval task:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Failed to create risk approval task:", error);
      return false;
    }
  };

  const handleCreate = async (formDataFromModal) => {
    const likelihoodMap = {
      "Very Unlikely": "1",
      Unlikely: "2",
      Possible: "3",
      Likely: "4",
      "Very Likely": "5",
    };
    // --- FIX: Removed "Accepted" from the status map ---
    const statusMap = {
      New: "open",
      "In Progress": "in_progress",
      Mitigated: "mitigated",
    };

    const apiPayload = {
      project: formDataFromModal.project,
      title: formDataFromModal.title,
      description: formDataFromModal.description,
      risk_category: formDataFromModal.category,
      impact: formDataFromModal.impact,
      likelihood: likelihoodMap[formDataFromModal.likelihood],
      status: statusMap[formDataFromModal.status],
      risk_rating: formDataFromModal.risk_rating,
      target_mitigation_date: formDataFromModal.targetMitigation || null,
      mitigation_strategy: formDataFromModal.mitigationPlan,
    };

    try {
      const response = await fetchWithAuth("/api/auditing/risks/", {
        method: "POST",
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(JSON.stringify(errData));
      }

      // Get the created risk data
      const createdRisk = await response.json();

      // Find the project details for the task creation
      const selectedProject = projects.find(
        (project) => project.id === formDataFromModal.project
      );

      // Create approval task for risk assessment
      const taskCreated = await createRiskApprovalTask(
        createdRisk,
        selectedProject
      );

      if (taskCreated) {
        alert(
          "Risk created successfully! An approval task has been created for admin review."
        );
      } else {
        // Task creation failed - show warning but don't rollback risk creation
        alert(
          "Risk created successfully, but failed to create approval task. Please contact admin."
        );
      }

      // Call the parent's data update function to refresh all data
      if (onDataUpdate) {
        await onDataUpdate();
      }
    } catch (err) {
      console.error("Create risk error:", err);
      alert(`Failed to create risk: ${err.message}`);
      throw err;
    }
  };

  // Click outside handler and other UI functions remain the same...
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs).forEach((key) => {
        if (
          dropdownRefs[key].current &&
          !dropdownRefs[key].current.contains(event.target)
        ) {
          setDropdowns((prev) => ({ ...prev, [key]: false }));
        }
      });
      const actionElements = document.querySelectorAll(
        "[data-action-dropdown]"
      );
      if (!Array.from(actionElements).some((el) => el.contains(event.target))) {
        setActionDropdown({});
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRefs]);

  const filteredAndSortedRisks = useMemo(() => {
    let filtered = risks.filter(
      (r) =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filters.category === "Filter by Category" ||
          r.category === filters.category) &&
        (filters.status === "Filter by Status" ||
          r.status === filters.status) &&
        (filters.rating === "Filter by Rating" || r.rating === filters.rating)
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [risks, searchTerm, filters, sortConfig]);

  const toggleSelect = (id) =>
    setSelectedRisks((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]
    );

  const selectAll = (e) =>
    setSelectedRisks(
      e.target.checked ? filteredAndSortedRisks.map((r) => r.id) : []
    );

  const handleSort = (key) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
  };

  const bulkAction = async (type) => {
    if (!selectedRisks.length) {
      alert(`Please select risks to ${type.toLowerCase()}`);
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      if (type === "Download") {
        const selectedData = risks.filter((risk) =>
          selectedRisks.includes(risk.id)
        );
        const dataStr = JSON.stringify(selectedData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `risks_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      if (type === "Delete") {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedRisks.length} risk(s)?`
          )
        ) {
          await handleBulkDeleteRisks(selectedRisks);
        }
      }

      if (type === "Export CSV") {
        const csvHeaders = [
          "Title",
          "Category",
          "Likelihood",
          "Impact",
          "Status",
          "Rating",
          "Owner",
          "Date Identified",
          "Target Mitigation",
        ];
        const csvData = filteredAndSortedRisks.map((risk) => [
          risk.title,
          risk.category,
          risk.likelihood,
          risk.impact,
          risk.status,
          risk.rating,
          risk.owner,
          risk.dateIdentified,
          risk.targetMitigation,
        ]);

        const csvContent = [csvHeaders, ...csvData]
          .map((row) => row.map((field) => `"${field}"`).join(","))
          .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `risks_export_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setSelectedRisks([]);
    } catch (error) {
      console.error(`Error performing ${type}:`, error);
      alert(`Error performing ${type}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteRisks = async (riskIds) => {
    setLoading(true);
    try {
      // Delete risks in parallel
      const deletePromises = riskIds.map(riskId =>
        fetchWithAuth(`/api/auditing/risks/${riskId}/`, {
          method: "DELETE",
        })
      );

      const responses = await Promise.all(deletePromises);
      
      // Check if all deletions were successful
      const failedDeletions = responses.filter(response => !response.ok);
      
      if (failedDeletions.length === 0) {
        // Remove from local state
        setRisks((prev) => prev.filter((risk) => !riskIds.includes(risk.id)));
        
        // Call parent's data update function to refresh all data
        if (onDataUpdate) {
          await onDataUpdate();
        }
        
        alert(`${riskIds.length} risk(s) deleted successfully!`);
      } else {
        throw new Error(`Failed to delete ${failedDeletions.length} risk(s)`);
      }
    } catch (error) {
      console.error("Bulk delete risks error:", error);
      alert(`Failed to delete risks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRisk = async (riskId) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/auditing/risks/${riskId}/`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state
        setRisks((prev) => prev.filter((r) => r.id !== riskId));
        
        // Call parent's data update function to refresh all data
        if (onDataUpdate) {
          await onDataUpdate();
        }
        
        alert("Risk deleted successfully!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete risk");
      }
    } catch (error) {
      console.error("Delete risk error:", error);
      alert(`Failed to delete risk: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRisk = (riskId) => {
    const risk = risks.find((r) => r.id === riskId);
    setSelectedRisk(risk);
    setShowRiskDetailsModal(true);
  };

  const handleDeleteRiskClick = (riskId) => {
    const risk = risks.find((r) => r.id === riskId);
    if (
      window.confirm(`Are you sure you want to delete "${risk.title}"?`)
    ) {
      // Call the existing delete function
      handleDeleteRisk(riskId);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: "Filter by Category",
      status: "Filter by Status",
      rating: "Filter by Rating",
    });
    setSearchTerm("");
  };

  const hasActiveFilters =
    searchTerm ||
    filters.category !== "Filter by Category" ||
    filters.status !== "Filter by Status" ||
    filters.rating !== "Filter by Rating";
  // The rest of the component's JSX remains the same
  if (loading && risks.length === 0)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            Loading Risk Data...
          </h3>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg m-6">
        <FaExclamationTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold">Failed to Load Data</h3>
        <p className="text-sm">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50">
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Risk Management
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor and manage organizational risks
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {filteredAndSortedRisks.length} of {risks.length} risks
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title"
                    className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-blue-500 text-sm"
                  />
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                <div className="flex items-center space-x-2">
                  <FaFilter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Filters:</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {["Download", "Delete"].map((action) => (
                  <button
                    key={action}
                    onClick={() => bulkAction(action)}
                    disabled={loading || selectedRisks.length === 0}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedRisks.length === 0
                        ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                    }`}
                  >
                    {loading ? (
                      <FaSpinner className="w-4 h-4 animate-spin" />
                    ) : action === "Download" ? (
                      <FaDownload className="w-4 h-4" />
                    ) : (
                      <FaTrash className="w-4 h-4" />
                    )}
                    <span>
                      {action} ({selectedRisks.length})
                    </span>
                  </button>
                ))}
                <div className="w-px h-6 bg-gray-300" />
                <button
                  onClick={() => bulkAction("Export CSV")}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-teal-400 text-base font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaFileCsv className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {["category", "status", "rating"].map((key) => (
                <div key={key} ref={dropdownRefs[key]} className="relative">
                  <button
                    onClick={() =>
                      setDropdowns((d) => ({ ...d, [key]: !d[key] }))
                    }
                    className={`flex items-center justify-between px-4 py-2 border rounded-lg text-sm font-medium transition-colors w-48 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                      filters[key] !==
                      `Filter by ${key.charAt(0).toUpperCase() + key.slice(1)}`
                        ? "border-teal-300 bg-teal-50 text-teal-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <span className="truncate">{filters[key]}</span>
                    <FaChevronDown
                      className={`w-4 h-4 ml-2 transition-transform ${
                        dropdowns[key] ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {dropdowns[key] && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                      <div
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100"
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            [key]: `Filter by ${
                              key.charAt(0).toUpperCase() + key.slice(1)
                            }`,
                          }));
                          setDropdowns((d) => ({ ...d, [key]: false }));
                        }}
                      >
                        <span className="font-medium">
                          All {key.charAt(0).toUpperCase() + key.slice(1)}s
                        </span>
                      </div>
                      {(key === "category"
                        ? categories
                        : key === "status"
                        ? statuses
                        : ratings
                      ).map((opt, index) => {
                        // Get the appropriate badge color based on the filter type
                        const getBadgeColor = () => {
                          if (key === "category") return getCategoryBadgeColor(opt);
                          if (key === "status") return getStatusBadgeColor(opt);
                          if (key === "rating") return getRatingBadgeColor(opt);
                          return "bg-gray-100 text-gray-800";
                        };
                        
                        return (
                          <div
                            key={opt}
                            className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm transition-colors ${
                              index % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                            }`}
                            onClick={() => {
                              setFilters((f) => ({ ...f, [key]: opt }));
                              setDropdowns((d) => ({ ...d, [key]: false }));
                            }}
                          >
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor()}`}>
                              {opt}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedRisks.length ===
                          filteredAndSortedRisks.length &&
                        filteredAndSortedRisks.length > 0
                      }
                      onChange={selectAll}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </th>
                  {[
                    { key: "title", label: "Title", sortable: true },
                    { key: "category", label: "Category", sortable: true },
                    { key: "likelihood", label: "Likelihood", sortable: true },
                    { key: "impact", label: "Impact", sortable: true },
                    { key: "status", label: "Status", sortable: true },
                    { key: "rating", label: "Rating", sortable: true },
                    { key: "owner", label: "Owner", sortable: true },
                    {
                      key: "dateIdentified",
                      label: "Date Identified",
                      sortable: true,
                    },
                    {
                      key: "targetMitigation",
                      label: "Target Mitigation",
                      sortable: true,
                    },
                    { key: "actions", label: "Actions", sortable: false },
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                        column.sortable
                          ? "cursor-pointer hover:bg-gray-100"
                          : ""
                      }`}
                      onClick={
                        column.sortable
                          ? () => handleSort(column.key)
                          : undefined
                      }
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <FaSort
                            className={`w-3 h-3 ${
                              sortConfig.key === column.key
                                ? "text-blue-600"
                                : "text-gray-400"
                            }`}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedRisks.map((risk) => (
                  <tr
                    key={risk.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedRisks.includes(risk.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRisks.includes(risk.id)}
                        onChange={() => toggleSelect(risk.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                        {risk.title}
                      </div>
                      {risk.description && (
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                          {risk.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${risk.categoryColor}`}
                      >
                        {risk.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {risk.likelihood}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {risk.impact}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${risk.statusColor}`}
                      >
                        {risk.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${risk.ratingColor}`}
                      >
                        {risk.rating}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {risk.owner}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {risk.dateIdentified
                        ? risk.dateIdentified.toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {risk.targetMitigation
                        ? new Date(risk.targetMitigation).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewRisk(risk.id)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Risk Details"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRiskClick(risk.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Risk"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAndSortedRisks.length === 0 && !loading && (
              <div className="text-center py-12">
                <FaExclamationTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No risks found
                </h3>
                <p className="text-gray-500 mb-6">
                  {hasActiveFilters
                    ? "Try adjusting your search or filter criteria."
                    : "No risks found in the system."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <CreateRiskModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreate}
        user={user}
        projects={projects}
      />
      
      {/* Risk Details Modal */}
      {showRiskDetailsModal && selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 animate-scaleIn">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">Risk Details</h2>
              <button
                onClick={() => setShowRiskDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
                aria-label="Close Modal"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 bg-white overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Risk Title</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRisk.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg min-h-[100px]">{selectedRisk.description}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedRisk.category)}`}>
                      {selectedRisk.category}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRisk.status)}`}>
                      {selectedRisk.status}
                    </span>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Risk Rating</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(selectedRisk.rating)}`}>
                      {selectedRisk.rating}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Likelihood</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRisk.likelihood}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRisk.impact}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Identified</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {selectedRisk.dateIdentified ? new Date(selectedRisk.dateIdentified).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation Strategy</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg min-h-[80px]">
                    {selectedRisk.mitigationStrategy || "No mitigation strategy provided"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Mitigation Date</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedRisk.targetMitigation ? new Date(selectedRisk.targetMitigation).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRisk.owner || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 flex items-center justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setShowRiskDetailsModal(false)}
                className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add animations CSS */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
