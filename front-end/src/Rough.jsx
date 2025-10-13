// web/src/RiskManagement.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FaSearch,
  FaDownload,
  FaCheck,
  FaTrash,
  FaPlus,
  FaFilter,
  FaSort,
  FaFileCsv,
  FaEllipsisV,
  FaEye,
  FaEdit,
  FaLink,
  FaExclamationTriangle,
  FaChevronDown,
  FaSpinner,
} from "react-icons/fa";
import CreateRiskModal from "./CreateRiskModal";
import { useAuth } from "./AuthContext";

export default function RiskManagement() {
  const [risks, setRisks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [actionDropdown, setActionDropdown] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const dropdownRefs = {
    category: useRef(),
    status: useRef(),
    rating: useRef(),
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [risksRes, projectsRes] = await Promise.all([
          fetchWithAuth("/api/auditing/risks/"),
          fetchWithAuth("/api/projects/"),
        ]);
        if (!risksRes.ok || !projectsRes.ok) {
          throw new Error("Failed to fetch initial data.");
        }
        const risksData = await risksRes.json();
        const projectsData = await projectsRes.json();

        const mappedRisks = risksData.map((risk) => ({
          id: risk.id,
          title: risk.title,
          description: risk.description,
          category: risk.risk_category,
          categoryColor: getCategoryColor(risk.risk_category),
          likelihood: risk.likelihood,
          impact: risk.impact,
          status: risk.status,
          statusColor: getStatusColor(risk.status),
          rating: risk.risk_rating,
          ratingColor: getRatingColor(risk.risk_rating),
          owner: risk.owner_name || "Unassigned",
          dateIdentified: new Date(risk.identified_at).toLocaleDateString(),
          targetMitigation: risk.target_mitigation_date,
          mitigationPlan: risk.mitigation_strategy,
        }));

        setRisks(mappedRisks);
        setProjects(projectsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchWithAuth]);

  // --- FIX IS HERE: The parameter was renamed to 'newRisk' ---
  const handleCreate = async (formDataFromModal) => {
    // Create mapping objects to translate frontend values to backend keys
    const likelihoodMap = {
      "Very Unlikely": "1",
      Unlikely: "2",
      Possible: "3",
      Likely: "4",
      "Very Likely": "5",
    };
    const statusMap = {
      New: "open",
      "In Progress": "in_progress",
      Accepted: "accepted",
      Mitigated: "mitigated",
    };
    // This payload uses the 'newRisk' parameter passed from the modal
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
      const savedRisk = await response.json();

      // Re-fetch data to ensure UI is perfectly in sync
      const freshRisksRes = await fetchWithAuth("/api/auditing/risks/");
      const freshRisksData = await freshRisksRes.json();
      const mappedRisks = freshRisksData.map((risk) => ({
        id: risk.id,
        title: risk.title,
        description: risk.description,
        category: risk.risk_category,
        categoryColor: getCategoryColor(risk.risk_category),
        likelihood: risk.likelihood,
        impact: risk.impact,
        status: risk.status,
        statusColor: getStatusColor(risk.status),
        rating: risk.risk_rating,
        ratingColor: getRatingColor(risk.risk_rating),
        owner: risk.owner_name || "Unassigned",
        dateIdentified: new Date(risk.identified_at).toLocaleDateString(),
        targetMitigation: risk.target_mitigation_date,
        mitigationPlan: risk.mitigation_strategy,
      }));
      setRisks(mappedRisks);
    } catch (err) {
      console.error("Create risk error:", err);
      alert(err.message);
    }
  };

  // Click outside handler
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

      // Close action dropdowns
      const actionElements = document.querySelectorAll(
        "[data-action-dropdown]"
      );
      let clickedInside = false;
      actionElements.forEach((element) => {
        if (element.contains(event.target)) {
          clickedInside = true;
        }
      });
      if (!clickedInside) {
        setActionDropdown({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered and sorted risks
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
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
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

      if (type === "Approve") {
        setRisks((prev) =>
          prev.map((risk) =>
            selectedRisks.includes(risk.id)
              ? {
                  ...risk,
                  status: "Accepted",
                  statusColor: "bg-gray-100 text-gray-800",
                }
              : risk
          )
        );
      }

      if (type === "Delete") {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedRisks.length} risk(s)?`
          )
        ) {
          setRisks((prev) =>
            prev.filter((risk) => !selectedRisks.includes(risk.id))
          );
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

  const handleRiskAction = (action, riskId) => {
    const risk = risks.find((r) => r.id === riskId);
    setActionDropdown({});

    switch (action) {
      case "view":
        alert(`Viewing details for: ${risk.title}`);
        break;
      case "edit":
        alert(`Edit functionality for: ${risk.title}`);
        break;
      case "link":
        alert(`Link evidence for: ${risk.title}`);
        break;
      case "delete":
        if (
          window.confirm(`Are you sure you want to delete "${risk.title}"?`)
        ) {
          setRisks((prev) => prev.filter((r) => r.id !== riskId));
        }
        break;
      default:
        break;
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

  if (loading)
    return (
      <div className="p-6 text-center text-gray-600">Loading risks...</div>
    );
  if (error)
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
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

          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {/* Search */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title"
                    className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>

                <div className="flex items-center space-x-2">
                  <FaFilter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Filters:</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {["Download", "Approve", "Delete"].map((action) => (
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
                    ) : action === "Approve" ? (
                      <FaCheck className="w-4 h-4" />
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
                  className="flex items-center space-x-2 px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-sm text-sm font-medium transition-all duration-200"
                >
                  <FaFileCsv className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 text-sm font-medium transition-all duration-200 shadow-sm"
                >
                  <FaPlus className="w-4 h-4" />
                  <span>Create Risk</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {["category", "status", "rating"].map((key) => (
                <div key={key} ref={dropdownRefs[key]} className="relative">
                  <button
                    onClick={() =>
                      setDropdowns((d) => ({ ...d, [key]: !d[key] }))
                    }
                    className={`flex items-center justify-between px-4 py-2 border rounded-lg text-sm font-medium transition-colors w-48 ${
                      filters[key] !==
                      `Filter by ${key.charAt(0).toUpperCase() + key.slice(1)}`
                        ? "border-blue-300 bg-blue-50 text-blue-700"
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
                      ).map((opt) => (
                        <div
                          key={opt}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm transition-colors"
                          onClick={() => {
                            setFilters((f) => ({ ...f, [key]: opt }));
                            setDropdowns((d) => ({ ...d, [key]: false }));
                          }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full table-fixed">
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
                    { key: "likelihood", label: "Likelihood", sortable: false },
                    { key: "impact", label: "Impact", sortable: false },
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
                {filteredAndSortedRisks.map((risk, index) => (
                  <tr
                    key={risk.id}
                    className={`hover:bg-gray-100 even:bg-gray-50 transition-colors ${
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
                      {risk.dateIdentified}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {risk.targetMitigation}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="relative" data-action-dropdown>
                        <button
                          onClick={() =>
                            setActionDropdown((prev) =>
                              prev[risk.id] ? {} : { [risk.id]: true }
                            )
                          }
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FaEllipsisV className="w-4 h-4" />
                        </button>
                        {actionDropdown[risk.id] && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <div className="py-1">
                              <button
                                onClick={() =>
                                  handleRiskAction("view", risk.id)
                                }
                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <FaEye className="w-4 h-4 mr-3" />
                                View Risk Details
                              </button>
                              <button
                                onClick={() =>
                                  handleRiskAction("edit", risk.id)
                                }
                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <FaEdit className="w-4 h-4 mr-3" />
                                Edit Risk
                              </button>
                              <button
                                onClick={() =>
                                  handleRiskAction("link", risk.id)
                                }
                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <FaLink className="w-4 h-4 mr-3" />
                                Link Evidence
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() =>
                                  handleRiskAction("delete", risk.id)
                                }
                                className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <FaTrash className="w-4 h-4 mr-3" />
                                Delete Risk
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAndSortedRisks.length === 0 && (
              <div className="text-center py-12">
                <FaExclamationTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No risks found
                </h3>
                <p className="text-gray-500 mb-6">
                  {hasActiveFilters
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by creating your first risk."}
                </p>
                {!hasActiveFilters && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FaPlus className="w-4 h-4 mr-2" />
                    Create Risk
                  </button>
                )}
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
    </div>
  );
}

// Helper functions (place these outside your main component or import them)
const categories = [
  "Compliance",
  "Security",
  "Financial",
  "Operational",
  "Technical",
];
const statuses = ["open", "in_progress", "mitigated", "closed"];
const ratings = ["Low", "Medium", "High", "Severe"];

const getCategoryColor = (level) => {
  /* ... */
};
const getStatusColor = (status) => {
  /* ... */
};
const getRatingColor = (rating) => {
  /* ... */
};
