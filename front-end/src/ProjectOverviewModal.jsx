// src/components/Projects/ProjectOverviewModal.jsx
import { FaTimes } from "react-icons/fa";
import classNames from "classnames";
import { useState, useEffect } from "react"; // Added useEffect for fetching auditors
import { useProjectControl } from "./ProjectControlContext";
import { useAuth } from "./AuthContext";

function ProjectOverviewModal({
  project,
  framework,
  onClose,
  onDelete,
  onOpenProject,
}) {
  // State for auditors and audit enabled status
  const [auditors, setAuditors] = useState([]);
  const [auditEnabled, setAuditEnabled] = useState(false);
  const { fetchWithAuth } = useAuth();

  // Get project data from context
  const { projects: contextProjects } = useProjectControl();
  const contextProject = contextProjects.find((p) => p.id === project.id);
  const displayProject = contextProject || project;

  // Fetch auditors for this project
  useEffect(() => {
    const fetchAuditors = async () => {
      try {
        const response = await fetchWithAuth(
          `/api/projects/${project.id}/auditors/`
        );
        if (response.ok) {
          const auditorsData = await response.json();
          setAuditors(auditorsData);
          // Set audit enabled based on whether auditors are assigned
          setAuditEnabled(auditorsData.length > 0);
        }
      } catch (error) {
        console.error("Error fetching auditors:", error);
        setAuditors([]);
        setAuditEnabled(false);
      }
    };

    if (project?.id) {
      fetchAuditors();
    }
  }, [project?.id, fetchWithAuth]);

  if (!project) return null;

  // Helper to format the date and time as 'September 11, 2025 at 03:42 PM'
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // Ensure AM/PM
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden transform transition-all duration-300 animate-scaleIn relative text-gray-800">
        {/* Updated Header Styling */}
        <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Project: {project.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
            aria-label="Close Modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row gap-8 px-10 py-10 bg-white">
          {/* Left Panel */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="border border-dashed border-gray-300 rounded-lg w-full flex flex-col items-center py-8">
              <span className="font-semibold text-gray-800 mb-3">
                Completion Percentage
              </span>
              <div className="relative w-48 h-48 mb-4">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#E5E7EB"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#3B82F6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${
                      2 *
                      Math.PI *
                      80 *
                      (1 - (displayProject.progress || 0) / 100)
                    }`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-gray-700">
                  {displayProject.progress || 0}%
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {displayProject.implementedControls || 0} of{" "}
                {displayProject.totalControls || 0} controls implemented
              </span>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 bg-gray-50 rounded-lg p-6 border border-gray-100">
            <div className="space-y-6 text-[15px]">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {project.name}
                </h3>
                <p className="text-gray-600 font-light mt-1">
                  {project.description}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                <div className="col-span-1 text-gray-800 font-medium">
                  Status:
                </div>
                <div className="col-span-2 flex items-center">
                  <span
                    className={classNames(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold",
                      {
                        "bg-gray-200 text-gray-700":
                          displayProject.status === "Not Started",
                        "bg-yellow-100 text-yellow-800":
                          displayProject.status === "In Progress",
                        "bg-green-100 text-green-800":
                          displayProject.status === "Completed",
                      }
                    )}
                  >
                    <span
                      className={classNames("w-2 h-2 rounded-full mr-2", {
                        "bg-gray-400": displayProject.status === "Not Started",
                        "bg-yellow-500":
                          displayProject.status === "In Progress",
                        "bg-green-500": displayProject.status === "Completed",
                      })}
                    />
                    {displayProject.status || "Not Started"}
                  </span>
                </div>

                <div className="col-span-1 text-gray-800 font-medium">
                  Framework:
                </div>
                <div className="col-span-2 text-gray-700">
                  {framework?.name || "N/A"}
                </div>

                <div className="col-span-1 text-gray-800 font-medium">
                  Total Controls:
                </div>
                <div className="col-span-2 text-gray-700">
                  {displayProject.totalControls || 0}
                </div>

                <div className="col-span-1 text-gray-800 font-medium">
                  Owner:
                </div>
                <div className="col-span-2 text-gray-700">
                  {project.owner_name || project.owner || "—"}
                </div>

                <div className="col-span-1 text-gray-800 font-medium">
                  Auditors:
                </div>
                <div className="col-span-2">
                  {auditors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {auditors.map((auditor) => (
                        <span
                          key={auditor.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {auditor.username ||
                            auditor.name ||
                            `Auditor ${auditor.id}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-700">—</span>
                  )}
                </div>

                {/* Audit Enabled Status Bar */}
                <div className="col-span-1 text-gray-800 font-medium">
                  Audit Enabled:
                </div>
                <div className="col-span-2 flex items-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      auditEnabled
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {auditEnabled ? "ON" : "OFF"}
                  </span>
                </div>
              </div>

              {/* Single "Created at" line */}
              <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                Created at: {formatDateTime(project.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Updated Footer */}
        <div className="bg-gray-50 flex items-center justify-end px-10 py-4 space-x-3 border-t border-gray-200">
          <button
            onClick={() => onDelete(project.id)}
            className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
          >
            Delete
          </button>
          <button
            onClick={() => onOpenProject(project)}
            className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            Open Project
          </button>
        </div>
      </div>

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

export default ProjectOverviewModal;
