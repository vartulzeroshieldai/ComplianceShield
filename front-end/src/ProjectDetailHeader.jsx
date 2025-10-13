// src/components/Projects/ProjectDetailHeader.jsx

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  FaRocket,
  FaPauseCircle,
  FaHourglassHalf,
  FaCheckCircle,
  FaChevronRight,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaProjectDiagram,
  FaShieldAlt,
  FaFolderOpen,
  FaEye,
  FaTimes,
  FaUserFriends,
  FaFileAlt,
  FaCheck,
  FaUserShield,
  FaChartBar,
} from "react-icons/fa";

export default function ProjectDetailHeader({
  project,
  evidenceData = [],
  tabs,
  activeTab,
  setActiveTab,
  fetchWithAuth,
}) {
  // Use enhanced project data if available
  const projectData = project;
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const totalControls =
    projectData.totalControls || project.controlsData?.length || 0;
  const implementedControls =
    projectData.implementedControls ||
    project.controlsData?.filter(
      (c) =>
        c.status === "Completed" ||
        c.status === "Implemented" ||
        c.implementationStatus === "Implemented"
    ).length ||
    0;
  const evidenceCollected = projectData.totalEvidence || evidenceData.length;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatusCardStatus
            status={projectData.status || project.status}
            progress={projectData.progress || project.progress || 0}
            onStart={() => setShowJourneyModal(true)}
          />
          <ProjectStatCard
            title="Project Completion"
            value={`${projectData.progress || project.progress || 0}%`}
            subtitle="Overall project completion percentage"
            icon={FaProjectDiagram}
            iconColor="text-blue-600"
            bgColor="bg-white"
            gradient="bg-gradient-to-br from-blue-100/50 via-blue-50/40 to-white"
            trend="up"
            trendValue="+5%"
          />
          <ProjectStatCard
            title="Controls Implemented"
            value={implementedControls}
            subtitle={`${implementedControls} of ${totalControls} controls completed`}
            icon={FaShieldAlt}
            iconColor="text-green-600"
            bgColor="bg-white"
            gradient="bg-gradient-to-br from-green-100/50 via-green-50/40 to-white"
            trend="up"
            trendValue="+12%"
          />
          <ProjectStatCard
            title="Evidence Collected"
            value={evidenceCollected}
            subtitle="Evidence items uploaded and verified"
            icon={FaFolderOpen}
            iconColor="text-purple-600"
            bgColor="bg-white"
            gradient="bg-gradient-to-br from-purple-100/50 via-purple-50/40 to-white"
            trend="up"
            trendValue="+8%"
          />
        </div>

        <div className="flex justify-center border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Project Journey Modal */}
      {showJourneyModal && (
        <ProjectJourneyModal
          onClose={() => setShowJourneyModal(false)}
          project={project}
          fetchWithAuth={fetchWithAuth}
        />
      )}
    </div>
  );
}

