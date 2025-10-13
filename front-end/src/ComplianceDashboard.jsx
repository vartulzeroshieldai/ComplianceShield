// src/ComplianceDashboard.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaHome,
  FaUsers,
  FaBell,
  FaBars,
  FaUserCircle,
  FaChevronDown,
  FaCommentDots,
  FaCog,
  FaPlus,
  FaMinus,
  FaFileAlt,
  FaEllipsisH,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSearch,
  FaChartLine,
  FaProjectDiagram,
  FaFolderOpen,
  FaQuestionCircle,
  FaTasks,
  FaArrowUp,
  FaFolder,
  FaEye,
  FaShareAlt,
  FaClock,
  FaEdit,
  FaTrash,
  FaArrowDown,
  FaChevronRight,
  FaTimes,
  FaUserShield,
} from "react-icons/fa";
import {
  Chart as ChartJS,
  RadialLinearScale,
  Filler,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  DoughnutController,
} from "chart.js";
import { Bar, Doughnut, Pie, Line } from "react-chartjs-2";
import QuestionnaireModal from "./QuestionnaireModal";
import { questionnaireSections } from "./questionnaireSections";
import UserManagement from "./UserManagement";
import Projects from "./Projects";
import RiskManagement from "./RiskManagement";
import Chatbotpanel from "./Chatbotpanel";
import Settings from "./Settings";
import Logs from "./Logs";
import ProjectDetail from "./ProjectDetail";
import ComplianceToDoTracker from "./ComplianceToDoTracker";
import DataProtectionPlatform from "./DataProtectionPlatform";
import { useAuth } from "./AuthContext";
import { useCompliance } from "./useCompliance";
import { usePrivacyDetection } from "./PrivacyDetectionContext";

ChartJS.register(
  CategoryScale,
  RadialLinearScale,
  Filler,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend
);

