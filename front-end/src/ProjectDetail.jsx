// src/components/Projects/ProjectDetail.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaUserFriends,
  FaFileAlt,
  FaUserShield,
  FaChartBar,
  FaFolderOpen,
  FaPlus,
  FaCheck,
  FaTimes,
  FaArrowRight,
  FaQuestionCircle,
  FaTag,
  FaBook,
  FaHeartbeat,
  FaShieldAlt,
  FaDatabase,
  FaEye,
  FaSpinner,
} from "react-icons/fa";
import ProjectDetailHeader from "./ProjectDetailHeader";
import Controls from "./Controls";
import Evidence from "./Evidence";
import CreateRiskModal from "./CreateRiskModal";
import Comments from "./Comments";
import Report from "./Report";
import { useAuth } from "./AuthContext";
import { ControlDataProvider } from "./ControlDataContext";
import { useProjectControl } from "./ProjectControlContext";
import { useCompliance } from "./useCompliance";
import ProjectJourney from "./ProjectJourney";

export default function ProjectDetail({ project }) {
  const { fetchWithAuth, user } = useAuth();
  const { projects: contextProjects, calculateAndUpdateProject } =
    useProjectControl();
  const { refreshAllData } = useCompliance();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("Summary");

  // State for pre-filled comment data
  const [prefilledCommentData, setPrefilledCommentData] = useState(null);
  const processedParamsRef = useRef(false);

  // State for all dynamic data
  const [controlsData, setControlsData] = useState([]);
  const [evidenceData, setEvidenceData] = useState([]);
  const [commentsData, setCommentsData] = useState([]);
  const [risksData, setRisksData] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [auditorsData, setAuditorsData] = useState([]);
  const [projectJourney, setProjectJourney] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs to store current data to avoid infinite loops
  const controlsDataRef = useRef([]);
  const evidenceDataRef = useRef([]);
  const risksDataRef = useRef([]);
  const teamMembersRef = useRef([]);
  const auditorsDataRef = useRef([]);

  // Ref to store the latest fetchWithAuth function to avoid infinite loops
  const fetchWithAuthRef = useRef(fetchWithAuth);

  // Update the ref whenever fetchWithAuth changes
  useEffect(() => {
    fetchWithAuthRef.current = fetchWithAuth;
  }, [fetchWithAuth]);

  // Get enhanced project data from context
  const enhancedProject =
    contextProjects.find((p) => p.id === project?.id) || project;

  const tabs = [
    "Summary",
    "Controls",
    "Evidence",
    "Comments",
    "Risk Register",
    "Report",
  ];

  // Handle URL parameters for pre-filled comment data
  useEffect(() => {
    const activeTabParam = searchParams.get("activeTab");
    const controlParam = searchParams.get("control");
    const parentControlParam = searchParams.get("parentControl");
    const controlIdParam = searchParams.get("controlId");
    const controlTitleParam = searchParams.get("controlTitle");

    // Only process if we have the required parameters and haven't processed them yet
    if (
      activeTabParam === "Comments" &&
      controlParam &&
      !processedParamsRef.current
    ) {
      processedParamsRef.current = true;

      setActiveTab("Comments");

      // Set pre-filled comment data
      const prefilledData = {
        control: controlParam,
        parentControl: parentControlParam,
        controlId: controlIdParam,
        controlTitle: controlTitleParam,
        // Create the hashtag format like "#C.4 #C.4.1"
        hashtags:
          parentControlParam && controlParam !== parentControlParam
            ? `#${parentControlParam} #${controlParam}`
            : `#${controlParam}`,
      };

      setPrefilledCommentData(prefilledData);

      // Clear the URL parameters after processing to prevent re-triggering
      // Use setTimeout to ensure the state updates are processed first
      setTimeout(() => {
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete("activeTab");
        newParams.delete("control");
        newParams.delete("parentControl");
        newParams.delete("controlId");
        newParams.delete("controlTitle");

        // Update the URL without triggering a page reload
        const newUrl = `${window.location.pathname}${
          newParams.toString() ? "?" + newParams.toString() : ""
        }`;
        window.history.replaceState({}, "", newUrl);
      }, 100);
    }

    // Reset the processed flag when there are no relevant parameters
    if (!activeTabParam && !controlParam) {
      processedParamsRef.current = false;
    }
  }, [searchParams]);

  // Clear prefilled data when user navigates away from Comments tab
  useEffect(() => {
    if (activeTab !== "Comments" && prefilledCommentData) {
      setPrefilledCommentData(null);
    }
  }, [activeTab, prefilledCommentData]);

  const fetchCommentsData = useCallback(async () => {
    // Get current controls data from ref to avoid infinite loops
    const currentControls = controlsDataRef.current;
    console.log(
      "🔍 DEBUG: fetchCommentsData called - project:",
      project?.id,
      "controls:",
      currentControls.length
    );
    console.log(
      "🔍 DEBUG: Control IDs being fetched:",
      currentControls.map((c) => c.id)
    );
    if (!currentControls.length || !project?.id) return;

    try {
      // Fetch project-specific comments from all controls
      const commentsPromises = currentControls.map((control) =>
        fetchWithAuthRef.current(
          `/api/auditing/projects/${project.id}/controls/${control.id}/comments/`
        )
      );

      console.log(
        "🔍 DEBUG: Making",
        commentsPromises.length,
        "comment API calls for project",
        project.id
      );
      console.log(
        "🔍 DEBUG: Comments exist for controls: 29, 241 (from Django logs)"
      );
      console.log(
        "🔍 DEBUG: Control 29 in list?",
        currentControls.some((c) => c.id === 29)
      );
      console.log(
        "🔍 DEBUG: Control 241 in list?",
        currentControls.some((c) => c.id === 241)
      );
      const commentsResponses = await Promise.all(commentsPromises);
      const allComments = [];

      for (let i = 0; i < commentsResponses.length; i++) {
        const response = commentsResponses[i];
        const control = currentControls[i];
        console.log(
          `🔍 DEBUG: Control ${control.id} (${control.title}) - Response status: ${response.status}`
        );
        if (response.ok) {
          const comments = await response.json();
          console.log(
            `🔍 DEBUG: Control ${control.id} returned ${comments.length} comments:`,
            comments
          );
          comments.forEach((comment) => {
            allComments.push({
              ...comment,
              controlId: currentControls[i].id,
              controlTitle: currentControls[i].title,
              controlClauseNumber: currentControls[i].clause_number,
              projectId: project.id,
              projectName: project.name,
            });
          });
        } else {
          console.log(
            `🔍 DEBUG: Control ${control.id} failed with status ${response.status}`
          );
        }
      }

      console.log(
        "🔍 DEBUG: Total comments collected:",
        allComments.length,
        allComments
      );
      console.log(
        "🔍 DEBUG: Comments by control:",
        allComments.reduce((acc, c) => {
          acc[c.controlId] = (acc[c.controlId] || 0) + 1;
          return acc;
        }, {})
      );
      setCommentsData(allComments);

      // Update controls with comment counts
      setControlsData((prevControls) => {
        const updatedControls = prevControls.map((control) => ({
          ...control,
          commentsCount: allComments.filter(
            (comment) => comment.controlId === control.id
          ).length,
        }));
        controlsDataRef.current = updatedControls;
        return updatedControls;
      });
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  }, [project?.id]);

  const calculateProjectJourney = useCallback(() => {
    // Get current data from refs to avoid infinite loops
    const currentControls = controlsDataRef.current;
    const currentEvidence = evidenceDataRef.current;
    const currentRisks = risksDataRef.current;
    const currentTeamMembers = teamMembersRef.current;
    const currentAuditors = auditorsDataRef.current;

    // Use enhanced project data if available
    const projectData = enhancedProject;

    // Calculate journey progress based on actual data
    const journey = [
      {
        step: 1,
        title: "Add Members",
        description: "Add users to your project for collaboration",
        completed: currentTeamMembers.length > 1, // More than just the owner
        completedCount: Math.max(
          0,
          currentTeamMembers.filter((member) => !member.is_owner).length
        ), // Count only non-owner members
        totalCount: 1, // Need at least 1 additional member
        percent: currentTeamMembers.length > 1 ? 100 : 0,
      },
      {
        step: 2,
        title: "Add Auditor",
        description: "Add Auditor to your project",
        completed: currentAuditors.length > 0,
        completedCount: currentAuditors.length,
        totalCount: 1,
        percent: currentAuditors.length > 0 ? 100 : 0,
      },
      {
        step: 3,
        title: "Add Comments",
        description: "Add comments and collaborate on controls",
        completed: false, // Will be calculated dynamically in component
        completedCount: 0,
        totalCount: 1,
        percent: 0,
      },
      {
        step: 4,
        title: "Implement Controls",
        description: "Review and assert controls",
        completed:
          (projectData.implementedControls || 0) >=
            (projectData.totalControls || currentControls.length) &&
          (projectData.totalControls || currentControls.length) > 0,
        completedCount: projectData.implementedControls || 0,
        totalCount: projectData.totalControls || currentControls.length,
        percent: projectData.progress || 0,
      },
      {
        step: 5,
        title: "Evidence Collection",
        description:
          "Achieve 100% evidence collection by adding evidence to your controls",
        completed:
          (projectData.totalEvidence || currentEvidence.length) > 0 &&
          (projectData.totalEvidence || currentEvidence.length) >=
            (projectData.totalControls || currentControls.length),
        completedCount: projectData.totalEvidence || currentEvidence.length,
        totalCount: projectData.totalControls || currentControls.length,
        percent:
          (projectData.totalControls || currentControls.length) > 0
            ? Math.round(
                ((projectData.totalEvidence || currentEvidence.length) /
                  (projectData.totalControls || currentControls.length)) *
                  100
              )
            : 0,
      },
      {
        step: 6,
        title: "Risk Register",
        description: "Add risks to the risk register",
        completed: currentRisks.length > 0,
        completedCount: currentRisks.length,
        totalCount: 1, // Need at least 1 risk
        percent: currentRisks.length > 0 ? 100 : 0,
      },
    ];

    setProjectJourney(journey);
  }, [project.auditor_enabled, auditorsData]);

  const fetchAllProjectData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        controlsRes,
        evidenceRes,
        risksRes,
        teamMembersRes,
        auditorsRes,
        commentsRes,
      ] = await Promise.all([
        fetchWithAuthRef.current(`/api/projects/${project.id}/controls/`),
        fetchWithAuthRef.current(`/api/projects/${project.id}/evidence/`),
        fetchWithAuthRef.current(`/api/auditing/risks/?project=${project.id}`),
        fetchWithAuthRef.current(`/api/projects/${project.id}/team_members/`),
        fetchWithAuthRef.current(`/api/projects/${project.id}/auditors/`),
        fetchWithAuthRef.current(`/api/projects/${project.id}/comments/`),
      ]);

      // Process controls data with enhanced information
      if (controlsRes.ok) {
        const controls = await controlsRes.json();
        // Enhance controls data with additional calculated fields
        const enhancedControls = controls.map((control) => ({
          ...control,
          subcontrolsCompleted:
            control.sub_clauses?.filter(
              (sub) =>
                sub.status === "Completed" ||
                sub.status === "Implemented" ||
                sub.implementationStatus === "Implemented"
            ).length || 0,
          subcontrols: control.sub_clauses?.length || 0,
          progress:
            control.sub_clauses?.length > 0
              ? Math.round(
                  (control.sub_clauses.filter(
                    (sub) =>
                      sub.status === "Completed" ||
                      sub.status === "Implemented" ||
                      sub.implementationStatus === "Implemented"
                  ).length /
                    control.sub_clauses.length) *
                    100
                )
              : 0,
          auditorEnabled: project.auditor_enabled || false,
          evidenceCount: 0, // Will be calculated from evidence data
          commentsCount: 0, // Will be calculated from comments data
          reviewsCount: 0, // Will be calculated from reviews data
        }));
        setControlsData(enhancedControls);
        controlsDataRef.current = enhancedControls;
      }

      // Process evidence data
      if (evidenceRes.ok) {
        const evidence = await evidenceRes.json();
        setEvidenceData(evidence);
        evidenceDataRef.current = evidence;

        // Update controls with evidence counts
        setControlsData((prevControls) =>
          prevControls.map((control) => ({
            ...control,
            evidenceCount: evidence.filter((e) =>
              e.clauses.includes(control.id)
            ).length,
          }))
        );
      }

      // Process risks data
      if (risksRes.ok) {
        const risks = await risksRes.json();
        setRisksData(risks);
        risksDataRef.current = risks;
      }

      // Process team members data
      if (teamMembersRes.ok) {
        const members = await teamMembersRes.json();
        setTeamMembers(members);
        teamMembersRef.current = members;
      }

      // Process auditors data
      if (auditorsRes.ok) {
        const auditors = await auditorsRes.json();
        setAuditorsData(auditors);
        auditorsDataRef.current = auditors;
      }

      // Process comments data
      if (commentsRes.ok) {
        const comments = await commentsRes.json();
        setCommentsData(comments);
      }

      // Fetch comments data to update controls with comment counts
      if (controlsDataRef.current.length > 0) {
        await fetchCommentsData();
      }

      // Calculate project journey after all data is fetched
      calculateProjectJourney();
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch project data:", err);
    } finally {
      setLoading(false);
    }
  }, [project?.id, project?.auditor_enabled, auditorsData]);

  // Fetch all project data
  useEffect(() => {
    if (project?.id) {
      const fetchData = async () => {
        await fetchAllProjectData();
        // Also calculate enhanced project data
        await calculateAndUpdateProject(project.id, fetchWithAuth);
      };
      fetchData();
    }
  }, [project?.id]);

  // Refresh data when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Optionally refresh data for specific tabs
    if (tab === "Comments") {
      fetchCommentsData();
    }
  };

  const handleAddComment = async () => {
    try {
      // Refresh all data after comment creation
      await fetchAllProjectData();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleToggleLike = () => {
    // This would be handled by the Comments component
    // The parent just needs to refresh data after like toggle
    fetchCommentsData();
  };

  // Handler for creating risks in tab mode
  const handleCreateRisk = async (formDataFromModal) => {
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
      Mitigated: "mitigated",
    };

    const apiPayload = {
      project: project.id, // Always use the current project
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

      // Refresh all project data
      await fetchAllProjectData();

      // Also refresh the global compliance context to update RiskManagement section
      await refreshAllData();
    } catch (err) {
      console.error("Create risk error:", err);
      alert(`Failed to create risk: ${err.message}`);
      throw err;
    }
  };

  // Show loading state
  if (loading && !controlsData.length) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            Loading Project Data...
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            Fetching controls, evidence, risks, and team information
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTimes className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Project Data
          </h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchAllProjectData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Helper functions and components for Risk Register
  const getLikelihoodText = (likelihood) => {
    const likelihoodMap = {
      1: "Very Unlikely",
      2: "Unlikely",
      3: "Possible",
      4: "Likely",
      5: "Very Likely",
    };
    return likelihoodMap[likelihood] || likelihood;
  };

  const CategoryBadge = ({ category }) => {
    const getColor = (cat) => {
      switch (cat?.toLowerCase()) {
        case "operational":
          return "bg-blue-100 text-blue-800";
        case "financial":
          return "bg-green-100 text-green-800";
        case "strategic":
          return "bg-purple-100 text-purple-800";
        case "compliance":
          return "bg-orange-100 text-orange-800";
        case "technical":
          return "bg-indigo-100 text-indigo-800";
        case "reputational":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColor(
          category
        )}`}
      >
        {category || "Unknown"}
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const getColor = (stat) => {
      switch (stat?.toLowerCase()) {
        case "open":
          return "bg-red-100 text-red-800";
        case "in_progress":
          return "bg-yellow-100 text-yellow-800";
        case "mitigated":
          return "bg-green-100 text-green-800";
        case "closed":
          return "bg-gray-100 text-gray-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    const getDisplayText = (stat) => {
      switch (stat?.toLowerCase()) {
        case "in_progress":
          return "In Progress";
        case "mitigated":
          return "Mitigated";
        case "open":
          return "Open";
        case "closed":
          return "Closed";
        default:
          return stat || "Unknown";
      }
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColor(
          status
        )}`}
      >
        {getDisplayText(status)}
      </span>
    );
  };

  const RatingBadge = ({ rating }) => {
    const getColor = (rat) => {
      switch (rat?.toLowerCase()) {
        case "low":
          return "bg-green-100 text-green-800";
        case "medium":
          return "bg-yellow-100 text-yellow-800";
        case "high":
          return "bg-orange-100 text-orange-800";
        case "critical":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColor(
          rating
        )}`}
      >
        {rating || "Unknown"}
      </span>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <ProjectDetailHeader
        project={enhancedProject}
        evidenceData={evidenceData}
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        fetchWithAuth={fetchWithAuth}
      />

      <div className="px-8 py-6 space-y-6">
        {activeTab === "Summary" && (
          <>
            {/* Dynamic Overview cards */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Project Overview
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <OverviewCard
                  icon={<FaTag className="text-blue-600 text-xl" />}
                  bg="bg-blue-50"
                  border="border-blue-200"
                  label="PROJECT NAME"
                  value={project.name || "N/A"}
                  color="text-blue-600"
                />
                <OverviewCard
                  icon={<FaBook className="text-purple-600 text-xl" />}
                  bg="bg-purple-50"
                  border="border-purple-200"
                  label="FRAMEWORK"
                  value={project.framework_name || "N/A"}
                  color="text-purple-600"
                />
                <OverviewCard
                  icon={<FaHeartbeat className="text-red-600 text-xl" />}
                  bg="bg-red-50"
                  border="border-red-200"
                  label="STATUS"
                  value={project.status || "N/A"}
                  color="text-red-600"
                />
                <OverviewCard
                  icon={<FaShieldAlt className="text-green-600 text-xl" />}
                  bg="bg-green-50"
                  border="border-green-200"
                  label="TOTAL CONTROLS"
                  value={enhancedProject.totalControls || controlsData.length}
                  color="text-green-600"
                />
                <OverviewCard
                  icon={<FaDatabase className="text-orange-600 text-xl" />}
                  bg="bg-orange-50"
                  border="border-orange-200"
                  label="EVIDENCE"
                  value={enhancedProject.totalEvidence || evidenceData.length}
                  color="text-orange-600"
                />
                <OverviewCard
                  icon={<FaEye className="text-gray-700 text-xl" />}
                  bg="bg-gray-50"
                  border="border-gray-200"
                  label="AUDITOR"
                  value={project.auditor_enabled ? "Enabled" : "Disabled"}
                  color="text-gray-600"
                />
              </div>
            </div>

            {/* Dynamic Project Journey */}
            <ProjectJourney
              projectJourney={projectJourney}
              commentsData={commentsData}
            />
          </>
        )}

        {activeTab === "Controls" && (
          <ControlDataProvider>
            <Controls
              controls={controlsData}
              project={project}
              onDataUpdate={fetchAllProjectData}
            />
          </ControlDataProvider>
        )}

        {activeTab === "Evidence" && (
          <Evidence
            project={project}
            evidenceData={evidenceData}
            controlsData={controlsData}
            onDataUpdate={fetchAllProjectData}
          />
        )}

        {activeTab === "Comments" && (
          <div className="space-y-6">
            {console.log(
              "🔍 DEBUG: Comments tab - controlsData:",
              controlsData.length,
              "prefilledCommentData:",
              prefilledCommentData
            )}
            <Comments
              project={project}
              availableControls={controlsData}
              comments={commentsData}
              loading={loading}
              error={error}
              onLoadComments={fetchCommentsData}
              onToggleLike={handleToggleLike}
              teamMembers={teamMembers}
              control={
                prefilledCommentData?.controlId
                  ? {
                      id: parseInt(prefilledCommentData.controlId),
                      clause_number: prefilledCommentData.control,
                      title: prefilledCommentData.controlTitle,
                    }
                  : controlsData.length > 0
                  ? {
                      id: controlsData[0].id,
                      clause_number: controlsData[0].clause_number,
                      title: controlsData[0].title,
                    }
                  : null
              }
              prefilledData={prefilledCommentData}
            />
          </div>
        )}

        {activeTab === "Risk Register" && (
          <div className="space-y-6">
            {/* Enhanced Risk Register Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                        <FaChartBar className="w-6 h-6 text-gray-800" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        Risk Register
                      </h2>
                    </div>
                    <p className="text-gray-800 text-sm">
                      Create and manage risks for Project:{" "}
                      <span className="font-semibold text-xl">
                        {project.name}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
                      <div className="text-gray-800 text-xs font-medium uppercase tracking-wide">
                        Total Risks
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        {risksData.length}
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
                      <div className="text-gray-800 text-xs font-medium uppercase tracking-wide">
                        High Risk
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        {
                          risksData.filter(
                            (risk) =>
                              risk.risk_rating === "High" ||
                              risk.risk_rating === "Critical"
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Create New Risk
                  </h3>
                  <p className="text-sm text-gray-600">
                    Fill in the details below to add a new risk to your
                    register.
                  </p>
                </div>
                <CreateRiskModal
                  isOpen={true}
                  onClose={() => {}} // No close functionality needed
                  onCreate={handleCreateRisk}
                  user={user}
                  projects={[]} // Empty array since we're in project context
                  currentProject={project}
                  asComponent={true} // Flag to render as component instead of modal
                />
              </div>
            </div>

            {/* Risk Table */}
            {risksData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Existing Risks ({risksData.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Likelihood
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Impact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rating
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {risksData.map((risk, index) => (
                        <tr
                          key={risk.id || index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {risk.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {risk.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <CategoryBadge category={risk.risk_category} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getLikelihoodText(risk.likelihood)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {risk.impact}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={risk.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <RatingBadge rating={risk.risk_rating} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "Report" && (
          <Report
            project={project}
            controlsData={controlsData}
            evidenceData={evidenceData}
            risksData={risksData}
            teamMembers={teamMembers}
          />
        )}
      </div>
    </div>
  );
}

function OverviewCard({ icon, label, value, bg, border, color }) {
  return (
    <div
      className={`flex items-center rounded-xl ${bg} ${border} border px-6 py-4 shadow-sm overflow-hidden`}
    >
      <div className="mr-4 p-2 rounded-lg bg-white shadow-sm flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        {" "}
        {/* Add min-w-0 to allow the child to truncate */}
        <div
          className={`text-xs font-semibold uppercase ${color} mb-1 tracking-wide`}
        >
          {label}
        </div>
        {/* --- FIX IS HERE: Added 'truncate' class and a span with a 'title' attribute --- */}
        <div className="text-lg font-bold text-gray-900 truncate">
          <span title={value}>{value}</span>
        </div>
      </div>
    </div>
  );
}
