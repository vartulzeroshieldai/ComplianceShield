// src/DataProtectionProjectsList.jsx
import React, { useState, useMemo } from "react";
import {
  FaSearch,
  FaFilter,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaDownload,
  FaClock,
  FaShieldAlt,
  FaSpinner,
} from "react-icons/fa";
import { usePrivacyDetection } from "./PrivacyDetectionContext";

export default function DataProtectionProjectsList({
  projects,
  onViewProject,
  onCreateNew,
  onDeleteProject,
  onEditProject,
}) {
  const { privacyResults, loading } = usePrivacyDetection();

  // Ensure privacyResults is properly initialized
  const safePrivacyResults = privacyResults || { pia: [], dpia: [], ropa: [] };
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deletingProject, setDeletingProject] = useState(null);

  // Calculate completion percentage and assessment status for each project
  const getProjectAssessmentStatus = useMemo(() => {
    return (projectId) => {
      // Debug logging
      console.log(`🔍 Calculating assessment status for project: ${projectId}`);
      console.log("SafePrivacyResults object:", safePrivacyResults);
      console.log("PIA results type:", typeof safePrivacyResults?.pia);
      console.log("PIA results:", safePrivacyResults?.pia);
      console.log(
        "Available PIA results:",
        safePrivacyResults?.pia?.length || 0
      );
      console.log(
        "Available DPIA results:",
        safePrivacyResults?.dpia?.length || 0
      );
      console.log(
        "Available RoPA results:",
        safePrivacyResults?.ropa?.length || 0
      );

      // Debug: Log project names in privacy results
      if (safePrivacyResults?.pia?.length > 0) {
        console.log(
          "PIA project names:",
          safePrivacyResults.pia.map(
            (p) => p.project_name || p.project_info?.name
          )
        );
      }
      if (safePrivacyResults?.dpia?.length > 0) {
        console.log(
          "DPIA project names:",
          safePrivacyResults.dpia.map(
            (p) => p.project_name || p.project_info?.name
          )
        );
      }
      if (safePrivacyResults?.ropa?.length > 0) {
        console.log(
          "RoPA project names:",
          safePrivacyResults.ropa.map(
            (p) => p.project_name || p.project_info?.name
          )
        );
      }

      // Ensure we have valid arrays to work with
      const piaResults = Array.isArray(safePrivacyResults?.pia)
        ? safePrivacyResults.pia
        : [];
      const dpiaResults = Array.isArray(safePrivacyResults?.dpia)
        ? safePrivacyResults.dpia
        : [];
      const ropaResults = Array.isArray(safePrivacyResults?.ropa)
        ? safePrivacyResults.ropa
        : [];

      // Check if PIA assessment exists for this project
      const hasPIA = piaResults.some((result) => {
        const matches =
          result.project_name === projectId ||
          result.project_info?.name === projectId ||
          result.project_info?.project_name === projectId;
        if (matches) {
          console.log(
            `✅ PIA found for project ${projectId}:`,
            result.project_name || result.project_info?.name
          );
        }
        return matches;
      });

      // Check if DPIA assessment exists for this project
      const hasDPIA = dpiaResults.some((result) => {
        const matches =
          result.project_name === projectId ||
          result.project_info?.name === projectId ||
          result.project_info?.project_name === projectId;
        if (matches) {
          console.log(
            `✅ DPIA found for project ${projectId}:`,
            result.project_name || result.project_info?.name
          );
        }
        return matches;
      });

      // Check if RoPA assessment exists for this project
      const hasRoPA = ropaResults.some((result) => {
        const matches =
          result.project_name === projectId ||
          result.project_info?.name === projectId ||
          result.project_info?.project_name === projectId;
        if (matches) {
          console.log(
            `✅ RoPA found for project ${projectId}:`,
            result.project_name || result.project_info?.name
          );
        }
        return matches;
      });

      const completedAssessments = [hasPIA, hasDPIA, hasRoPA].filter(
        Boolean
      ).length;
      const totalAssessments = 3; // PIA, DPIA, RoPA
      const percentage = Math.round(
        (completedAssessments / totalAssessments) * 100
      );

      console.log(
        `📊 Project ${projectId} completion: ${percentage}% (${completedAssessments}/${totalAssessments})`
      );

      return {
        percentage,
        hasPIA,
        hasDPIA,
        hasRoPA,
        completedAssessments,
        totalAssessments,
      };
    };
  }, [safePrivacyResults]);

  // Calculate project status based on assessment progress
  const getProjectStatus = useMemo(() => {
    return (projectId) => {
      const assessmentStatus = getProjectAssessmentStatus(projectId);

      if (assessmentStatus.percentage === 100) {
        return "Completed";
      } else if (assessmentStatus.percentage > 0) {
        return "In Progress";
      } else {
        return "Not Started";
      }
    };
  }, [getProjectAssessmentStatus]);

  // Enhanced delete function with backend integration
  const handleDeleteProject = async (projectId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingProject(projectId);
      const authTokens = localStorage.getItem("authTokens");
      const token = authTokens ? JSON.parse(authTokens).access : null;

      if (!token) {
        alert("Authentication required");
        return;
      }

      const response = await fetch(
        `/api/privacy-detection/api/projects/${projectId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Call the parent delete function to update local state
        onDeleteProject(projectId);
      } else if (response.status === 401) {
        alert("Authentication expired. Please login again.");
      } else if (response.status === 404) {
        alert("Project not found. It may have already been deleted.");
        // Still call the parent function to remove from local state
        onDeleteProject(projectId);
      } else {
        alert("Failed to delete project. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project. Please check your connection.");
    } finally {
      setDeletingProject(null);
    }
  };

  // Debug: Log all projects to see their names
  console.log(
    "🔍 All projects:",
    projects.map((p) => ({ id: p.id, name: p.projectName }))
  );

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "All" || project.type === typeFilter;
    const matchesPriority =
      priorityFilter === "All" || project.priority === priorityFilter;
    const matchesStatus =
      statusFilter === "All" || project.status === statusFilter;

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100 text-red-800";
      case "High":
        return "bg-orange-100 text-orange-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Not Started":
        return "bg-gray-100 text-gray-800";
      case "Planning":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Web":
        return "🌐";
      case "Mobile":
        return "📱";
      case "Code":
        return "💻";
      default:
        return "📄";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-6 hover:shadow-xl transition-all duration-300 animate-slideDown">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 rounded-xl hover:scale-110 transition-transform duration-300">
              <FaShieldAlt className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Data Protection Projects
              </h1>
              <p className="text-gray-600">
                Track and manage data protection compliance initiatives
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              <span className="font-semibold">{filteredProjects.length}</span>{" "}
              of <span className="font-semibold">{projects.length}</span>{" "}
              projects
            </span>
            <button
              onClick={onCreateNew}
              className="flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-teal-400 text-base font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors cursor-pointer"
            >
              <FaPlus size={18} />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6 hover:shadow-md transition-all duration-300 animate-slideUp">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative group">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all hover:border-teal-300"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all hover:border-teal-300 cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Web">Web</option>
            <option value="Mobile">Mobile</option>
            <option value="Code">Code</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all hover:border-teal-300 cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all hover:border-teal-300 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Priority
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Owner
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Completion
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="even:bg-gray-50 hover:bg-gray-100 transition-all duration-200 group"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getTypeIcon(project.type)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {project.projectName}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: DPP-{project.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 whitespace-nowrap">
                      {project.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPriorityColor(
                        project.priority
                      )}`}
                    >
                      {project.priority}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                        getProjectStatus(project.projectName)
                      )}`}
                    >
                      {getProjectStatus(project.projectName)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-900">{project.owner}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-600">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FaClock className="w-3 h-3" />
                      <span>
                        {new Date(project.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-gray-300 h-2 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                            Loading...
                          </span>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                            <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                            <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const assessmentStatus = getProjectAssessmentStatus(
                          project.projectName
                        );
                        return (
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-500 hover:from-teal-600 hover:to-teal-700"
                                style={{
                                  width: `${assessmentStatus.percentage}%`,
                                }}
                              ></div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                                {assessmentStatus.percentage}%
                              </span>
                              <div className="flex space-x-1">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    assessmentStatus.hasPIA
                                      ? "bg-green-500"
                                      : "bg-gray-300"
                                  }`}
                                  title={
                                    assessmentStatus.hasPIA
                                      ? "PIA Completed"
                                      : "PIA Pending"
                                  }
                                ></div>
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    assessmentStatus.hasDPIA
                                      ? "bg-green-500"
                                      : "bg-gray-300"
                                  }`}
                                  title={
                                    assessmentStatus.hasDPIA
                                      ? "DPIA Completed"
                                      : "DPIA Pending"
                                  }
                                ></div>
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    assessmentStatus.hasRoPA
                                      ? "bg-green-500"
                                      : "bg-gray-300"
                                  }`}
                                  title={
                                    assessmentStatus.hasRoPA
                                      ? "RoPA Completed"
                                      : "RoPA Pending"
                                  }
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => onViewProject(project)}
                        className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-all duration-200 transform hover:scale-110 hover:shadow-md"
                        title="View Details"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditProject && onEditProject(project)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 transform hover:scale-110 hover:shadow-md"
                        title="Edit Project"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        disabled={deletingProject === project.id}
                        className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 hover:shadow-md ${
                          deletingProject === project.id
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-600 hover:bg-red-100"
                        }`}
                        title="Delete"
                      >
                        {deletingProject === project.id ? (
                          <FaSpinner className="w-4 h-4 animate-spin" />
                        ) : (
                          <FaTrash className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaShieldAlt className="text-gray-400 text-3xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No projects found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm ||
                typeFilter !== "All" ||
                priorityFilter !== "All" ||
                statusFilter !== "All"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first data protection project"}
              </p>
              <button
                onClick={onCreateNew}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-teal-400 font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors cursor-pointer"
              >
                <FaPlus size={18} />
                <span>New Project</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add animations CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.6s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out 0.2s;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}