export default function ComplianceDashboard() {
  console.log("🔍 Dashboard - ComplianceDashboard component rendered");
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    logout,
    fetchWithAuth,
    canEditProject,
    canManageProjectMembers,
  } = useAuth();
  console.log("🔍 Dashboard - User from auth:", user);

  // Use compliance context for organization-specific data
  const {
    organizationData,
    projects: contextProjects,
    risks: contextRisks,
    frameworks: contextFrameworks,
    isLoading,
    hasErrors,
    refreshAllData,
  } = useCompliance();

  // Debug logging for dashboard data
  console.log("🔍 ComplianceDashboard - organizationData:", organizationData);
  console.log(
    "🔍 ComplianceDashboard - contextProjects:",
    contextProjects.length
  );
  console.log("🔍 ComplianceDashboard - contextRisks:", contextRisks.length);
  console.log(
    "🔍 ComplianceDashboard - contextFrameworks:",
    contextFrameworks.length
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [selectedSection, setSelectedSection] = useState("dashboard");
  const [showChatbot, setShowChatbot] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showComplianceDropdown, setShowComplianceDropdown] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [navigateToProjects, setNavigateToProjects] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to handle section changes and clear URL parameters
  const handleSectionChange = useCallback(
    (section) => {
      setSelectedSection(section);

      // Clear URL parameters when navigating away from project detail
      // But only if we're not navigating to projectDetail with URL parameters
      if (section !== "projectDetail") {
        setDetailProject(null);
        setSearchParams({});
      }
    },
    [setSearchParams]
  );

  // Refresh handler function
  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    try {
      await refreshAllData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAllData]);

  const handleManageMembers = async (project) => {
    setSelectedProject(project);
    setShowMemberModal(true);

    try {
      const response = await fetchWithAuth(
        `/api/projects/${project.id}/team_members/`
      );
      if (response.ok) {
        const members = await response.json();
        setProjectMembers(members);
      }
    } catch (error) {
      console.error("Error fetching project members:", error);
    }
  };

  const handleAddMember = async (userId, permissionLevel) => {
    try {
      const response = await fetchWithAuth(
        `/api/projects/${selectedProject.id}/add_member/`,
        {
          method: "POST",
          body: JSON.stringify({
            user_id: userId,
            permission_level: permissionLevel,
          }),
        }
      );

      if (response.ok) {
        // Refresh members list
        const membersResponse = await fetchWithAuth(
          `/api/projects/${selectedProject.id}/team_members/`
        );
        if (membersResponse.ok) {
          const members = await membersResponse.json();
          setProjectMembers(members);
        }
      }
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const response = await fetchWithAuth(
        `/api/projects/${selectedProject.id}/remove_member/`,
        {
          method: "DELETE",
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      );

      if (response.ok) {
        // Refresh members list
        const membersResponse = await fetchWithAuth(
          `/api/projects/${selectedProject.id}/team_members/`
        );
        if (membersResponse.ok) {
          const members = await membersResponse.json();
          setProjectMembers(members);
        }
      }
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [detailProject, setDetailProject] = useState(null);

  // Handle URL parameters for navigation to specific project and tab
  useEffect(() => {
    const projectId = searchParams.get("project");
    const tab = searchParams.get("tab");

    console.log("🔍 ComplianceDashboard - URL parameter handling", {
      projectId,
      tab,
      selectedSection,
      detailProjectId: detailProject?.id,
      contextProjectsLength: contextProjects.length,
    });

    // Handle URL parameters if we have a project ID and projects are loaded
    // Only auto-navigate if there are comment-related parameters or explicit tab parameter
    const hasCommentParams =
      searchParams.get("control") ||
      searchParams.get("parentControl") ||
      searchParams.get("controlId") ||
      searchParams.get("controlTitle");
    const shouldAutoNavigate =
      projectId && contextProjects.length > 0 && (tab || hasCommentParams);

    if (shouldAutoNavigate) {
      const project = contextProjects.find((p) => p.id === parseInt(projectId));
      if (project) {
        // Only navigate if we're not already viewing this project
        if (
          selectedSection !== "projectDetail" ||
          detailProject?.id !== project.id
        ) {
          console.log(
            "🔍 ComplianceDashboard - Auto-navigating to project detail",
            {
              projectId: project.id,
              projectName: project.name,
              tab,
              hasCommentParams,
              reason: tab ? "tab parameter" : "comment parameters",
            }
          );
          setDetailProject(project);
          setSelectedSection("projectDetail");
        } else {
          console.log(
            "🔍 ComplianceDashboard - Already viewing this project, skipping navigation"
          );
        }

        // If there's a tab parameter, we'll pass it to ProjectDetail
        if (tab) {
          // Store the tab and other parameters for ProjectDetail to use
          setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.set("activeTab", tab);
            return newParams;
          });
        }

        // Clear the URL parameters after processing to prevent re-triggering
        // Use setTimeout to avoid conflicts with the setSearchParams above
        setTimeout(() => {
          setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            // Keep only the project parameter, remove tab and other comment-related params
            newParams.delete("tab");
            newParams.delete("control");
            newParams.delete("parentControl");
            newParams.delete("controlId");
            newParams.delete("controlTitle");
            newParams.delete("activeTab");
            return newParams;
          });
        }, 100);
      }
    } else if (projectId && contextProjects.length > 0) {
      // Project ID exists but no auto-navigation needed - just log for debugging
      console.log(
        "🔍 ComplianceDashboard - Project ID in URL but no auto-navigation needed",
        {
          projectId,
          tab,
          hasCommentParams,
          selectedSection,
        }
      );
    }
  }, [
    searchParams,
    contextProjects,
    setSearchParams,
    selectedSection,
    detailProject,
  ]);

  // Use projects from context, fallback to local state for backward compatibility
  const [localProjects, setLocalProjects] = useState(() => {
    return JSON.parse(localStorage.getItem("projects") || "[]");
  });

  // Use context data if available, otherwise fallback to local state
  const projects = contextProjects.length > 0 ? contextProjects : localProjects;
  const risks = contextRisks;
  const frameworks = contextFrameworks;

  // Debug logging for projects
  console.log("🔍 ComplianceDashboard - projects:", projects.length);
  if (projects.length > 0) {
    console.log("🔍 Sample project:", projects[0]);
  }

  useEffect(() => {
    localStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  // Use the name from the JWT if available
  const userName = user ? user.username : "Guest";

  // Use dynamic data from organization context
  const threatsData = {
    total: organizationData.totalProjects || 0,
    unresolved: organizationData.totalRisks || 0,
    resolved: organizationData.controlStatusBreakdown?.implemented || 0,
    threatScore: organizationData.totalEvidence || 0,
  };

  // --- RBAC(Role-Based Access Control) Logic for UI ---
  const canViewUserManagement =
    user && ["Admin", "Contributor"].includes(user.role);
  
  console.log("🔍 ComplianceDashboard - User Management Access:", {
    user: !!user,
    userRole: user?.role,
    canViewUserManagement,
    selectedSection
  });
  const canViewQuestionnaire = user && user.role !== "Auditor";
  // --- FIX: Logs should only be visible to Admin ---
  const canViewLogs = user && user.role === "Admin";
  const canCreateProjects =
    user && ["Admin", "Contributor"].includes(user.role);
  // --- Privacy Detection should only be visible to Admin and Contributor ---
  const canViewPrivacyDetection =
    user && ["Admin", "Contributor"].includes(user.role);

  // Debug logging for user role and access
  useEffect(() => {
    console.log("🔍 Privacy Detection Access Debug:", {
      user: user,
      userRole: user?.role,
      canViewPrivacyDetection: canViewPrivacyDetection,
      selectedSection: selectedSection,
    });
  }, [user, canViewPrivacyDetection, selectedSection]);

  // Redirect to dashboard if user tries to access Privacy Detection without permission
  useEffect(() => {
    if (selectedSection === "privacyDetection" && !canViewPrivacyDetection) {
      console.log("🔍 Redirecting from Privacy Detection - Access Denied");
      handleSectionChange("dashboard");
    }
  }, [selectedSection, canViewPrivacyDetection]);

  return (
    <div className="min-h-screen flex bg-white relative overflow-hidden">
      {/* Hamburger Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-5 left-5 z-50 p-3 rounded-lg bg-gray-800 shadow-md hover:bg-gray-700 transition duration-200 border border-gray-700"
        aria-label="Toggle Sidebar"
      >
        <FaBars size={20} className="text-gray-300" />
      </button>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          {/* Mobile overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Updated Professional Sidebar with User Info */}
          <aside className="fixed inset-y-0 left-0 w-60 bg-gradient-to-b from-gray-50 to-white py-8 px-4 text-gray-900 z-40 lg:z-30 overflow-auto border-r border-gray-200 shadow-xl lg:shadow-lg transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col">
            {/* Navigation Section */}
            <nav className="space-y-4 mt-16 flex-1">
              <NavItem
                icon={FaHome}
                label="Home"
                onClick={() => handleSectionChange("dashboard")}
                isActive={selectedSection === "dashboard"}
              />
              {canViewUserManagement && (
                <NavItem
                  icon={FaUsers}
                  label="User Management"
                  onClick={() => handleSectionChange("userManagement")}
                  isActive={selectedSection === "userManagement"}
                />
              )}
              {/* Compliance Management Dropdown */}
              <button
                onClick={() =>
                  setShowComplianceDropdown(!showComplianceDropdown)
                }
                className={`w-full text-left py-3 px-3 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium flex items-center justify-between transform hover:scale-105 ${
                  selectedSection === "projects" || showComplianceDropdown
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg scale-105"
                    : "text-gray-700 hover:bg-teal-50 hover:text-teal-700"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FaProjectDiagram
                    size={18}
                    className={`transition-transform duration-200 ${
                      selectedSection === "projects" || showComplianceDropdown
                        ? "scale-110"
                        : "scale-100"
                    }`}
                  />
                  <span className="lg:hidden">Compliance Management</span>
                  <span className="hidden lg:inline">Compliance</span>
                </div>
                <FaChevronDown
                  className={`transform transition-transform duration-200 ${
                    showComplianceDropdown ? "rotate-180" : ""
                  }`}
                  size={12}
                />
              </button>

              {showComplianceDropdown && (
                <div className="mt-2 ml-4 space-y-1">
                  <button
                    onClick={() => {
                      handleSectionChange("projects");
                      setShowComplianceDropdown(false);
                    }}
                    className={`w-full text-left py-2 px-3 rounded-lg transition-all duration-200 text-sm flex items-center space-x-2 cursor-pointer transform hover:scale-105 ${
                      selectedSection === "projects"
                        ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md scale-105"
                        : "text-gray-600 hover:bg-teal-50 hover:text-teal-700"
                    }`}
                  >
                    <FaProjectDiagram
                      size={12}
                      className={`transition-transform duration-200 ${
                        selectedSection === "projects"
                          ? "scale-110"
                          : "scale-100"
                      }`}
                    />
                    <span>Projects</span>
                  </button>
                </div>
              )}
              {canViewQuestionnaire && (
                <NavItem
                  icon={FaQuestionCircle}
                  label="Questionnaire"
                  onClick={() => setShowQuestionnaire(true)}
                  isActive={false}
                />
              )}
              <NavItem
                icon={FaExclamationTriangle}
                label="Risk Management"
                onClick={() => handleSectionChange("riskManagement")}
                isActive={selectedSection === "riskManagement"}
              />
              {canViewPrivacyDetection && (
                <NavItem
                  icon={FaUserShield}
                  label="Privacy Detection"
                  onClick={() => setSelectedSection("privacyDetection")}
                  isActive={selectedSection === "privacyDetection"}
                />
              )}
              <MoreDropdown
                showDropdown={showMoreDropdown}
                setShowDropdown={setShowMoreDropdown}
                setSelectedSection={handleSectionChange}
                canViewLogs={canViewLogs}
                selectedSection={selectedSection}
              />
            </nav>

            {/* User Info Section at Bottom */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-3 px-3 py-3 rounded-lg bg-gray-50 hover:bg-teal-50 transition-colors duration-200">
                {/* User Avatar with Initials */}
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials(userName)}
                  </span>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.role || "User"}
                  </p>
                </div>

                {/* Optional: Settings/Profile Icon */}
                <button
                  onClick={() => handleSectionChange("settings")}
                  className="p-1.5 text-gray-400 hover:text-teal-600 rounded-md hover:bg-white transition-colors duration-200"
                  title="User Settings"
                >
                  <FaCog size={14} />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? "lg:pl-60 lg:max-w-[calc(100%)]" : "lg:max-w-full"
        }`}
      >
        {/* Header */}
        <header
          className={`w-full flex items-center justify-between px-8 py-5 bg-white shadow-sm border-b border-gray-200 z-20 sticky top-0 ${
            !sidebarOpen ? "pl-[5.5rem]" : ""
          }`}
        >
          <div>
            <h2 className="text-xl font-bold text-black">
              Data Security & Privacy Compliance
            </h2>
            <p className="text-black text-sm">Monitoring Platform</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                /* handle notification click */
              }}
              className="p-2 rounded hover:bg-gray-200 text-black cursor-pointer"
              title="Notifications"
            >
              <FaBell size={20} />
            </button>
            <button
              onClick={() => handleSectionChange("settings")}
              className="p-2 rounded hover:bg-gray-200 text-black cursor-pointer"
              title="Settings"
            >
              <FaCog size={20} />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded hover:bg-gray-200 text-black cursor-pointer"
              title="Logout"
            >
              <FaUserCircle size={26} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 bg-white p-8 overflow-auto">
          {selectedSection === "dashboard" && (
            <>
              <div className="mb-8">
                <div className="rounded-lg shadow-sm p-6 border border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                          Compliance Monitoring Dashboard
                        </h1>
                        <p className="text-sm text-gray-500">
                          Real-time view of compliance health across frameworks
                          and business units
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Welcome back, {userName}!
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date().toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isLoading
                            ? "bg-yellow-500 animate-pulse"
                            : "bg-green-500"
                        }`}
                      ></div>
                      <span>
                        {isLoading
                          ? "Loading complete data..."
                          : organizationData.lastUpdated
                          ? `Last updated: ${new Date(
                              organizationData.lastUpdated
                            ).toLocaleString()}`
                          : "Initializing data..."}
                      </span>
                      {refreshTrigger > 0 && (
                        <span className="text-xs text-blue-600 font-medium">
                          (Refreshed {refreshTrigger} time
                          {refreshTrigger > 1 ? "s" : ""})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Compliance Officer: {userName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        contextProjects.length > 0 && 
                        contextRisks.length >= 0 && 
                        contextFrameworks.length > 0
                          ? "bg-green-500" 
                          : "bg-orange-500"
                      }`}></div>
                      <span className="text-xs">
                        Data: {contextProjects.length} projects, {contextRisks.length} risks, {contextFrameworks.length} frameworks
                      </span>
                    </div>
                    {/* <div className="flex items-center space-x-2 ml-auto">
                      <button
                        onClick={handleRefreshData}
                        disabled={isLoading || isRefreshing}
                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRefreshing ? "Refreshing..." : "Refresh Data"}
                      </button>
                      <button className="px-3 py-1 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors text-xs font-medium">
                        Export Dashboard
                      </button>
                    </div> */}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Active Projects"
                  value={organizationData.totalProjects || 0}
                  subtitle="Number of active compliance projects in your organization"
                  icon={FaCheckCircle}
                  iconColor="text-green-600"
                  bgColor="bg-white"
                  gradient="bg-gradient-to-br from-green-100/50 via-green-50/40 to-white"
                  trend="up"
                  trendValue="+12%"
                />
                <StatCard
                  title="Total Risks"
                  value={organizationData.totalRisks || 0}
                  subtitle="Number of risks identified across all projects"
                  icon={FaShieldAlt}
                  iconColor="text-yellow-500"
                  bgColor="bg-white"
                  gradient="bg-gradient-to-br from-yellow-100/50 via-yellow-50/30 to-white"
                  trend="neutral"
                  trendValue="0%"
                />
                <StatCard
                  title="Implemented Controls"
                  value={
                    organizationData.controlStatusBreakdown?.implemented || 0
                  }
                  subtitle="Number of controls that have been implemented"
                  icon={FaExclamationTriangle}
                  iconColor="text-red-600"
                  bgColor="bg-white"
                  gradient="bg-gradient-to-br from-red-100/50 via-red-50/30 to-white"
                  trend="down"
                  trendValue="-8%"
                />
                <StatCard
                  title="Total Evidence"
                  value={organizationData.totalEvidence || 0}
                  subtitle="Number of evidence items collected across all projects"
                  icon={FaChartLine}
                  iconColor="text-blue-600"
                  bgColor="bg-white"
                  gradient="bg-gradient-to-br from-blue-100/50 via-blue-50/40 to-white"
                  trend="up"
                  trendValue="+24%"
                />
              </div>

              <div className="mb-8">
                <div className="rounded-lg shadow-lg p-8 border border-gray-200 w-full bg-white">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-bold text-black">
                      Overall Security & Privacy Compliance Score
                    </h3>
                  </div>
                  <div className="flex justify-around items-center px-8 mb-6 hover:scale-105 transition-transform duration-300">
                    <AnimatedProgressCircle
                      percent={organizationData.securityScore || 0}
                      color="#10b981"
                      label="Security"
                      delay={0}
                    />

                    <AnimatedProgressCircle
                      percent={organizationData.privacyScore || 0}
                      color="#3b82f6"
                      label="Privacy"
                      delay={200}
                    />

                    <AnimatedProgressCircle
                      percent={organizationData.regulatoryScore || 0}
                      color="#8b5cf6"
                      label="Regulatory"
                      delay={400}
                    />
                  </div>
                  <p className="text-center text-sm text-gray-800 mb-4">
                    The Overall Score is a weighted average of Security (40%),
                    Privacy (35%), and Regulatory (25%) compliance scores,
                    reflecting their relative importance.
                  </p>
                  <div className="flex justify-center">
                    <button className="text-center px-8 py-2 rounded-full bg-green-100 text-green-800 text-sm font-bold shadow hover:scale-105 duration-200 cursor-pointer">
                      {organizationData.complianceScore || 0}%
                    </button>
                  </div>
                  
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* First row: two charts, each half width on lg */}
                <div className="lg:col-span-6 min-w-0">
                  <ComplianceStatusChart />
                </div>
                <div className="lg:col-span-6 min-w-0">
                  <PrivacyRiskByBusinessUnitChart />
                </div>

                {/* Second row: three charts, each one-third width on lg */}
                <div className="lg:col-span-4 min-w-0">
                  <CompliantVsNonCompliantChart />
                </div>
                <div className="lg:col-span-4 min-w-0">
                  <EvidenceCollectionStatusChart />
                </div>
                <div className="lg:col-span-4 min-w-0">
                  <DataProtectionAssessmentChart />
                </div>
              </div>

              <div className="mb-8">
                <FrameworkProgressChart />
              </div>

              <DarkCard title="Projects Management" icon={FaProjectDiagram}>
                {/* Header Section with Actions */}
                <div className="mb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    {/* Search and Filter Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaSearch className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          className="block w-full sm:w-72 pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 hover:bg-white"
                        />
                      </div>

                      <div className="relative">
                        <select
                          value={projectFilter}
                          onChange={(e) => setProjectFilter(e.target.value)}
                          className="appearance-none bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 cursor-pointer min-w-[160px]"
                        >
                          <option value="">All Statuses</option>
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <FaChevronDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span className="font-medium">
                          {
                            projects.filter((p) => {
                              return (
                                (!projectFilter ||
                                  p.status === projectFilter) &&
                                p.name
                                  .toLowerCase()
                                  .includes(projectSearch.toLowerCase())
                              );
                            }).length
                          }
                        </span>
                        <span>projects found</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modern Table Container */}
                <div className="bg-gray-50/30 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                          <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <FaFolder className="h-3 w-3" />
                              <span>Project Details</span>
                            </div>
                          </th>
                          <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <FaShieldAlt className="h-3 w-3" />
                              <span>Framework</span>
                            </div>
                          </th>
                          <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <FaClock className="h-3 w-3" />
                              <span>Status</span>
                            </div>
                          </th>
                          <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Progress
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-100">
                        {projects
                          .filter((p) => {
                            return (
                              (!projectFilter || p.status === projectFilter) &&
                              p.name
                                .toLowerCase()
                                .includes(projectSearch.toLowerCase())
                            );
                          })
                          .map((proj) => (
                            <tr
                              key={proj.id}
                              className="hover:bg-blue-50/30 transition-all duration-200 group cursor-pointer"
                            >
                              <td className="py-5 px-6">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                                    <FaProjectDiagram className="text-blue-600 text-sm" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                      {proj.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      ID: {proj.id} • Created{" "}
                                      {new Date().toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-5 px-6">
                                <div className="flex items-center space-x-3">
                                  <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center">
                                    <FaShieldAlt className="text-teal-600 text-xs" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {proj.framework_name ||
                                        frameworks.find(
                                          (f) => f.id === proj.framework
                                        )?.name ||
                                        (proj.framework
                                          ? `ID: ${proj.framework}`
                                          : "Not Assigned")}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-5 px-6">
                                <div className="flex items-center space-x-2">
                                  {(() => {
                                    // Calculate dynamic status based on evidence and controls
                                    const evidenceCount =
                                      proj.evidence_count || 0;
                                    const controlCount =
                                      proj.control_count || 0;
                                    let dynamicStatus = proj.status;

                                    if (evidenceCount > 0 && controlCount > 0) {
                                      const progressRatio =
                                        evidenceCount / controlCount;
                                      if (progressRatio >= 0.8) {
                                        dynamicStatus = "Completed";
                                      } else if (progressRatio >= 0.1) {
                                        // Lowered threshold from 0.3 to 0.1 (10%)
                                        dynamicStatus = "In Progress";
                                      } else {
                                        dynamicStatus = "Not Started";
                                      }
                                    }

                                    return (
                                      <>
                                        <div
                                          className={`w-2 h-2 rounded-full ${
                                            dynamicStatus === "Completed"
                                              ? "bg-green-400"
                                              : dynamicStatus === "In Progress"
                                              ? "bg-yellow-400"
                                              : dynamicStatus === "Not Started"
                                              ? "bg-gray-400"
                                              : "bg-blue-400"
                                          }`}
                                        ></div>
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            dynamicStatus === "Completed"
                                              ? "bg-green-100 text-green-800"
                                              : dynamicStatus === "In Progress"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : dynamicStatus === "Not Started"
                                              ? "bg-gray-100 text-gray-800"
                                              : "bg-blue-100 text-blue-800"
                                          }`}
                                        >
                                          {dynamicStatus === "In Progress"
                                            ? "Ongoing"
                                            : dynamicStatus}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>

                              <td className="py-5 px-6">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-300 ${(() => {
                                        const evidenceCount =
                                          proj.evidence_count || 0;
                                        const controlCount =
                                          proj.control_count || 0;
                                        let dynamicStatus = proj.status;

                                        if (
                                          evidenceCount > 0 &&
                                          controlCount > 0
                                        ) {
                                          const progressRatio =
                                            evidenceCount / controlCount;
                                          if (progressRatio >= 0.8) {
                                            dynamicStatus = "Completed";
                                          } else if (progressRatio >= 0.1) {
                                            // Lowered threshold from 0.3 to 0.1 (10%)
                                            dynamicStatus = "In Progress";
                                          } else {
                                            dynamicStatus = "Not Started";
                                          }
                                        }

                                        return dynamicStatus === "Completed"
                                          ? "bg-green-500"
                                          : dynamicStatus === "In Progress"
                                          ? "bg-yellow-500"
                                          : "bg-gray-400";
                                      })()}`}
                                      style={{
                                        width: `${
                                          proj.progress ||
                                          (() => {
                                            const evidenceCount =
                                              proj.evidence_count || 0;
                                            const controlCount =
                                              proj.control_count || 0;
                                            let dynamicStatus = proj.status;

                                            if (
                                              evidenceCount > 0 &&
                                              controlCount > 0
                                            ) {
                                              const progressRatio =
                                                evidenceCount / controlCount;
                                              if (progressRatio >= 0.8) {
                                                dynamicStatus = "Completed";
                                              } else if (progressRatio >= 0.1) {
                                                // Lowered threshold from 0.3 to 0.1 (10%)
                                                dynamicStatus = "In Progress";
                                              } else {
                                                dynamicStatus = "Not Started";
                                              }
                                            }

                                            return dynamicStatus === "Completed"
                                              ? 100
                                              : dynamicStatus === "In Progress"
                                              ? Math.min(
                                                  75,
                                                  Math.max(
                                                    25,
                                                    evidenceCount * 10
                                                  )
                                                )
                                              : Math.min(25, evidenceCount * 5);
                                          })()
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-600">
                                    {proj.progress ||
                                      (() => {
                                        const evidenceCount =
                                          proj.evidence_count || 0;
                                        const controlCount =
                                          proj.control_count || 0;
                                        let dynamicStatus = proj.status;

                                        if (
                                          evidenceCount > 0 &&
                                          controlCount > 0
                                        ) {
                                          const progressRatio =
                                            evidenceCount / controlCount;
                                          if (progressRatio >= 0.8) {
                                            dynamicStatus = "Completed";
                                          } else if (progressRatio >= 0.1) {
                                            // Lowered threshold from 0.3 to 0.1 (10%)
                                            dynamicStatus = "In Progress";
                                          } else {
                                            dynamicStatus = "Not Started";
                                          }
                                        }

                                        return dynamicStatus === "Completed"
                                          ? 100
                                          : dynamicStatus === "In Progress"
                                          ? Math.min(
                                              75,
                                              Math.max(25, evidenceCount * 10)
                                            )
                                          : Math.min(25, evidenceCount * 5);
                                      })()}
                                    %
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>

                    {/* Empty State */}
                    {projects.filter((p) => {
                      return (
                        (!projectFilter || p.status === projectFilter) &&
                        p.name
                          .toLowerCase()
                          .includes(projectSearch.toLowerCase())
                      );
                    }).length === 0 && (
                      <div className="py-16 px-6 text-center bg-white/50">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <FaProjectDiagram className="text-gray-400 text-2xl" />
                          </div>
                          <div className="space-y-2">
                            <div className="text-lg font-semibold text-gray-700">
                              No projects found
                            </div>
                            <div className="text-sm text-gray-500 max-w-sm">
                              {projectSearch || projectFilter
                                ? "Try adjusting your search terms or filters to find what you're looking for."
                                : "Get started by creating your first compliance project."}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DarkCard>
            </>
          )}

          {selectedSection === "userManagement" && canViewUserManagement && (
            <>
              {console.log("🔍 ComplianceDashboard - Rendering UserManagement component")}
              <UserManagement />
            </>
          )}
          {selectedSection === "projects" && (
            <Projects
              projects={projects}
              setProjects={setLocalProjects}
              openOnMount={navigateToProjects}
              onModalClose={() => setNavigateToProjects(false)}
              onOpenProject={(proj) => {
                setDetailProject(proj);
                handleSectionChange("projectDetail");
              }}
            />
          )}
          {selectedSection === "riskManagement" && (
            <RiskManagement
              risksData={risks}
              onDataUpdate={handleRefreshData}
            />
          )}
          {selectedSection === "settings" && <Settings />}
          {selectedSection === "compliancetodotracker" && (
            <ComplianceToDoTracker />
          )}
          {selectedSection === "logs" && <Logs />}
          {selectedSection === "projectDetail" && detailProject && (
            <ProjectDetail project={detailProject} />
          )}
          {selectedSection === "privacyDetection" &&
            canViewPrivacyDetection && <DataProtectionPlatform />}
        </main>

        <FloatingNotificationButton
          showNotifications={showChatbot}
          setShowNotifications={setShowChatbot}
        />
        {showChatbot && <Chatbotpanel onClose={() => setShowChatbot(false)} />}

        <QuestionnaireModal
          sections={questionnaireSections}
          isOpen={showQuestionnaire}
          onClose={() => setShowQuestionnaire(false)}
          onSave={() => setShowQuestionnaire(false)}
        />

        <MemberManagementModal
          showMemberModal={showMemberModal}
          setShowMemberModal={setShowMemberModal}
          selectedProject={selectedProject}
          projectMembers={projectMembers}
          canManageProjectMembers={canManageProjectMembers}
          handleAddMember={handleAddMember}
          handleRemoveMember={handleRemoveMember}
        />
      </div>
    </div>
  );
}

// ... (The rest of your components like StatCard, DarkCard, NavItem, etc. remain unchanged)
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  bgColor,
  gradient,
  trend,
  trendValue,
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-gray-300 ${gradient}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-3">
            <div
              className={`w-8 h-8 rounded-lg ${
                bgColor || "bg-white/20"
              } flex items-center justify-center`}
            >
              <Icon className={`text-sm ${iconColor || "text-white"}`} />
            </div>
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          </div>

          <div className="mb-2">
            <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
            {trend && (
              <div
                className={`flex items-center text-xs ${
                  trend === "up"
                    ? "text-green-600"
                    : trend === "down"
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {trend === "up" && <FaArrowUp className="w-3 h-3 mr-1" />}
                {trend === "down" && <FaArrowDown className="w-3 h-3 mr-1" />}
                {trend === "neutral" && <FaMinus className="w-3 h-3 mr-1" />}
                <span>{trendValue || "0%"}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-600 leading-4">{subtitle}</p>
        </div>

        <div className="ml-4">
          <button className="w-8 h-8 rounded-lg bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors duration-200">
            <FaChevronRight className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DarkCard({ title, children, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {title && (
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white border-b border-gray-100">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon className="text-blue-600 text-sm" />
              </div>
            )}
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

// Updated NavItem component with light teal colors
function NavItem({ icon: Icon, label, onClick, isActive = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-nowrap items-center space-x-2 py-3 px-3 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium whitespace-nowrap transform hover:scale-105 ${
        isActive
          ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg scale-105"
          : "text-gray-700 hover:bg-teal-50 hover:text-teal-700"
      }`}
    >
      {Icon && (
        <Icon
          className={`text-lg flex-shrink-0 transition-transform duration-200 ${
            isActive ? "scale-110" : "scale-100"
          }`}
        />
      )}
      <span className="flex-shrink-0">{label}</span>
    </button>
  );
}

// Updated MoreDropdown component with light teal colors
function MoreDropdown({
  showDropdown,
  setShowDropdown,
  setSelectedSection,
  canViewLogs,
  selectedSection,
}) {
  const isMoreSectionActive = [
    "settings",
    "logs",
    "compliancetodotracker",
  ].includes(selectedSection);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`w-full text-left py-3 px-3 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium flex items-center justify-between transform hover:scale-105 ${
          isMoreSectionActive || showDropdown
            ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg scale-105"
            : "text-gray-700 hover:bg-teal-50 hover:text-teal-700"
        }`}
      >
        <div className="flex items-center space-x-2">
          <FaEllipsisH
            size={14}
            className={`transition-transform duration-200 ${
              isMoreSectionActive ? "scale-110" : "scale-100"
            }`}
          />
          <span>More</span>
        </div>
        <FaChevronDown
          className={`transform transition-transform duration-200 ${
            showDropdown ? "rotate-180" : ""
          }`}
          size={12}
        />
      </button>

      {showDropdown && (
        <div className="mt-2 ml-4 space-y-1">
          <button
            onClick={() => {
              setSelectedSection("settings");
              setShowDropdown(false);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg transition-all duration-200 cursor-pointer text-sm flex items-center space-x-2 transform hover:scale-105 ${
              selectedSection === "settings"
                ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md scale-105"
                : "text-gray-600 hover:bg-teal-50 hover:text-teal-700"
            }`}
          >
            <FaCog
              size={12}
              className={`transition-transform duration-200 ${
                selectedSection === "settings" ? "scale-110" : "scale-100"
              }`}
            />
            <span>Settings</span>
          </button>

          {canViewLogs && (
            <button
              onClick={() => {
                setSelectedSection("logs");
                setShowDropdown(false);
              }}
              className={`w-full text-left py-2 px-3 rounded-lg transition-all duration-200 cursor-pointer text-sm flex items-center space-x-2 transform hover:scale-105 ${
                selectedSection === "logs"
                  ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md scale-105"
                  : "text-gray-600 hover:bg-teal-50 hover:text-teal-700"
              }`}
            >
              <FaFileAlt
                size={12}
                className={`transition-transform duration-200 ${
                  selectedSection === "logs" ? "scale-110" : "scale-100"
                }`}
              />
              <span>Logs</span>
            </button>
          )}

          <button
            onClick={() => {
              setSelectedSection("compliancetodotracker");
              setShowDropdown(false);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg transition-all duration-200 cursor-pointer text-sm flex items-center space-x-2 transform hover:scale-105 ${
              selectedSection === "compliancetodotracker"
                ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md scale-105"
                : "text-gray-600 hover:bg-teal-50 hover:text-teal-700"
            }`}
          >
            <FaCog
              size={12}
              className={`transition-transform duration-200 ${
                selectedSection === "compliancetodotracker"
                  ? "scale-110"
                  : "scale-100"
              }`}
            />
            <span>TO-DO</span>
          </button>
        </div>
      )}
    </div>
  );
}

function FloatingNotificationButton({
  showNotifications,
  setShowNotifications,
}) {
  return (
    <button
      onClick={() => setShowNotifications(!showNotifications)}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-teal-500 via-cyan-600 to-indigo-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center cursor-pointer"
      title="Chatbot"
    >
      <FaCommentDots size={20} />
    </button>
  );
}

function ComplianceStatusChart() {
  // Use dynamic data from context
  const {
    frameworks: contextFrameworks,
    organizationData,
    projects: contextProjects,
  } = useCompliance();

  // Memoize framework data calculation for performance - use framework-specific compliance data
  const frameworkData = useMemo(() => {
    // Use framework-specific compliance breakdown if available
    if (
      organizationData.frameworkComplianceBreakdown &&
      organizationData.frameworkComplianceBreakdown.length > 0
    ) {
      return organizationData.frameworkComplianceBreakdown.map(
        (frameworkData) => ({
          name: frameworkData.frameworkName,
          compliant: frameworkData.compliancePercentage,
          nonCompliant: 100 - frameworkData.compliancePercentage,
          totalControls: frameworkData.totalControls,
          implemented: frameworkData.implemented,
          inProgress: frameworkData.inProgress,
          notStarted: frameworkData.notStarted,
        })
      );
    }

    // Fallback to old logic if framework-specific data is not available
    const usedFrameworkIds = [
      ...new Set(
        contextProjects.map((project) => project.framework).filter(Boolean)
      ),
    ];

    const usedFrameworks = contextFrameworks.filter((framework) =>
      usedFrameworkIds.includes(framework.id)
    );

    return usedFrameworks.map((framework) => {
      const totalControls =
        organizationData.controlStatusBreakdown?.implemented +
          organizationData.controlStatusBreakdown?.inProgress +
          organizationData.controlStatusBreakdown?.notStarted || 1;
      const implementedControls =
        organizationData.controlStatusBreakdown?.implemented || 0;
      const compliancePercentage = Math.round(
        (implementedControls / totalControls) * 100
      );

      return {
        name: framework.name,
        compliant: compliancePercentage,
        nonCompliant: 100 - compliancePercentage,
      };
    });
  }, [
    contextFrameworks,
    contextProjects,
    organizationData.controlStatusBreakdown,
    organizationData.frameworkComplianceBreakdown,
  ]);

  const complianceData = useMemo(
    () => ({
      labels: frameworkData.map((f) => f.name),
      datasets: [
        {
          label: "Compliant",
          data: frameworkData.map((f) => f.compliant),
          backgroundColor: "#10b981",
          borderWidth: 0,
          borderRadius: 4,
        },
        {
          label: "Non-Compliant",
          data: frameworkData.map((f) => f.nonCompliant),
          backgroundColor: "#ef4444",
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    }),
    [frameworkData]
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: "#374151",
          padding: 20,
          usePointStyle: true,
          font: { size: 12 },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
        stacked: true,
        grid: { display: false },
        ticks: {
          color: "#6b7280",
          font: { size: 11 },
        },
      },
      y: {
        display: true,
        stacked: true,
        beginAtZero: true,
        max: 100,
        grid: { color: "#e5e7eb" },
        ticks: {
          color: "#6b7280",
          stepSize: 25,
          min: 0,
          max: 100,
          callback: function (value) {
            if ([0, 25, 50, 75, 100].includes(value)) {
              return value + "%";
            }
            return "";
          },
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 4,
      },
    },
  };
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm w-full h-[460px] flex flex-col">
      <div className="flex items-center mb-4 flex-shrink-0">
        <FaShieldAlt className="text-gray-700 w-6 h-6 mr-2" />
        <h3 className="text-md font-bold text-black">
          Compliance Status by Framework
        </h3>
      </div>

      {frameworkData.length > 0 ? (
        <>
          <div className="flex-1 w-full min-h-0">
            <div className="h-full w-full">
              <Bar
                data={complianceData}
                options={chartOptions}
                width={null}
                height={null}
                redraw={true}
              />
            </div>
          </div>
          
        </>
      ) : (
        <div className="flex-1 w-full flex flex-col items-center justify-center text-gray-500 min-h-0">
          <FaShieldAlt className="w-16 h-16 mb-4 text-gray-300" />
          <h4 className="text-lg font-medium mb-2">No Frameworks in Use</h4>
          <p className="text-sm text-center max-w-sm">
            No compliance frameworks are currently assigned to any projects.
            Create a project and assign a framework to see compliance status
            here.
          </p>
          <div className="mt-4">
            <button className="px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold hover:bg-teal-200 focus:outline-none transition-colors cursor-pointer">
              Create Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrivacyRiskByBusinessUnitChart() {
  console.log(
    "🔍 Dashboard - PrivacyRiskByBusinessUnitChart component rendered"
  );
  const { privacyContextData, loading, error } = usePrivacyDetection();
  console.log("🔍 Dashboard - Context data:", {
    privacyContextData,
    loading,
    error,
  });
  const [selectedMetric, setSelectedMetric] = useState("risk_level");

  // Risk level colors matching the original design
  const riskLevelColors = {
    "Low Risk": "#10B981", // Green
    "Medium Risk": "#F59E0B", // Yellow
    "High Risk": "#EF4444", // Red
    "Critical Risk": "#7C2D12", // Dark Red/Maroon
  };

  // Data category colors
  const dataCategoryColors = {
    "User Identifiers": "#3B82F6", // Blue
    "Device Data": "#8B5CF6", // Purple
    Authentication: "#F59E0B", // Orange
    Financial: "#EF4444", // Red
    Health: "#10B981", // Green
  };

  // Assessment type colors
  const assessmentTypeColors = {
    PIA: "#3B82F6", // Blue
    DPIA: "#8B5CF6", // Purple
    RoPA: "#10B981", // Green
  };

  // Get data based on selected metric
  const getChartData = useMemo(() => {
    if (!privacyContextData) return { labels: [], datasets: [] };

    let data = [];
    let colors = {};

    if (selectedMetric === "risk_level") {
      data = privacyContextData.risk_level_data || [];
      colors = riskLevelColors;
    } else if (selectedMetric === "data_category") {
      data = privacyContextData.data_category_data || [];
      colors = dataCategoryColors;
    } else if (selectedMetric === "assessment_type") {
      data = privacyContextData.assessment_type_data || [];
      colors = assessmentTypeColors;
    }

    if (data.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Extract labels (business units)
    const labels = data.map((item) => item.businessUnit);

    // Extract datasets (categories)
    const categories = Object.keys(data[0]).filter(
      (key) => key !== "businessUnit"
    );

    const datasets = categories.map((category) => ({
      label: category,
      data: data.map((item) => item[category] || 0),
      backgroundColor: colors[category] || "#6B7280",
      borderRadius: 4,
    }));

    return { labels, datasets };
  }, [privacyContextData, selectedMetric]);

  // Get title based on selected metric
  const getTitle = () => {
    if (selectedMetric === "risk_level") {
      return "Privacy Risk Level by Business Unit";
    } else if (selectedMetric === "data_category") {
      return "Data Categories by Business Unit";
    } else if (selectedMetric === "assessment_type") {
      return "Assessment Types by Business Unit";
    }
    return "Privacy Detection Context";
  };

  const chartData = getChartData;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "rectRounded",
          padding: 16,
          color: "#374151",
          font: { size: 12 },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: { color: "#6b7280", font: { size: 11 } },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        max: 60,
        grid: { color: "#e5e7eb", borderDash: [4, 4] },
        ticks: {
          color: "#6b7280",
          callback: (value) => value,
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 4,
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading privacy data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm w-full">
        <div className="flex items-center justify-center h-64 text-red-600">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm w-full h-[460px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <FaShieldAlt className="text-gray-700 w-6 h-6 mr-2" />
          <h3 className="text-md font-bold text-black">{getTitle()}</h3>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">View by:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="risk_level">Risk Level</option>
            <option value="data_category">Data Category</option>
            <option value="assessment_type">Assessment Type</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-0">
        <div className="h-full w-full">
          {chartData.labels.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-2">
                  No Privacy Assessment Data
                </div>
                <div className="text-gray-400 text-sm">
                  Run privacy scans to generate PIA, DPIA, or RoPA reports to see
                  data here.
                </div>
              </div>
            </div>
          ) : (
            <Bar
              data={chartData}
              options={options}
              width={null}
              height={null}
              redraw={true}
            />
          )}
        </div>
      </div>

        {/* Data Summary */}
        {privacyContextData?.summary && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg flex-shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center">
                <span className="text-gray-700">
                  Total Assessments:{" "}
                  {privacyContextData.summary.total_assessments}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-700">
                  Projects: {privacyContextData.summary.projects_count || 0}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-700">
                  Business Units: {privacyContextData.summary.business_units}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-700">
                  Data Source:{" "}
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      privacyContextData.summary.data_source === "real"
                        ? "bg-green-100 text-green-800"
                        : privacyContextData.summary.data_source === "no_data"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {privacyContextData.summary.data_source === "real"
                      ? "Real Data"
                      : privacyContextData.summary.data_source === "no_data"
                      ? "No Data"
                      : "Sample Data"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      
      
    </div>
  );
}

function CompliantVsNonCompliantChart() {
  const [hoveredItem, setHoveredItem] = useState(null);
  const { organizationData } = useCompliance();

  // Memoize control data calculation for performance
  const controlData = useMemo(() => {
    const implementedControls =
      organizationData.controlStatusBreakdown?.implemented || 0;
    const nonImplementedControls =
      (organizationData.controlStatusBreakdown?.inProgress || 0) +
      (organizationData.controlStatusBreakdown?.notStarted || 0);

    return {
      implementedControls,
      nonImplementedControls,
      total: implementedControls + nonImplementedControls,
    };
  }, [organizationData.controlStatusBreakdown]);

  const data = useMemo(
    () => ({
      labels: ["Compliant", "Non-Compliant"],
      datasets: [
        {
          data: [
            controlData.implementedControls,
            controlData.nonImplementedControls,
          ],
          backgroundColor: ["#10b981", "#ef4444"],
          borderWidth: 0,
          cutout: "60%",
          hoverBackgroundColor: ["#059669", "#dc2626"],
          hoverBorderWidth: 0,
        },
      ],
    }),
    [controlData]
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#374151",
        borderWidth: 1,
        displayColors: true,
        cornerRadius: 8,
        padding: 12,
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        callbacks: {
          label: function (context) {
            const total = 420;
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "point",
    },
  };

  const percentages = useMemo(() => {
    const compliantPercentage =
      controlData.total > 0
        ? ((controlData.implementedControls / controlData.total) * 100).toFixed(
            1
          )
        : "0.0";
    const nonCompliantPercentage =
      controlData.total > 0
        ? (
            (controlData.nonImplementedControls / controlData.total) *
            100
          ).toFixed(1)
        : "0.0";

    return { compliantPercentage, nonCompliantPercentage };
  }, [controlData]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center mb-4 flex-shrink-0">
          <FaCheckCircle className="text-gray-700 w-4 h-4 mr-2" />
          <h3 className="text-base font-semibold text-gray-800 truncate">
            Compliance vs Non-Compliant Controls
          </h3>
        </div>

        {/* Chart Container */}
        <div className="flex-1 flex flex-col min-h-0 pb-12">
          {/* Chart */}
          <div className="relative h-36 mb-4 flex-shrink-0">
            <Doughnut data={data} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-800">
                {controlData.total}
              </span>
              <span className="text-xs text-gray-500">Total Controls</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 flex justify-center items-center">
            <div className="flex justify-center space-x-6">
              <div
                className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                  hoveredItem === "compliant" ? "bg-green-50 scale-105" : ""
                }`}
                onMouseEnter={() => setHoveredItem("compliant")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="flex items-center mb-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-600">Compliant</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  {controlData.implementedControls}
                </span>
                <span className="text-xs text-gray-500">
                  {percentages.compliantPercentage}% of total
                </span>
              </div>

              <div
                className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                  hoveredItem === "non-compliant" ? "bg-red-50 scale-105" : ""
                }`}
                onMouseEnter={() => setHoveredItem("non-compliant")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="flex items-center mb-1">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-600">Non-Compliant</span>
                </div>
                <span className="text-xl font-bold text-red-600">
                  {controlData.nonImplementedControls}
                </span>
                <span className="text-xs text-gray-500">
                  {percentages.nonCompliantPercentage}% of total
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}

function EvidenceCollectionStatusChart() {
  const [evidenceData, setEvidenceData] = useState({
    evidence_data: [],
    summary: { total_evidence: 0, categories_count: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch evidence collection statistics
  useEffect(() => {
    const fetchEvidenceStats = async () => {
      try {
        setLoading(true);
        const authTokens = localStorage.getItem("authTokens");
        const token = authTokens ? JSON.parse(authTokens).access : null;

        if (!token) {
          throw new Error("No authentication token found");
        }

        console.log("🔍 Fetching evidence collection stats...");

        const response = await fetch(
          "/api/auditing/evidence-collection-stats/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("🔍 Evidence collection stats fetched:", data);

        setEvidenceData(data);
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching evidence collection stats:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvidenceStats();
  }, []);

  // Move all hooks to the top - before any conditional returns
  const data = useMemo(
    () => ({
      labels: evidenceData.evidence_data.map((item) => item.label),
      datasets: [
        {
          label: "Evidence Count",
          data: evidenceData.evidence_data.map((item) => item.count),
          backgroundColor: evidenceData.evidence_data.map((item) => item.color),
          hoverBackgroundColor: evidenceData.evidence_data.map(
            (item) => item.color
          ),
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    }),
    [evidenceData]
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#374151",
        borderWidth: 1,
        displayColors: true,
        cornerRadius: 8,
        padding: 8,
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 11 },
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#6b7280",
          font: { size: 10 },
          maxRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f3f4f6", lineWidth: 1 },
        ticks: { color: "#6b7280", stepSize: 10, font: { size: 10 } },
        border: { display: false },
      },
    },
  };

  const evidenceItems = evidenceData.evidence_data;

  // Handle loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden">
        <div className="p-5 h-full flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <span className="text-gray-600">
            Loading evidence collection data...
          </span>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden">
        <div className="p-5 h-full flex flex-col items-center justify-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <span className="text-red-600 text-center">{error}</span>
        </div>
      </div>
    );
  }

  // Handle no data case
  if (evidenceData.evidence_data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden">
        <div className="p-5 h-full flex flex-col items-center justify-center">
          <FaFolderOpen className="w-16 h-16 mb-4 text-gray-300" />
          <h4 className="text-lg font-medium mb-2 text-gray-500">
            No Evidence Collected
          </h4>
          <p className="text-sm text-center max-w-sm text-gray-400">
            Upload evidence files to see collection statistics here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center mb-4 flex-shrink-0">
          <FaFolderOpen className="text-gray-700 w-4 h-4 mr-2" />
          <h3 className="text-base font-semibold text-gray-800">
            Evidence Collection Status
          </h3>
        </div>

        <div className="flex-1 flex flex-col min-h-0 pb-12">
          {/* Chart */}
          <div className="h-32 mb-4 flex-shrink-0">
            <Bar data={data} options={options} />
          </div>

          {/* Evidence breakdown */}
          <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0">
            {evidenceItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1"
              >
                <div className="flex items-center">
                  <div
                    className="w-2.5 h-2.5 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
                <div className="text-right">
                  <span
                    className="text-sm font-bold"
                    style={{ color: item.color }}
                  >
                    {item.count}
                  </span>
                  <div className="text-xs text-gray-500">collected</div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Evidence */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaFolderOpen className="text-blue-600 w-3 h-3 mr-2" />
                <span className="text-xs font-semibold text-blue-800">
                  Total Evidence Collected
                </span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {evidenceData.summary.total_evidence}
              </span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Across all evidence types
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}

function DataProtectionAssessmentChart() {
  const { privacyContextData, loading, error } = usePrivacyDetection();

  // Calculate real assessment data from privacy module
  const getAssessmentData = () => {
    if (!privacyContextData || !privacyContextData.summary) {
      return [];
    }

    const { summary } = privacyContextData;
    const totalAssessments = summary.total_assessments || 0;
    const totalRisks = summary.total_risks || 0;
    const projectsCount = summary.projects_count || 0;

    if (totalAssessments === 0) {
      return [];
    }

    // Calculate percentages based on real privacy assessment data
    const assessmentData = [];

    // PIA Assessments (from assessment_type_data)
    const piaCount =
      privacyContextData.assessment_type_data?.reduce(
        (sum, item) => sum + (item.PIA || 0),
        0
      ) || 0;
    if (piaCount > 0) {
      assessmentData.push({
        label: "PIA Assessments",
        score: Math.round((piaCount / totalAssessments) * 100),
        count: piaCount,
      });
    }

    // DPIA Assessments
    const dpiaCount =
      privacyContextData.assessment_type_data?.reduce(
        (sum, item) => sum + (item.DPIA || 0),
        0
      ) || 0;
    if (dpiaCount > 0) {
      assessmentData.push({
        label: "DPIA Assessments",
        score: Math.round((dpiaCount / totalAssessments) * 100),
        count: dpiaCount,
      });
    }

    // RoPA Assessments
    const ropaCount =
      privacyContextData.assessment_type_data?.reduce(
        (sum, item) => sum + (item.RoPA || 0),
        0
      ) || 0;
    if (ropaCount > 0) {
      assessmentData.push({
        label: "RoPA Assessments",
        score: Math.round((ropaCount / totalAssessments) * 100),
        count: ropaCount,
      });
    }

    // Low Risk Items
    const lowRiskCount =
      privacyContextData.risk_level_data?.reduce(
        (sum, item) => sum + (item["Low Risk"] || 0),
        0
      ) || 0;
    if (lowRiskCount > 0) {
      assessmentData.push({
        label: "Low Risk Items",
        score: Math.round((lowRiskCount / totalRisks) * 100),
        count: lowRiskCount,
      });
    }

    // High Risk Items (Medium + High + Critical)
    const highRiskCount =
      privacyContextData.risk_level_data?.reduce(
        (sum, item) =>
          sum +
          (item["Medium Risk"] || 0) +
          (item["High Risk"] || 0) +
          (item["Critical Risk"] || 0),
        0
      ) || 0;
    if (highRiskCount > 0) {
      assessmentData.push({
        label: "High Risk Items",
        score: Math.round((highRiskCount / totalRisks) * 100),
        count: highRiskCount,
      });
    }

    // Data Categories (User Identifiers)
    const userDataCount =
      privacyContextData.data_category_data?.reduce(
        (sum, item) => sum + (item["User Identifiers"] || 0),
        0
      ) || 0;
    if (userDataCount > 0) {
      assessmentData.push({
        label: "User Data Processing",
        score: Math.round((userDataCount / totalAssessments) * 100),
        count: userDataCount,
      });
    }

    return assessmentData;
  };

  const assessmentData = getAssessmentData();

  // Dynamic colors based on assessment data
  const baseColors = [
    "#8b5cf6", // Purple - PIA
    "#10b981", // Green - DPIA
    "#3b82f6", // Blue - RoPA
    "#f59e0b", // Orange - Low Risk
    "#ef4444", // Red - High Risk
    "#06b6d4", // Cyan - User Data
    "#7c3aed", // Violet - Additional
    "#059669", // Emerald - Additional
  ];

  const colors = assessmentData.map(
    (_, index) => baseColors[index % baseColors.length]
  );
  const hoverColors = colors.map((color) => {
    // Darken the color for hover effect
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(
      0,
      b - 20
    )})`;
  });

  // Handle loading and error states
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden">
        <div className="p-5 h-full flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <span className="text-gray-600">
            Loading privacy assessment data...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden">
        <div className="p-5 h-full flex flex-col items-center justify-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <span className="text-red-600 text-center">{error}</span>
        </div>
      </div>
    );
  }

  // Handle no data case
  if (assessmentData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden">
        <div className="p-5 h-full flex flex-col items-center justify-center">
          <FaShieldAlt className="w-16 h-16 mb-4 text-gray-300" />
          <h4 className="text-lg font-medium mb-2 text-gray-500">
            No Privacy Assessment Data
          </h4>
          <p className="text-sm text-center max-w-sm text-gray-400">
            Run privacy scans to generate PIA, DPIA, or RoPA reports to see
            assessment data here.
          </p>
        </div>
      </div>
    );
  }

  const totalScore = assessmentData.reduce((sum, item) => sum + item.score, 0);
  const percentages = assessmentData.map((item) =>
    ((item.score / totalScore) * 100).toFixed(1)
  );

  const data = {
    labels: assessmentData.map((item) => item.label),
    datasets: [
      {
        data: assessmentData.map((item) => item.score),
        backgroundColor: colors,
        hoverBackgroundColor: hoverColors,
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverBorderWidth: 3,
        hoverBorderColor: "#ffffff",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#374151",
        borderWidth: 1,
        displayColors: true,
        cornerRadius: 8,
        padding: 8,
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 11 },
        callbacks: {
          label: (context) => {
            const item = assessmentData[context.dataIndex];
            const percentage = percentages[context.dataIndex];
            return `${context.label}: ${item.count} items (${percentage}%)`;
          },
        },
      },
    },
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-[460px] relative overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center mb-3 flex-shrink-0">
          <FaShieldAlt className="text-gray-700 w-4 h-4 mr-2" />
          <h3 className="text-base font-semibold text-gray-800">
            Privacy Assessment Overview
          </h3>
        </div>

        {/* Content area with space for fixed button */}
        <div className="flex-1 flex flex-col min-h-0 pb-12">
          {/* Chart */}
          <div className="h-32 mb-3 flex-shrink-0">
            <Pie data={data} options={options} />
          </div>

          {/* Assessment breakdown */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-1">
              {assessmentData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: colors[index] }}
                    ></div>
                    <span className="text-xs text-gray-600 truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span
                      className="text-sm font-bold"
                      style={{ color: colors[index] }}
                    >
                      {item.score}%
                    </span>
                    <div className="text-xs text-gray-500">
                      {item.count} items
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}

function FrameworkProgressChart() {
  const { organizationData, risks, projects, frameworks } = useCompliance();
  const [selectedTimeRange, setSelectedTimeRange] = useState("12");

  // Generate monthly labels based on selected time range
  const getMonthlyLabels = (months) => {
    const labels = [];
    const currentDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      labels.push(date.toLocaleDateString("en-US", { month: "short" }));
    }

    return labels;
  };

  // Generate trend data based on real compliance data
  const generateTrendData = useMemo(() => {
    const months = parseInt(selectedTimeRange);
    const labels = getMonthlyLabels(months);

    // Get current risk breakdown
    const riskBreakdown = organizationData.riskStatusBreakdown || {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    // Get current control status
    const controlBreakdown = organizationData.controlStatusBreakdown || {
      implemented: 0,
      inProgress: 0,
      notStarted: 0,
    };

    // Generate realistic trend data based on current values
    const generateTrend = (baseValue, variation = 0.2) => {
      return labels.map((_, index) => {
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const trendFactor = 1 + Math.sin(index * 0.5) * 0.1; // Slight wave pattern
        return Math.max(0, Math.round(baseValue * randomFactor * trendFactor));
      });
    };

    // Calculate base values from current data
    const criticalRisks = riskBreakdown.critical || 0;
    const highRisks = riskBreakdown.high || 0;
    const mediumRisks = riskBreakdown.medium || 0;
    const lowRisks = riskBreakdown.low || 0;
    const newFrameworks = frameworks.length || 0;

    return {
      labels,
      datasets: [
        {
          label: "Critical Risk Issues",
          data: generateTrend(criticalRisks),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          label: "New Framework",
          data: generateTrend(newFrameworks, 0.1),
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          label: "High Risk Issues",
          data: generateTrend(highRisks),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          label: "Low Risk Issues",
          data: generateTrend(lowRisks),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          label: "Medium Risk Issues",
          data: generateTrend(mediumRisks),
          borderColor: "#eab308",
          backgroundColor: "rgba(234, 179, 8, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ],
    };
  }, [organizationData, risks, frameworks, selectedTimeRange]);

  const data = generateTrendData;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      title: {
        display: false,
      },
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          color: "#6b7280",
          font: {
            size: 11,
            weight: "500",
          },
          padding: 15,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#1f2937",
        bodyColor: "#374151",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: "#9ca3af",
          font: {
            size: 11,
          },
          maxTicksLimit: 6,
        },
        border: {
          display: false,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: "#f3f4f6",
          drawBorder: false,
        },
        ticks: {
          color: "#9ca3af",
          font: {
            size: 11,
          },
          callback: function (value) {
            return value;
          },
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        hoverRadius: 6,
        hoverBorderWidth: 2,
        hoverBackgroundColor: "#ffffff",
      },
    },
  };

  return (
    <div className="w-full bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
            <FaChartLine className="text-purple-600 text-sm" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Framework Progress Trends
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="12">Last 12 months</option>
            <option value="6">Last 6 months</option>
            <option value="3">Last 3 months</option>
          </select>
        </div>
      </div>

      <div className="w-full h-80 mb-4">
        <Line
          data={data}
          options={options}
          width={null}
          height={null}
          redraw={true}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Data updated: {new Date().toLocaleDateString()} | Current Risks:{" "}
          {organizationData.totalRisks || 0} | Frameworks: {frameworks.length}
        </div>
      </div>
    </div>
  );
}

function AnimatedProgressCircle({
  percent,
  color,
  label,
  size = "w-48 h-48",
  strokeWidth = 8,
  animationDuration = "1.2s",
  delay = 0,
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (percent / 100) * circumference;
  const [dashoffset, setDashoffset] = useState(circumference);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDashoffset(targetOffset);
    }, 100 + delay); // Add delay for staggered animations

    return () => clearTimeout(timeout);
  }, [targetOffset, delay]);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${size}`}>
        <svg className={`${size} transform -rotate-90`} viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{
              transition: `stroke-dashoffset ${animationDuration} cubic-bezier(0.4,0,0.2,1)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>
            {percent}%
          </span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

// Member Management Modal Component
function MemberManagementModal({
  showMemberModal,
  setShowMemberModal,
  selectedProject,
  projectMembers,
  canManageProjectMembers,
  handleAddMember,
  handleRemoveMember,
}) {
  if (!showMemberModal || !selectedProject) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Manage Members - {selectedProject.name}
          </h3>
          <button
            onClick={() => setShowMemberModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              Organization Members
            </h4>
            <p className="text-sm text-gray-600">
              All members of your organization can view this project. You can
              grant additional permissions to specific members.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permission Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projectMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-teal-600">
                              {member.avatar}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.is_owner
                            ? "bg-purple-100 text-purple-800"
                            : member.permission_level === "admin"
                            ? "bg-red-100 text-red-800"
                            : member.permission_level === "edit"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {member.is_owner
                          ? "Owner"
                          : member.permission_level === "organization_member"
                          ? "Organization Member"
                          : member.permission_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!member.is_owner &&
                        canManageProjectMembers(selectedProject) && (
                          <div className="flex space-x-2">
                            {member.permission_level !== "admin" && (
                              <button
                                onClick={() =>
                                  handleAddMember(member.id, "admin")
                                }
                                className="text-red-600 hover:text-red-900"
                              >
                                Make Admin
                              </button>
                            )}
                            {member.permission_level !== "edit" && (
                              <button
                                onClick={() =>
                                  handleAddMember(member.id, "edit")
                                }
                                className="text-green-600 hover:text-green-900"
                              >
                                Grant Edit
                              </button>
                            )}
                            {member.is_explicit_member && (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this helper function before the NavItem component
function getUserInitials(fullName) {
  if (!fullName) return "U";

  const names = fullName.trim().split(" ");

  if (names.length === 1) {
    // Single name - take first two characters
    return names[0].substring(0, 2).toUpperCase();
  } else if (names.length >= 2) {
    // Multiple names - take first letter of first and last name
    return (
      names[0].charAt(0) + names[names.length - 1].charAt(0)
    ).toUpperCase();
  }

  return "U";
}