// Project Status Card with Progress Bar and Start Button
function StatusCardStatus({ status, progress, onStart }) {
  const getStatusColor = () => {
    switch (status) {
      case "Completed":
        return "text-green-600";
      case "In Progress":
        return "text-yellow-600";
      default:
        return "text-red-600";
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case "Completed":
        return "bg-green-500";
      case "In Progress":
        return "bg-yellow-500";
      default:
        return "bg-red-500";
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300 bg-gradient-to-br from-gray-100/50 via-gray-50/40 to-white">
      <div className="flex flex-col h-full">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <FaProjectDiagram className="text-lg text-gray-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-700">
        PROJECT STATUS
          </h3>
        </div>

        <div className="mb-3 flex-1">
          <div className={`text-3xl font-bold mb-1 ${getStatusColor()}`}>
            {status}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">{progress}% Complete</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            ></div>
      </div>
        </div>

        {/* Start Button - moved to bottom right */}
        <div className="flex justify-end">
          <button
            onClick={onStart}
            className="inline-flex items-center px-4 py-2 bg-white text-teal-500 hover:bg-teal-500 hover:text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 space-x-2 cursor-pointer"
          >
            <FaRocket className="w-4 h-4" />
            <span>Start Project</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Project StatCard component matching ComplianceDashboard style
function ProjectStatCard({
  title,
  value,
  subtitle,
  icon: IconComponent,
  iconColor,
  bgColor,
  gradient,
  trend,
  trendValue,
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300 ${gradient}`}
    >
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center space-x-3 mb-2">
          <div
            className={`w-10 h-10 rounded-lg ${
              bgColor || "bg-white/20"
            } flex items-center justify-center shadow-sm`}
          >
            <IconComponent className={`text-lg ${iconColor || "text-white"}`} />
          </div>
          <h3 className="text-base font-semibold text-gray-700 uppercase tracking-wide">
            {title}
          </h3>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
          {trend && (
            <div
              className={`flex items-center text-sm font-medium mb-2 ${
                trend === "up"
                  ? "text-green-600"
                  : trend === "down"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {trend === "up" && <FaArrowUp className="w-4 h-4 mr-1" />}
              {trend === "down" && <FaArrowDown className="w-4 h-4 mr-1" />}
              {trend === "neutral" && <FaMinus className="w-4 h-4 mr-1" />}
              <span>{trendValue || "0%"}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 leading-5 font-medium mt-auto">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// Project Journey Modal Component
function ProjectJourneyModal({ onClose, project, fetchWithAuth }) {
  const [formData, setFormData] = useState({
    addMembers: "",
    addAuditor: "",
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableAuditors, setAvailableAuditors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available users and auditors from the same organization
  useEffect(() => {
    const fetchData = async () => {
      if (!project?.id || !fetchWithAuth) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch users from the same organization
        const usersResponse = await fetchWithAuth(
          `/api/projects/${project.id}/team_members/`
        );
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          // Filter out owners and auditors (auditors should only be in the auditor dropdown)
          const availableUsersData = usersData.filter(
            (user) =>
              !user.is_owner &&
              user.role &&
              !user.role.toLowerCase().includes("auditor")
          );

          // If no users available, show all non-auditor users for testing
          if (availableUsersData.length === 0) {
            const nonAuditorUsers = usersData.filter(
              (user) =>
                user.role && !user.role.toLowerCase().includes("auditor")
            );
            setAvailableUsers(nonAuditorUsers);
          } else {
            setAvailableUsers(availableUsersData);
          }
        } else {
          console.error(
            "Failed to fetch users:",
            usersResponse.status,
            usersResponse.statusText
          );
        }

        // Fetch auditors from the same organization
        const auditorsResponse = await fetchWithAuth(`/api/accounts/auditors/`);
        if (auditorsResponse.ok) {
          const auditorsData = await auditorsResponse.json();

          // If no auditors found, use users with auditor roles as fallback
          if (auditorsData.length === 0 && usersResponse.ok) {
            const usersData = await usersResponse.json();
            const auditorUsers = usersData.filter(
              (user) => user.role && user.role.toLowerCase().includes("auditor")
            );

            // If still no auditor users, show empty array (no fallback to all users)
            if (auditorUsers.length === 0) {
              setAvailableAuditors([]);
            } else {
              setAvailableAuditors(auditorUsers);
            }
          } else {
            setAvailableAuditors(auditorsData);
          }
        } else {
          console.error(
            "Failed to fetch auditors:",
            auditorsResponse.status,
            auditorsResponse.statusText
          );
          // Fallback to auditor users if auditors endpoint fails
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const auditorUsers = usersData.filter(
              (user) => user.role && user.role.toLowerCase().includes("auditor")
            );

            // If still no auditor users, show empty array
            if (auditorUsers.length === 0) {
              setAvailableAuditors([]);
            } else {
              setAvailableAuditors(auditorUsers);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch users and auditors:", err);
        setError("Failed to load available users and auditors");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project?.id, project?.organization, fetchWithAuth, project]);

  const handleInputChange = (stepKey, value) => {
    setFormData((prev) => ({
      ...prev,
      [stepKey]: value,
    }));
  };

  // Create approval task for auditor assignment
  const createAuditorApprovalTask = async (auditor, project) => {
    try {
      const taskData = {
        title: `Auditor Assignment Approval`,
        type: "Project Management",
        description: `Approve auditor assignment for project "${
          project.name
        }". Auditor: ${auditor.name || auditor.username} - ${
          auditor.organization || "Auditor"
        }`,
        priority: "High",
        status: "Pending",
        category: "auditor_assignment",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 7 days from now in YYYY-MM-DD format
        details: {
          auditorId: auditor.id,
          auditorName: auditor.name || auditor.username,
          auditorEmail: auditor.email || "N/A",
          auditorOrganization: auditor.organization || "N/A",
          projectId: project.id,
          projectName: project.name,
          projectFramework: project.framework_name || "N/A",
          department: "Project Management",
        },
      };

      // Create the task via API
      const response = await fetchWithAuth("/api/auditing/todos/", {
        method: "POST",
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        console.log("Auditor approval task created successfully");
        return true;
      } else {
        console.error(
          "Failed to create auditor approval task:",
          response.status
        );
        return false;
      }
    } catch (error) {
      console.error("Failed to create auditor approval task:", error);
      return false;
    }
  };

  const handleAddToProject = async (stepKey, selectedId) => {
    if (!project?.id || !fetchWithAuth) return;

    try {
      if (stepKey === "addMembers") {
        // Add user as project member
        const response = await fetchWithAuth(
          `/api/projects/${project.id}/add_member/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: selectedId,
              permission_level: "view",
            }),
          }
        );

        if (response.ok) {
          // Remove the user from available options
          setAvailableUsers((prev) =>
            prev.filter((user) => user.id !== parseInt(selectedId))
          );
          setFormData((prev) => ({ ...prev, addMembers: "" }));
          alert("User added to project successfully!");
        } else {
          const errorData = await response.json();
          alert(`Failed to add user: ${errorData.error || "Unknown error"}`);
        }
      } else if (stepKey === "addAuditor") {
        // Add auditor to project
        const response = await fetchWithAuth(
          `/api/projects/${project.id}/add_auditor/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              auditor_id: selectedId,
            }),
          }
        );

        if (response.ok) {
          // Find the auditor details for the task creation
          const selectedAuditor = availableAuditors.find(
            (auditor) => auditor.id === parseInt(selectedId)
          );

          // Create approval task for auditor assignment
          const taskCreated = await createAuditorApprovalTask(
            selectedAuditor,
            project
          );

          if (taskCreated) {
            // Remove the auditor from available options
            setAvailableAuditors((prev) =>
              prev.filter((auditor) => auditor.id !== parseInt(selectedId))
            );
            setFormData((prev) => ({ ...prev, addAuditor: "" }));
            alert(
              "Auditor added to project successfully! An approval task has been created for admin review."
            );
          } else {
            // Task creation failed - show warning but don't rollback auditor assignment
            alert(
              "Auditor added to project, but failed to create approval task. Please contact admin."
            );
          }
        } else {
          const errorData = await response.json();
          alert(`Failed to add auditor: ${errorData.error || "Unknown error"}`);
        }
      }
    } catch (error) {
      console.error("Error adding to project:", error);
      alert("Failed to add to project. Please try again.");
    }
  };

  const journeySteps = [
    {
      id: 1,
      title: "Add Members",
      description: "Add users from your organization to this project",
      icon: FaUserFriends,
      color: "bg-blue-500",
      stepKey: "addMembers",
      type: "dropdown",
      options: availableUsers,
      completed: false,
    },
    {
      id: 2,
      title: "Add Auditor",
      description: "Add an auditor from your organization to this project",
      icon: FaUserShield,
      color: "bg-orange-500",
      stepKey: "addAuditor",
      type: "dropdown",
      options: availableAuditors,
      completed: false,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto m-4 overflow-hidden transform transition-all duration-300 animate-scaleIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Project Journey
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Complete these steps to successfully launch your compliance
              project
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-10 py-10 bg-white">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-500">
                Loading available users and auditors...
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {journeySteps.map((step) => {
                const IconComponent = step.icon;
  return (
    <div
                    key={step.id}
                    className="bg-gray-50 border border-gray-100 rounded-lg p-6 hover:shadow-md transition-all duration-200 hover:border-gray-300"
                  >
                    <div className="flex flex-col space-y-4">
                      {/* Header */}
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-12 h-12 ${step.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {step.title}
                          </h3>
                          <p className="text-sm text-gray-600 leading-5">
                            {step.description}
                          </p>
                        </div>
      </div>

                      {/* Interactive Input */}
                      <div className="space-y-3">
                        {step.type === "dropdown" ? (
                          <select
                            value={formData[step.stepKey]}
                            onChange={(e) =>
                              handleInputChange(step.stepKey, e.target.value)
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                            disabled={step.options.length === 0}
                          >
                            <option value="">
                              {step.options.length === 0
                                ? "No available options"
                                : step.stepKey === "addMembers"
                                ? "Select a user..."
                                : "Select an auditor..."}
                            </option>
                            {step.options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {step.stepKey === "addMembers"
                                  ? `${option.name || option.username} - ${
                                      option.role || "Member"
                                    }`
                                  : `${option.name || option.username} - ${
                                      option.organization || "Auditor"
                                    }`}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={step.placeholder}
                            value={formData[step.stepKey]}
                            onChange={(e) =>
                              handleInputChange(step.stepKey, e.target.value)
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                          />
                        )}

                        {/* Status and Action */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              formData[step.stepKey]
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {formData[step.stepKey]
                              ? "Ready to Add"
                              : "Not Selected"}
                          </span>
                          {formData[step.stepKey] && (
                            <button
                              onClick={() =>
                                handleAddToProject(
                                  step.stepKey,
                                  formData[step.stepKey]
                                )
                              }
                              className="px-4 py-2 bg-white text-teal-400 rounded-full shadow hover:bg-teal-400 hover:text-white font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              Add to Project
                            </button>
                          )}
          </div>
        </div>
      </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal Footer */}
          <div className="bg-gray-50 flex items-center justify-between px-10 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {availableUsers.length} users and {availableAuditors.length}{" "}
              auditors available
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
              >
                Close
              </button>
            </div>
          </div>
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
