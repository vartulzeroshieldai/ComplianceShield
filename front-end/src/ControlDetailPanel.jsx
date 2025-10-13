// src/ControlDetailPanel.jsx - PRODUCTION VERSION
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useControlData } from "./ControlDataContext";
import {
  FaClipboard,
  FaExclamationTriangle,
  FaEye,
  FaQuestionCircle,
  FaPauseCircle,
  FaCheckCircle,
  FaEllipsisH,
  FaTimes,
  FaReply,
  FaFolder,
  FaInfoCircle,
  FaShareSquare,
  FaFileAlt,
  FaPlus,
  FaComment,
} from "react-icons/fa";
import EvidenceUploadModal from "./EvidenceUploadModal";
import CreateAuditorReview from "./CreateAuditorReview"; // 2. IMPORT THE AUDITOR REVIEW COMPONENT
import ViewDetailsControlPanel from "./ViewDetailsControlPanel"; // 3. IMPORT THE VIEW DETAILS COMPONENT
import EvidenceReuploadModal from "./EvidenceReuploadModal"; // 4. IMPORT THE EVIDENCE RE-UPLOAD MODAL

export default function ControlDetailPanel({
  control,
  isOpen,
  onClose,
  availableControls,
  project,
  onDataUpdate,
  refreshControlData,
}) {
  const { fetchWithAuth, user } = useAuth(); // Get the authenticated fetch function and user
  const { updateControl } = useControlData(); // Get the context update function
  const navigate = useNavigate(); // Get the navigate function for routing
  const [activeTab, setActiveTab] = useState("Details");
  const [activeFilter, setActiveFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [subcontrols, setSubcontrols] = useState([]);
  const [auditorReviews, setAuditorReviews] = useState([]);
  const [commentsData, setCommentsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateReviewModal, setShowCreateReviewModal] = useState(false);
  const [selectedSubcontrol, setSelectedSubcontrol] = useState(null);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showEvidenceReuploadModal, setShowEvidenceReuploadModal] =
    useState(false);
  const [selectedReviewForReupload, setSelectedReviewForReupload] =
    useState(null);

  // Store evidence-to-subcontrol mapping for cases where backend doesn't return sub_clause
  // Use localStorage to persist mappings across page refreshes
  const [evidenceSubcontrolMapping, setEvidenceSubcontrolMapping] = useState(
    () => {
      try {
        const stored = localStorage.getItem(
          `evidenceMapping_${project?.id}_${control?.id}`
        );
        if (stored) {
          const parsed = JSON.parse(stored);
          return new Map(parsed);
        }
      } catch (error) {
        console.warn(
          "Failed to load evidence mapping from localStorage:",
          error
        );
      }
      return new Map();
    }
  );

  // Use ref to access current mapping without causing dependency issues
  const evidenceSubcontrolMappingRef = useRef(evidenceSubcontrolMapping);
  evidenceSubcontrolMappingRef.current = evidenceSubcontrolMapping;

  // 2. TEAM MEMBERS DATA - This should come from props or API
  // For now, using empty array - replace with actual team members from project
  const teamMembers = project?.teamMembers || [];

  // Role-based access control
  const canViewEvidence = user && user.role !== "Auditor";
  const canViewAuditorReview =
    user && (user.role === "Auditor" || user.role === "Admin");
  const canViewComments = user && user.role !== "Auditor";

  // Status styling configurations
  const statusConfig = {
    Completed: {
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      iconColor: "text-green-500",
      icon: FaCheckCircle,
    },
    Implemented: {
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      iconColor: "text-green-500",
      icon: FaCheckCircle,
    },
    "In Progress": {
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-500",
      icon: FaPauseCircle,
    },
    "Not Started": {
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      iconColor: "text-red-500",
      icon: FaExclamationTriangle,
    },
  };

  // Reusable function to fetch and process data
  const fetchControlData = useCallback(async () => {
    if (!isOpen || !control) return;

    setLoading(true);
    setError(null);
    try {
      // Use fetchWithAuth to include the authorization header
      const [subcontrolsRes, reviewsRes, evidenceRes, commentsRes] =
        await Promise.all([
          fetchWithAuth(`/api/controls/${control.id}/subcontrols/`),
          fetchWithAuth(`/api/controls/${control.id}/reviews/`),
          fetchWithAuth(`/api/projects/${project.id}/evidence/`),
          fetchWithAuth(
            `/api/auditing/projects/${project.id}/controls/${control.id}/comments/`
          ),
        ]);

      // Debug the evidence API response (only log errors)
      if (!evidenceRes.ok) {
        console.error(`Evidence API error for project ${project.id}:`, {
          status: evidenceRes.status,
          statusText: evidenceRes.statusText,
        });
      }

      if (!subcontrolsRes.ok) throw new Error("Failed to fetch subcontrols");
      const subcontrolsData = await subcontrolsRes.json();

      if (!reviewsRes.ok) throw new Error("Failed to fetch auditor reviews");
      const reviewsData = await reviewsRes.json();
      setAuditorReviews(reviewsData);

      if (!evidenceRes.ok) throw new Error("Failed to fetch evidence");
      const evidenceData = await evidenceRes.json();

      // Process comments data
      let commentsData = [];
      if (commentsRes.ok) {
        commentsData = await commentsRes.json();
        setCommentsData(commentsData);
      } else {
        console.warn(`Comments API error for control ${control.id}:`, {
          status: commentsRes.status,
          statusText: commentsRes.statusText,
        });
      }

      // Debug the parsed evidence data (only log if there are issues)
      if (evidenceData.length === 0) {
        console.log(`No evidence found for project ${project.id}`);
      }

      // Calculate counters and implementation status for each subcontrol
      const enhancedSubcontrols = subcontrolsData.map((sub) => {
        // Count evidence for this subcontrol
        const evidenceCount = evidenceData.filter((ev) => {
          // Handle both direct sub_clause matching and clause-based matching
          const directMatch = ev.sub_clause === sub.id;
          const clauseMatch =
            ev.clauses &&
            ev.clauses.some((c) => {
              // Handle both object format (c.id) and direct ID format (c)
              let clauseId;
              if (typeof c === "object" && c.id !== undefined) {
                clauseId = c.id;
              } else if (typeof c === "number") {
                clauseId = c;
              } else if (typeof c === "string") {
                clauseId = Number(c);
              } else {
                return false;
              }
              return clauseId === control.id && ev.sub_clause === sub.id;
            });

          // Also handle type mismatches for sub_clause
          const subClauseMatch =
            ev.sub_clause === sub.id ||
            String(ev.sub_clause) === String(sub.id) ||
            Number(ev.sub_clause) === Number(sub.id);

          // Smart fallback: Use stored mapping for evidence with undefined sub_clause
          const smartFallbackMatch =
            ev.sub_clause === undefined &&
            evidenceSubcontrolMappingRef.current.has(ev.id) &&
            evidenceSubcontrolMappingRef.current.get(ev.id) === sub.id;

          return (
            directMatch || clauseMatch || subClauseMatch || smartFallbackMatch
          );
        }).length;

        // Debug: Show when evidence mapping is being used
        if (
          evidenceCount > 0 &&
          evidenceSubcontrolMappingRef.current.size > 0
        ) {
          console.log(
            `ControlDetailPanel - Evidence counting for subcontrol ${sub.id} (${sub.sub_clause_number}):`,
            {
              evidenceCount,
              evidenceMappingSize: evidenceSubcontrolMappingRef.current.size,
              usingMapping: evidenceData.filter(
                (ev) =>
                  ev.sub_clause === undefined &&
                  evidenceSubcontrolMappingRef.current.has(ev.id) &&
                  evidenceSubcontrolMappingRef.current.get(ev.id) === sub.id
              ).length,
            }
          );
        }

        // Debug evidence counting for any subcontrol (only log if there are issues)
        if (evidenceCount > 0) {
          console.log(
            `Subcontrol ${sub.id} (${sub.sub_clause_number}) has ${evidenceCount} evidence items`
          );
        } else {
          // Debug why this subcontrol has no evidence
          console.log(
            `Debug - Subcontrol ${sub.id} (${sub.sub_clause_number}) has 0 evidence. Checking evidence data:`,
            {
              totalEvidence: evidenceData.length,
              evidenceSubClauseValues: evidenceData.map((ev) => ({
                id: ev.id,
                sub_clause: ev.sub_clause,
                sub_clause_type: typeof ev.sub_clause,
                hasClauses: !!ev.clauses,
                clauses: ev.clauses,
              })),
              evidenceMapping: Array.from(
                evidenceSubcontrolMappingRef.current.entries()
              ),
              evidenceMappingSize: evidenceSubcontrolMappingRef.current.size,
              // Show detailed matching logic
              matchingLogic: {
                directMatch: evidenceData.filter(
                  (ev) => ev.sub_clause === sub.id
                ).length,
                clauseMatch: evidenceData.filter(
                  (ev) =>
                    ev.clauses &&
                    ev.clauses.some((c) => {
                      let clauseId;
                      if (typeof c === "object" && c.id !== undefined) {
                        clauseId = c.id;
                      } else if (typeof c === "number") {
                        clauseId = c;
                      } else if (typeof c === "string") {
                        clauseId = Number(c);
                      } else {
                        return false;
                      }
                      return (
                        clauseId === control.id && ev.sub_clause === sub.id
                      );
                    })
                ).length,
                smartFallbackMatch: evidenceData.filter(
                  (ev) =>
                    ev.sub_clause === undefined &&
                    evidenceSubcontrolMappingRef.current.has(ev.id) &&
                    evidenceSubcontrolMappingRef.current.get(ev.id) === sub.id
                ).length,
              },
            }
          );
        }

        // Count comments for this subcontrol
        const commentsCount = commentsData.filter((comment) => {
          // Comments are linked to controls, so we need to check if this comment
          // is related to this subcontrol through the control relationship
          return comment.control === control.id;
        }).length;

        // Count reviews for this subcontrol
        // Only count reviews explicitly linked to this subcontrol
        const subcontrolReviews = reviewsData.filter((review) => {
          // Handle case where backend doesn't return control field
          const reviewControlId =
            review.control !== undefined ? review.control : control.id;

          if (!review || reviewControlId !== control.id) return false;
          if (review.sub_clause === undefined || review.sub_clause === null) {
            return false; // Control-level reviews do not apply to specific subcontrols
          }
          // Handle both string and number comparisons
          const reviewSubClause = review.sub_clause;
          const subcontrolId = sub.id;

          // Try multiple comparison methods to handle type mismatches
          return (
            reviewSubClause === subcontrolId ||
            String(reviewSubClause) === String(subcontrolId) ||
            Number(reviewSubClause) === Number(subcontrolId)
          );
        });
        const reviewsCount = subcontrolReviews.length;

        // Debug logging for subcontrol reviews (only log if there are reviews)
        if (subcontrolReviews.length > 0) {
          console.log(
            `Subcontrol ${sub.id} (${sub.sub_clause_number}) has ${subcontrolReviews.length} reviews`
          );
        }

        // Check auditor review statuses for this subcontrol
        const hasAcceptedReview = subcontrolReviews.some(
          (review) => review.status === "Accepted"
        );
        const hasPendingReview = subcontrolReviews.some(
          (review) => review.status === "Pending Updates"
        );
        const hasRejectedReview = subcontrolReviews.some(
          (review) => review.status === "Rejected"
        );

        // Enhanced logic to determine implementation status based on auditor review status
        // Priority: Accepted > Pending Updates > Rejected > No Reviews
        let implementationStatus = "Not Started";
        let statusReason = "No auditor reviews";

        if (hasAcceptedReview) {
          // If any review is Accepted → Implemented
          implementationStatus = "Implemented";
          statusReason = "Has accepted auditor review(s)";
        } else if (hasPendingReview) {
          // If any review is Pending Updates → In Progress
          implementationStatus = "In Progress";
          statusReason = "Has pending auditor review(s)";
        } else if (hasRejectedReview) {
          // If any review is Rejected → Not Started
          implementationStatus = "Not Started";
          statusReason = "Has rejected auditor review(s)";
        } else if (subcontrolReviews.length > 0) {
          // Fallback: if there are reviews but no specific status match
          implementationStatus = "In Progress";
          statusReason = "Has auditor reviews with unknown status";
        }

        return {
          ...sub,
          evidenceCount,
          commentsCount,
          reviewsCount,
          implementationStatus,
          statusReason,
          hasAcceptedReview,
          hasPendingReview,
          hasRejectedReview,
          isImplemented: hasAcceptedReview,
          auditorReviewStatuses: subcontrolReviews.map((r) => r.status),
          // Additional data for better tracking
          latestReviewStatus:
            subcontrolReviews.length > 0 ? subcontrolReviews[0].status : null,
          reviewCounts: {
            accepted: subcontrolReviews.filter((r) => r.status === "Accepted")
              .length,
            pending: subcontrolReviews.filter(
              (r) => r.status === "Pending Updates"
            ).length,
            rejected: subcontrolReviews.filter((r) => r.status === "Rejected")
              .length,
            total: subcontrolReviews.length,
          },
        };
      });
      setSubcontrols(enhancedSubcontrols);

      // Calculate overall control implementation status
      const totalSubcontrols = enhancedSubcontrols.length;
      const implementedSubcontrols = enhancedSubcontrols.filter(
        (sub) => sub.isImplemented
      ).length;
      const inProgressSubcontrols = enhancedSubcontrols.filter(
        (sub) => sub.implementationStatus === "In Progress"
      ).length;
      const notStartedSubcontrols = enhancedSubcontrols.filter(
        (sub) => sub.implementationStatus === "Not Started"
      ).length;

      // Calculate control-level auditor review status
      // For controls without subcontrols, all reviews are considered control-level
      const controlLevelReviews = reviewsData.filter((review) => {
        // Handle case where backend doesn't return control field
        const reviewControlId =
          review.control !== undefined ? review.control : control.id;

        if (totalSubcontrols > 0) {
          // Control has subcontrols - only count reviews with null/undefined sub_clause
          return (
            reviewControlId === control.id &&
            (review.sub_clause === null || review.sub_clause === undefined)
          );
        } else {
          // Control has no subcontrols - all reviews for this control are control-level
          return reviewControlId === control.id;
        }
      });

      const hasControlAcceptedReview = controlLevelReviews.some(
        (r) => r.status === "Accepted"
      );
      const hasControlPendingReview = controlLevelReviews.some(
        (r) => r.status === "Pending Updates"
      );
      const hasControlRejectedReview = controlLevelReviews.some(
        (r) => r.status === "Rejected"
      );

      // Debug control-level review calculation
      console.log(
        `Control-level review calculation for control ${control.id}:`,
        {
          totalSubcontrols,
          hasSubcontrols: totalSubcontrols > 0,
          controlLevelReviews: controlLevelReviews.length,
          controlLevelReviewsData: controlLevelReviews.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            sub_clause: r.sub_clause,
            control: r.control,
          })),
          hasControlAcceptedReview,
          hasControlPendingReview,
          hasControlRejectedReview,
          allReviews: reviewsData.length,
          allReviewsData: reviewsData.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            sub_clause: r.sub_clause,
            control: r.control,
          })),
        }
      );

      // Update control status based on subcontrol implementation and control-level auditor reviews
      let controlImplementationStatus = "Not Started";
      let controlStatusReason = "No implementation progress";

      // Priority: Control-level auditor reviews > Subcontrol implementation
      if (hasControlAcceptedReview) {
        controlImplementationStatus = "Implemented";
        controlStatusReason = "Control has accepted auditor review";
      } else if (hasControlPendingReview) {
        controlImplementationStatus = "In Progress";
        controlStatusReason = "Control has pending auditor review";
      } else if (hasControlRejectedReview) {
        controlImplementationStatus = "Not Started";
        controlStatusReason = "Control has rejected auditor review";
      } else if (totalSubcontrols > 0) {
        // Only apply subcontrol-based logic if control has subcontrols
        if (
          implementedSubcontrols === totalSubcontrols &&
          totalSubcontrols > 0
        ) {
          controlImplementationStatus = "Implemented";
          controlStatusReason = "All subcontrols implemented";
        } else if (implementedSubcontrols > 0 || inProgressSubcontrols > 0) {
          controlImplementationStatus = "In Progress";
          controlStatusReason = "Some subcontrols in progress";
        }
      }

      // Calculate evidence collection progress for this control
      const evidenceForThisControl = evidenceData.filter((ev) => {
        // Check if evidence is linked to this control
        // Handle both object format (c.id) and direct ID format (c)
        return (
          ev.clauses &&
          ev.clauses.some((c) => {
            // If c is an object with id property
            if (typeof c === "object" && c.id !== undefined) {
              return c.id === control.id;
            }
            // If c is directly the ID number
            if (typeof c === "number") {
              return c === control.id;
            }
            // If c is a string ID
            if (typeof c === "string") {
              return String(c) === String(control.id);
            }
            return false;
          })
        );
      });

      // Debug evidence collection calculation
      console.log(
        `Evidence collection calculation for control ${control.id}:`,
        {
          totalEvidence: evidenceData.length,
          evidenceForThisControl: evidenceForThisControl.length,
          evidenceForThisControlData: evidenceForThisControl,
          controlId: control.id,
          evidenceClauses: evidenceData.map((ev) => ({
            id: ev.id,
            clauses: ev.clauses?.map((c) => ({ id: c.id, title: c.title })),
          })),
        }
      );

      // Debug each evidence item's clause matching
      // Debug evidence clause matching (only log if there are issues)
      const unmatchedEvidence = evidenceData.filter(
        (ev) =>
          ev.clauses &&
          !ev.clauses.some((c) => {
            // Handle both object format (c.id) and direct ID format (c)
            if (typeof c === "object" && c.id !== undefined) {
              return c.id === control.id;
            }
            if (typeof c === "number") {
              return c === control.id;
            }
            if (typeof c === "string") {
              return String(c) === String(control.id);
            }
            return false;
          })
      );
      if (unmatchedEvidence.length > 0) {
        console.log(
          `Found ${unmatchedEvidence.length} evidence items that don't match control ${control.id}`
        );
      }

      // Calculate evidence collection percentage
      let evidenceCollectionProgress = 0;

      if (totalSubcontrols > 0) {
        // Control has subcontrols - calculate based on subcontrols with evidence
        const subcontrolsWithEvidence = enhancedSubcontrols.filter(
          (sub) => sub.evidenceCount > 0
        ).length;
        evidenceCollectionProgress = Math.round(
          (subcontrolsWithEvidence / totalSubcontrols) * 100
        );
      } else {
        // Control has no subcontrols - calculate based on control-level evidence
        const controlLevelEvidenceCount = evidenceForThisControl.length;
        evidenceCollectionProgress = controlLevelEvidenceCount > 0 ? 100 : 0;
      }

      // Debug evidence collection calculation
      console.log(
        `Evidence collection progress calculation for control ${control.id}:`,
        {
          totalSubcontrols,
          hasSubcontrols: totalSubcontrols > 0,
          evidenceCollectionProgress,
          evidenceMappingSize: evidenceSubcontrolMappingRef.current.size,
          calculationMethod:
            totalSubcontrols > 0 ? "subcontrol-based" : "control-level",
          ...(totalSubcontrols > 0
            ? {
                subcontrolsWithEvidence: enhancedSubcontrols.filter(
                  (sub) => sub.evidenceCount > 0
                ).length,
                subcontrolEvidenceCounts: enhancedSubcontrols.map((sub) => ({
                  id: sub.id,
                  number: sub.sub_clause_number,
                  evidenceCount: sub.evidenceCount,
                })),
              }
            : {
                controlLevelEvidenceCount: evidenceForThisControl.length,
                controlLevelEvidence: evidenceForThisControl.map((ev) => ({
                  id: ev.id,
                  title: ev.evidence_name,
                  clauses: ev.clauses,
                })),
              }),
        }
      );

      // Update the control object with implementation status
      if (control) {
        control.implementationStatus = controlImplementationStatus;
        control.statusReason = controlStatusReason;
        // Calculate implementation progress
        if (totalSubcontrols > 0) {
          // Control has subcontrols - calculate based on implemented subcontrols
          control.implementationProgress = Math.round(
            (implementedSubcontrols / totalSubcontrols) * 100
          );
        } else {
          // Control has no subcontrols - use control-level implementation status
          control.implementationProgress =
            controlImplementationStatus === "Implemented"
              ? 100
              : controlImplementationStatus === "In Progress"
              ? 50
              : 0;
        }

        // Debug implementation progress calculation
        console.log(
          `Implementation progress calculation for control ${control.id}:`,
          {
            totalSubcontrols,
            hasSubcontrols: totalSubcontrols > 0,
            controlImplementationStatus,
            controlStatusReason,
            implementationProgress: control.implementationProgress,
            ...(totalSubcontrols > 0
              ? {
                  implementedSubcontrols,
                  inProgressSubcontrols,
                  notStartedSubcontrols,
                }
              : {
                  controlLevelReviews: controlLevelReviews.length,
                  hasControlAcceptedReview,
                  hasControlPendingReview,
                  hasControlRejectedReview,
                }),
          }
        );
        control.evidenceCollectionProgress = evidenceCollectionProgress;
        control.evidenceCount = evidenceForThisControl.length;
        control.commentsCount = commentsData.length;
        control.implementedSubcontrols = implementedSubcontrols;
        control.inProgressSubcontrols = inProgressSubcontrols;
        control.notStartedSubcontrols = notStartedSubcontrols;
        control.totalSubcontrols = totalSubcontrols;

        // Add auditor review information at control level
        control.auditorReviewInfo = {
          hasAcceptedReview: hasControlAcceptedReview,
          hasPendingReview: hasControlPendingReview,
          hasRejectedReview: hasControlRejectedReview,
          controlLevelReviews: controlLevelReviews.length,
          totalReviews: reviewsData.length,
        };

        // Update the control data through Context API
        console.log(
          "ControlDetailPanel - Updating control through Context API:",
          {
            controlId: control.id,
            controlNumber: control.clause_number,
            status: control.implementationStatus,
            progress: control.implementationProgress,
          }
        );

        updateControl(control);
      }
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch control details:", err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, control, fetchWithAuth, project]);

  // Load evidence mapping from localStorage when component mounts
  useEffect(() => {
    if (project?.id && control?.id) {
      try {
        const mappingKey = `evidenceMapping_${project.id}_${control.id}`;
        const stored = localStorage.getItem(mappingKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const loadedMap = new Map(parsed);
          setEvidenceSubcontrolMapping(loadedMap);
          evidenceSubcontrolMappingRef.current = loadedMap;
          console.log("Evidence mapping loaded from localStorage:", {
            key: mappingKey,
            mapping: Array.from(loadedMap.entries()),
          });
        }
      } catch (error) {
        console.warn(
          "Failed to load evidence mapping from localStorage:",
          error
        );
      }
    }
  }, [project?.id, control?.id]);

  // Fetch data when control changes or component opens (removed evidenceSubcontrolMapping dependency)
  useEffect(() => {
    if (project?.id && control?.id && isOpen) {
      console.log(
        "ControlDetailPanel - fetchControlData triggered by control change:",
        {
          controlId: control.id,
          controlNumber: control.clause_number,
          isOpen,
        }
      );
      fetchControlData();
    }
  }, [fetchControlData, project?.id, control?.id, isOpen]);

  // Remove the problematic useEffect that causes infinite loops
  // Data updates are now handled through the Context API

  const handleCreateEvidence = async (formDataFromModal) => {
    console.log(
      "ControlDetailPanel - handleCreateEvidence called with:",
      formDataFromModal
    );
    console.log(
      "ControlDetailPanel - mappedControls:",
      formDataFromModal.mappedControls
    );

    const formData = new FormData();
    formData.append("evidence_name", formDataFromModal.title);
    formData.append("description", formDataFromModal.description || "");
    formData.append("evidence_content", formDataFromModal.content || "");

    if (formDataFromModal.file) {
      formData.append("file", formDataFromModal.file);
    }

    // Add clauses (only Clause objects, not SubClause objects)
    if (formDataFromModal.mappedControls.length > 0) {
      formDataFromModal.mappedControls.forEach((control) => {
        console.log(
          "ControlDetailPanel - Adding clause ID:",
          control.id,
          "for control:",
          control
        );
        formData.append("clauses", control.id);
      });
    }

    // Add sub_clause if we're creating evidence for a specific subcontrol
    if (selectedSubcontrol) {
      console.log(
        "ControlDetailPanel - Adding sub_clause ID:",
        selectedSubcontrol.id,
        "for subcontrol:",
        selectedSubcontrol
      );
      formData.append("sub_clause", selectedSubcontrol.id);
    }

    try {
      const response = await fetchWithAuth(
        `/api/projects/${project.id}/evidence/`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      // Store the evidence-to-subcontrol mapping for future reference
      if (selectedSubcontrol) {
        const responseData = await response.json();
        console.log("ControlDetailPanel - Storing evidence mapping:", {
          evidenceId: responseData.id,
          subcontrolId: selectedSubcontrol.id,
          subcontrolNumber: selectedSubcontrol.sub_clause_number,
        });

        setEvidenceSubcontrolMapping((prev) => {
          const newMap = new Map(prev);
          newMap.set(responseData.id, selectedSubcontrol.id);

          // Update the ref immediately
          evidenceSubcontrolMappingRef.current = newMap;

          // Save to localStorage for persistence
          try {
            const mappingKey = `evidenceMapping_${project.id}_${control.id}`;
            localStorage.setItem(
              mappingKey,
              JSON.stringify(Array.from(newMap.entries()))
            );
            console.log("Evidence mapping saved to localStorage:", {
              key: mappingKey,
              mapping: Array.from(newMap.entries()),
            });
          } catch (error) {
            console.warn(
              "Failed to save evidence mapping to localStorage:",
              error
            );
          }

          return newMap;
        });
      }

      // Use the new refresh function to update parent without requiring child render
      if (refreshControlData) {
        console.log(
          "ControlDetailPanel - Refreshing control data from parent after evidence upload..."
        );
        await refreshControlData(control.id);
        console.log(
          "ControlDetailPanel - Parent refresh completed after evidence upload"
        );
      } else {
        // Fallback to local refresh and notify parent
        console.log(
          "ControlDetailPanel - Refreshing data after evidence upload..."
        );
        await fetchControlData();
        console.log(
          "ControlDetailPanel - Data refresh completed after evidence upload"
        );

        // Only call onDataUpdate if refreshControlData is not available
        if (onDataUpdate) {
          onDataUpdate();
        }
      }

      // Close the modal
      setShowCreateModal(false);
      setSelectedSubcontrol(null);
    } catch (err) {
      console.error("Upload evidence error:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleAuditorReview = (subcontrol = null) => {
    console.log(
      "ControlDetailPanel - handleAuditorReview called with subcontrol:",
      subcontrol
    );
    console.log(
      "ControlDetailPanel - subcontrol keys:",
      subcontrol ? Object.keys(subcontrol) : "null"
    );
    setShowCreateReviewModal(true);
    setSelectedSubcontrol(subcontrol);
  };

  const handleOpenEvidenceModal = (subcontrol = null) => {
    setShowCreateModal(true);
    setSelectedSubcontrol(subcontrol);
  };

  const handleViewDetailsModal = (review) => {
    setSelectedReview(review);
    setShowViewDetailsModal(true);
  };

  const handleEvidenceReuploadModal = (review) => {
    setSelectedReviewForReupload(review);
    setShowEvidenceReuploadModal(true);
  };

  const handleOpenCommentsModal = (subcontrol = null) => {
    console.log("🔍 ControlDetailPanel - handleOpenCommentsModal called", {
      subcontrol: subcontrol?.sub_clause_number || "control-level",
      control: control.clause_number,
      project: project.id,
    });

    // Navigate to the project detail page with Comments tab active and control/subcontrol info
    const controlInfo = subcontrol || control;
    const controlIdentifier = subcontrol
      ? subcontrol.sub_clause_number
      : control.clause_number;
    const parentControlIdentifier = control.clause_number;

    // Create URL parameters for the Comments page
    const params = new URLSearchParams({
      tab: "Comments",
      control: controlIdentifier,
      parentControl: parentControlIdentifier,
      controlId: controlInfo.id,
      controlTitle: controlInfo.title || controlInfo.sub_clause_title,
    });

    const navigationUrl = `/dashboard?project=${
      project.id
    }&${params.toString()}`;
    console.log("🔍 ControlDetailPanel - Navigating to:", navigationUrl);

    // Navigate to project detail with parameters
    navigate(navigationUrl);
  };

  const handleReviewCreated = () => {
    console.log(
      "ControlDetailPanel - handleReviewCreated called, refreshing data..."
    );

    // Use the new refresh function to update parent without requiring child render
    if (refreshControlData) {
      console.log(
        "ControlDetailPanel - Refreshing control data from parent after review creation..."
      );
      refreshControlData(control.id);
    } else {
      // Fallback to local refresh and notify parent
      fetchControlData();
      if (onDataUpdate) {
        onDataUpdate();
      }
    }
  };

  // Enhanced function to handle auditor review status updates
  const handleAuditorReviewStatusUpdate = (
    reviewId,
    newStatus,
    subcontrolId = null
  ) => {
    console.log(
      `ControlDetailPanel - Auditor review ${reviewId} status updated to ${newStatus} for subcontrol ${subcontrolId}`
    );

    // Update the auditor reviews state immediately for real-time UI updates
    setAuditorReviews((prevReviews) =>
      prevReviews.map((review) =>
        review.id === reviewId ? { ...review, status: newStatus } : review
      )
    );

    // Update subcontrol statuses based on the new auditor review status
    setSubcontrols((prevSubcontrols) =>
      prevSubcontrols.map((sub) => {
        if (subcontrolId && sub.id === subcontrolId) {
          // Update specific subcontrol
          const subcontrolReviews = auditorReviews.filter((review) => {
            // Handle case where backend doesn't return control field
            const reviewControlId =
              review.control !== undefined ? review.control : control.id;

            if (!review || reviewControlId !== control.id) return false;
            if (review.sub_clause === undefined || review.sub_clause === null) {
              return false;
            }
            const reviewSubClause = review.sub_clause;
            const subcontrolId = sub.id;
            return (
              reviewSubClause === subcontrolId ||
              String(reviewSubClause) === String(subcontrolId) ||
              Number(reviewSubClause) === Number(subcontrolId)
            );
          });

          const hasAcceptedReview = subcontrolReviews.some(
            (r) => r.status === "Accepted"
          );
          const hasPendingReview = subcontrolReviews.some(
            (r) => r.status === "Pending Updates"
          );
          const hasRejectedReview = subcontrolReviews.some(
            (r) => r.status === "Rejected"
          );

          let newImplementationStatus = "Not Started";
          let newStatusReason = "No auditor reviews";

          if (hasAcceptedReview) {
            newImplementationStatus = "Implemented";
            newStatusReason = "Has accepted auditor review(s)";
          } else if (hasPendingReview) {
            newImplementationStatus = "In Progress";
            newStatusReason = "Has pending auditor review(s)";
          } else if (hasRejectedReview) {
            newImplementationStatus = "Not Started";
            newStatusReason = "Has rejected auditor review(s)";
          }

          return {
            ...sub,
            implementationStatus: newImplementationStatus,
            statusReason: newStatusReason,
            isImplemented: hasAcceptedReview,
            hasAcceptedReview,
            hasPendingReview,
            hasRejectedReview,
          };
        }
        return sub;
      })
    );

    // Use the new refresh function to update parent without requiring child render
    if (refreshControlData) {
      console.log(
        "ControlDetailPanel - Refreshing control data from parent after review status update..."
      );
      refreshControlData(control.id);
    } else {
      // Fallback to local refresh and notify parent
      fetchControlData();
      if (onDataUpdate) {
        onDataUpdate();
      }
    }
  };

  if (!isOpen || !control) return null;

  const tabs = [
    {
      id: "Details",
      label: "Details",
      icon: <FaClipboard className="w-4 h-4" />,
    },
    {
      id: "Subcontrols",
      label: `Subcontrols (${control.implementedSubcontrols || 0}/${
        control.totalSubcontrols || 0
      })`,
      icon: <FaExclamationTriangle className="w-4 h-4" />,
      hasAlert: control.subcontrolsCompleted < control.subcontrols,
    },
    {
      id: "Auditor Review",
      label: `Auditor Review (${auditorReviews.length})`,
      icon: <FaEye className="w-4 h-4" />,
    },
  ];

  const renderDetailsTab = () => (
    <div className="grid grid-cols-12 gap-8">
      {/* Left sidebar - Enhanced */}
      <div className="col-span-3 space-y-6">
        {/* Control Status - Enhanced */}
        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700 tracking-wide uppercase">
              Control Status
            </span>
            <div className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-help">
              <FaQuestionCircle className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                control.implementationStatus === "Implemented"
                  ? "bg-green-100"
                  : control.implementationStatus === "In Progress"
                  ? "bg-yellow-100"
                  : "bg-red-100"
              }`}
            >
              {control.implementationStatus === "Implemented" ? (
                <FaCheckCircle className="w-5 h-5 text-green-600" />
              ) : control.implementationStatus === "In Progress" ? (
                <FaPauseCircle className="w-5 h-5 text-yellow-600" />
              ) : (
                <FaExclamationTriangle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                control.implementationStatus === "Implemented"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : control.implementationStatus === "In Progress"
                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                  : "bg-red-100 text-red-800 border-red-200"
              } border`}
            >
              {control.implementationStatus || control.status}
            </span>
          </div>
        </div>

        {/* Progress - Enhanced */}
        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          {/* Controls Implemented */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FaCheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Implementation Progress
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900 bg-green-50 px-3 py-1 rounded-full">
                {control.implementationProgress || 0}%
              </span>
            </div>
            <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${control.implementationProgress || 0}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 rounded-full"></div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {control.implementedSubcontrols || 0} of{" "}
              {control.totalSubcontrols || 0} subcontrols implemented
            </div>
          </div>

          {/* Evidence Collection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FaFolder className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Evidence Collection
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900 bg-yellow-50 px-3 py-1 rounded-full">
                {control.evidenceCollectionProgress || 0}%
              </span>
            </div>
            <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${control.evidenceCollectionProgress || 0}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content - Enhanced */}
      <div className="col-span-9 space-y-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Completion chart - Enhanced */}
          <div className="bg-gradient-to-br from-white to-teal-50 p-8 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center">
            <div className="relative inline-flex items-center justify-center w-36 h-36 mb-4">
              <svg
                className="w-36 h-36 transform -rotate-90"
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${
                    (control.implementationProgress || 0) * 3.14
                  } ${314 - (control.implementationProgress || 0) * 3.14}`}
                  className="transition-all duration-1000 ease-out drop-shadow-sm"
                />
                <defs>
                  <linearGradient
                    id="gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-800 block">
                    {control.implementationProgress || 0}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-teal-400 to-teal-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-semibold text-gray-700">
                Implementation %
              </span>
            </div>
          </div>

          {/* Status / Reference / Subcontrols - Enhanced */}
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-5">
            {[
              {
                label: "Implementation Status",
                value: control.implementationStatus || control.status,
                icon: "status",
              },
              {
                label: "Reference Code",
                value: control.clause_number,
                icon: "reference",
              },
              {
                label: "Implemented Subcontrols",
                value: `${control.implementedSubcontrols || 0}/${
                  control.totalSubcontrols || 0
                }`,
                icon: "subcontrols",
              },
            ].map((item, idx) => (
              <div key={idx} className="group">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
                  {item.label}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {item.icon === "status" && (
                      <div
                        className={`w-3 h-3 rounded-full shadow-sm ${
                          control.implementationStatus === "Implemented"
                            ? "bg-green-500"
                            : control.implementationStatus === "In Progress"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                    )}
                    {item.icon === "subcontrols" && (
                      <div className="p-1 bg-red-100 rounded">
                        <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                      </div>
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        item.icon === "subcontrols" &&
                        (control.implementedSubcontrols || 0) <
                          (control.totalSubcontrols || 0)
                          ? "text-red-600"
                          : "text-gray-800"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                  {item.icon === "subcontrols" && (
                    <button
                      onClick={() => setActiveTab("Subcontrols")}
                      className="text-sm text-teal-600 hover:text-teal-800 font-medium hover:bg-teal-50 px-2 py-1 rounded transition-colors"
                    >
                      View →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Applicable / Tags / Auditor Review Status - Enhanced */}
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-8">
            {[
              {
                label: "Applicable",
                value: "Yes",
                color: "bg-green-500",
                showDot: true,
              },
              {
                label: "Auditor Review Status",
                value: "No Auditor",
                color: null,
                showDot: false,
                hasAction: true,
              },
            ].map((item, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {item.label}
                  </span>
                  {item.label === "Auditor Review Status" && (
                    <div className="p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-help">
                      <FaQuestionCircle className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {item.showDot && (
                      <div
                        className={`${item.color} w-3 h-3 rounded-full shadow-sm`}
                      ></div>
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        item.value === "-" ? "text-gray-500" : "text-gray-800"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                  {item.hasAction && (
                    <button
                      onClick={() => setActiveTab("Auditor Review")}
                      className="text-sm text-teal-600 hover:text-teal-800 font-medium hover:bg-teal-50 px-2 py-1 rounded transition-colors"
                    >
                      Update →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Guidance - Enhanced */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-8 rounded-xl border border-teal-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="p-3 bg-teal-500 rounded-xl shadow-lg">
                <FaInfoCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-teal-900 mb-3 tracking-wide">
                Recommended Guidance
              </h4>
              <p className="text-sm text-teal-800 leading-relaxed">
                To fulfill the 'Support' control, organizations should establish
                clear processes for providing IT and information security
                support. This includes documented procedures for{" "}
                <span className="underline text-teal-700 cursor-pointer hover:text-teal-900 font-semibold transition-colors">
                  incident response
                </span>
                ,{" "}
                <span className="underline text-teal-700 cursor-pointer hover:text-teal-900 font-semibold transition-colors">
                  user assistance
                </span>
                , and service continuity. Regularly test these support processes
                to ensure their effectiveness.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubcontrolsTab = () => {
    const list = subcontrols;
    const total = list.length;

    // For controls without subcontrols, use control-level status
    let implemented, inProgress, notStarted, implPct, progPct, notPct;

    if (total > 0) {
      // Control has subcontrols - use subcontrol-based logic
      implemented = list.filter(
        (s) => s.implementationStatus === "Implemented"
      ).length;
      inProgress = list.filter(
        (s) => s.implementationStatus === "In Progress"
      ).length;
      notStarted = list.filter(
        (s) => s.implementationStatus === "Not Started"
      ).length;
      implPct = Math.round((implemented / total) * 100);
      progPct = Math.round((inProgress / total) * 100);
      notPct = Math.round((notStarted / total) * 100);
    } else {
      // Control has no subcontrols - use control-level status
      if (control.implementationStatus === "Implemented") {
        implemented = 1;
        inProgress = 0;
        notStarted = 0;
        implPct = 100;
        progPct = 0;
        notPct = 0;
      } else if (control.implementationStatus === "In Progress") {
        implemented = 0;
        inProgress = 1;
        notStarted = 0;
        implPct = 0;
        progPct = 100;
        notPct = 0;
      } else {
        implemented = 0;
        inProgress = 0;
        notStarted = 1;
        implPct = 0;
        progPct = 0;
        notPct = 100;
      }
    }

    // Debug progress calculation for subcontrols tab
    console.log(
      `Subcontrols tab progress calculation for control ${control.id}:`,
      {
        totalSubcontrols: total,
        hasSubcontrols: total > 0,
        controlImplementationStatus: control.implementationStatus,
        calculatedValues: {
          implemented,
          inProgress,
          notStarted,
          implPct,
          progPct,
          notPct,
        },
      }
    );

    const filters = [
      { id: "all", label: "All", count: list.length },
      { id: "implemented", label: "Implemented", count: implemented },
      { id: "inprogress", label: "In Progress", count: inProgress },
      { id: "notstarted", label: "Not Started", count: notStarted },
    ];
    const activeIndex = filters.findIndex((f) => f.id === subFilter);
    const filtered = list.filter((s) => {
      if (subFilter === "all") return true;
      if (subFilter === "implemented")
        return s.implementationStatus === "Implemented";
      if (subFilter === "inprogress")
        return s.implementationStatus === "In Progress";
      if (subFilter === "notstarted")
        return s.implementationStatus === "Not Started";
      return false;
    });

    return (
      <div className="grid grid-cols-12 gap-8">
        {/* Left sidebar */}
        <div className="col-span-3 space-y-6">
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-700 ease-out transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700 uppercase">
                Subcontrols
              </span>
              <FaQuestionCircle className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-all duration-700 ease-out" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {total > 0 ? total : 1}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Implemented</span>
                <span className="text-lg font-bold text-gray-900">
                  {implemented}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-700 ease-out transform hover:-translate-y-1">
            <div className="text-sm font-semibold text-gray-700 mb-4 uppercase">
              Progress Overview
            </div>
            {[
              {
                icon: FaCheckCircle,
                label: "Implemented",
                value: implemented,
                color: "text-green-500",
              },
              {
                icon: FaPauseCircle,
                label: "In Progress",
                value: inProgress,
                color: "text-yellow-500",
              },
              {
                icon: FaExclamationTriangle,
                label: "Not Started",
                value: notStarted,
                color: "text-red-500",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-100 transition-all duration-700 ease-out"
              >
                <div className="flex items-center space-x-2">
                  <item.icon
                    className={`w-5 h-5 ${item.color} transition-all duration-700 ease-out`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {item.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="col-span-6 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-4">
            <div className="relative p-1">
              <div
                className="absolute top-1 left-1 bg-teal-100 rounded-lg transition-all duration-500 ease-out shadow-sm"
                style={{
                  width: `${100 / filters.length}%`,
                  height: "calc(100% - 8px)",
                  transform: `translateX(${activeIndex * 100}%)`,
                }}
              />
              <div className="relative flex">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSubFilter(f.id)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-500 ease-out relative z-10 ${
                      subFilter === f.id
                        ? "text-teal-700"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-center">Loading subcontrols...</div>
          ) : error ? (
            <div className="text-center text-red-500">Error: {error}</div>
          ) : filtered.length > 0 ? (
            filtered.map((sub) => {
              const cfg =
                statusConfig[sub.implementationStatus] ||
                statusConfig["Not Started"];
              // FIXED: The returned JSX is now correctly structured with a single parent `div`
              // containing the icon and the details div as direct children.
              return (
                <div
                  key={sub.id}
                  className="flex bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-700 ease-out transform hover:-translate-y-1 group animate-fadeIn"
                >
                  <cfg.icon
                    className={`w-6 h-6 ${cfg.iconColor} transition-all duration-700 ease-out group-hover:${cfg.textColor}`}
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-all duration-700 ease-out">
                        {sub.title}
                      </h4>
                      <span
                        className={`px-3 py-1 text-sm rounded-full font-medium transition-all duration-700 ease-out ${cfg.bgColor} ${cfg.textColor} group-hover:scale-105`}
                      >
                        {sub.implementationStatus}
                      </span>
                    </div>
                    <p className="text-sm text-teal-600 mb-1">
                      {sub.sub_clause_number}
                    </p>
                    <p className="text-gray-600 mb-2">{sub.description}</p>
                    {sub.statusReason && (
                      <div className="mb-4 p-2 bg-gray-50 rounded-lg border-l-4 border-teal-400">
                        <div className="flex items-center space-x-2">
                          <FaInfoCircle className="w-3 h-3 text-teal-500" />
                          <span className="text-xs text-gray-600 italic">
                            Status: {sub.statusReason}
                          </span>
                        </div>
                        {sub.reviewCounts && sub.reviewCounts.total > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            Reviews: {sub.reviewCounts.accepted} accepted,{" "}
                            {sub.reviewCounts.pending} pending,{" "}
                            {sub.reviewCounts.rejected} rejected
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex space-x-4">
                      {canViewEvidence && (
                        <button
                          onClick={() => handleOpenEvidenceModal(sub)}
                          className="flex items-center space-x-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-2 rounded-lg transition-all duration-300 ease-out border border-teal-200 hover:border-teal-300 group"
                          title={`View/Add Evidence for ${sub.sub_clause_number}`}
                        >
                          <FaClipboard className="inline w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110" />
                          <span className="font-medium">
                            Evidence ({sub.evidenceCount})
                          </span>
                        </button>
                      )}
                      {canViewAuditorReview && (
                        <button
                          onClick={() => handleAuditorReview(sub)}
                          className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-3 py-2 rounded-lg transition-all duration-300 ease-out border border-purple-200 hover:border-purple-300 group"
                          title={`View/Add Auditor Review for ${sub.sub_clause_number}`}
                        >
                          <FaEye className="w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110" />
                          <span className="font-medium">
                            Auditor Review ({sub.reviewsCount})
                          </span>
                        </button>
                      )}
                      {canViewComments && (
                        <button
                          onClick={() => handleOpenCommentsModal(sub)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-300 ease-out border border-blue-200 hover:border-blue-300 group"
                          title={`View/Add Comments for ${sub.sub_clause_number}`}
                        >
                          <FaComment className="w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110" />
                          <span className="font-medium">
                            Comments ({sub.commentsCount || 0})
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // No subcontrols message tile - Enhanced for control-level management
            <div className="flex bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-700 ease-out transform hover:-translate-y-1 group animate-fadeIn">
              <div className="p-3 bg-gray-100 rounded-lg">
                <FaInfoCircle className="w-6 h-6 text-gray-500" />
              </div>
              <div className="ml-4 flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-all duration-700 ease-out">
                    No Sub-controls Available
                  </h4>
                  <span
                    className={`px-3 py-1 text-sm rounded-full font-medium ${
                      control.implementationStatus === "Implemented"
                        ? "bg-green-100 text-green-800"
                        : control.implementationStatus === "In Progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    Control-Level
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  This control does not have any sub-controls
                </p>
                <p className="text-gray-600 mb-4">
                  All evidence, comments, and auditor reviews are managed
                  directly at the control level.
                </p>

                {/* Control-level status display */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-teal-400">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaInfoCircle className="w-3 h-3 text-teal-500" />
                    <span className="text-xs text-gray-600 italic">
                      Control Status:{" "}
                      {control.implementationStatus || "Not Started"}
                    </span>
                  </div>
                  {control.statusReason && (
                    <div className="text-xs text-gray-500">
                      Reason: {control.statusReason}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    Evidence Collection:{" "}
                    {control.evidenceCollectionProgress || 0}% | Implementation:{" "}
                    {control.implementationProgress || 0}%
                  </div>
                </div>

                <div className="flex space-x-4">
                  {canViewEvidence && (
                    <button
                      onClick={() => handleOpenEvidenceModal(null)}
                      className="flex items-center space-x-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-2 rounded-lg transition-all duration-300 ease-out border border-teal-200 hover:border-teal-300 group"
                      title={`View/Add Evidence for ${control.clause_number}`}
                    >
                      <FaClipboard className="inline w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110" />
                      <span className="font-medium">
                        Evidence ({control.evidenceCount || 0})
                      </span>
                    </button>
                  )}
                  {canViewAuditorReview && (
                    <button
                      onClick={() => handleAuditorReview(null)}
                      className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-3 py-2 rounded-lg transition-all duration-300 ease-out border border-purple-200 hover:border-purple-300 group"
                      title={`View/Add Auditor Review for ${control.clause_number}`}
                    >
                      <FaEye className="w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110" />
                      <span className="font-medium">
                        Auditor Review ({auditorReviews.length})
                      </span>
                    </button>
                  )}
                  {canViewComments && (
                    <button
                      onClick={() => handleOpenCommentsModal(null)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-300 ease-out border border-blue-200 hover:border-blue-300 group"
                      title={`View/Add Comments for ${control.clause_number}`}
                    >
                      <FaComment className="w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110" />
                      <span className="font-medium">
                        Comments ({control.commentsCount || 0})
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar - Chart */}
        <div className="col-span-3 space-y-6">
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-700 ease-out transform hover:-translate-y-1 text-center">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">
              Progress Chart
            </h3>
            <div className="relative inline-flex items-center justify-center w-40 h-40 mx-auto">
              <svg
                className="w-40 h-40 transform -rotate-90"
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={`${implPct * 3.14} ${314 - implPct * 3.14}`}
                  className="transition-all duration-1000 ease-out"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="8"
                  strokeDasharray={`${progPct * 3.14} ${314 - progPct * 3.14}`}
                  strokeDashoffset={`-${implPct * 3.14}`}
                  className="transition-all duration-1000 ease-out"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="8"
                  strokeDasharray={`${notPct * 3.14} ${314 - notPct * 3.14}`}
                  strokeDashoffset={`-${(implPct + progPct) * 3.14}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{implPct}%</span>
                <span className="text-xs text-gray-500">
                  {total > 0 ? "Implemented" : "Control Status"}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-left">
              {[
                {
                  label: total > 0 ? "Implemented" : "Implemented",
                  count: implemented,
                  color: "bg-green-500",
                },
                {
                  label: total > 0 ? "In Progress" : "In Progress",
                  count: inProgress,
                  color: "bg-yellow-500",
                },
                {
                  label: total > 0 ? "Not Started" : "Not Started",
                  count: notStarted,
                  color: "bg-red-500",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-100 transition-all duration-700 ease-out"
                >
                  <span className="flex items-center space-x-2">
                    <span
                      className={`${item.color} w-3 h-3 rounded-full`}
                    ></span>
                    <span>{item.label}</span>
                  </span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAuditorReviewTab = () => {
    // Sample auditor review data based on the screenshot
    /* const auditorReviews = [
      {
        id: 1,
        title: "Review 1",
        status: "Accepted",
        date: "2023-10-01",
        auditor: {
          name: "Auditor A",
          role: "Lead Auditor",
          avatar: "AA",
        },
        evidence: "Evidence details for review 1.",
        conclusion: "Evidence sufficient, no action required.",
        tags: ["tag1", "tag2"],
        hasUploadOption: true,
        hasViewDetails: true,
      },
      {
        id: 2,
        title: "Review 2",
        status: "Pending Updates",
        date: "2023-10-02",
        auditor: {
          name: "Auditor B",
          role: "Senior Auditor",
          avatar: "AB",
        },
        evidence: "Evidence details for review 2.",
        warning: "Additional information required.",
        tags: ["tag2", "tag3"],
        hasUploadOption: true,
        hasViewDetails: true,
      },
      {
        id: 3,
        title: "Review 3",
        status: "Rejected",
        date: "2023-10-03",
        auditor: {
          name: "Auditor C",
          role: "Junior Auditor",
          avatar: "AC",
        },
        evidence: "Evidence details for review 3.",
        conclusion: "Evidence insufficient, action required.",
        tags: ["tag1"],
        hasUploadOption: true,
        hasViewDetails: true,
      },
    ];*/

    // Status styling configurations for this tab
    const reviewStatusConfig = {
      Rejected: {
        bgColor: "bg-red-100",
        textColor: "text-red-800",
        borderColor: "border-red-200",
        iconColor: "text-red-500",
      },
      "Pending Updates": {
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-800",
        borderColor: "border-yellow-200",
        iconColor: "text-yellow-500",
      },
      Accepted: {
        bgColor: "bg-green-100",
        textColor: "text-green-800",
        borderColor: "border-green-200",
        iconColor: "text-green-500",
      },
    };

    // Progress data
    const totalReviews = auditorReviews.length;
    const accepted = auditorReviews.filter(
      (r) => r.status === "Accepted"
    ).length;
    const pendingUpdates = auditorReviews.filter(
      (r) => r.status === "Pending Updates"
    ).length;
    const rejected = auditorReviews.filter(
      (r) => r.status === "Rejected"
    ).length;
    const progressData = {
      accepted,
      pendingUpdates,
      rejected,
      total: totalReviews,
      acceptedPercentage:
        totalReviews > 0 ? Math.round((accepted / totalReviews) * 100) : 0,
      pendingPercentage:
        totalReviews > 0
          ? Math.round((pendingUpdates / totalReviews) * 100)
          : 0,
      rejectedPercentage:
        totalReviews > 0
          ? 100 -
            Math.round((accepted / totalReviews) * 100) -
            Math.round((pendingUpdates / totalReviews) * 100)
          : 0,
    };

    // Filter data
    const filters = [
      { id: "all", label: "All", count: auditorReviews.length },
      { id: "accepted", label: "Accepted", count: accepted },
      { id: "pending", label: "Pending", count: pendingUpdates },
      { id: "rejected", label: "Rejected", count: rejected },
    ];

    // Filter reviews based on active filter
    const filteredReviews = auditorReviews.filter((review) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "accepted") return review.status === "Accepted";
      if (activeFilter === "pending")
        return review.status === "Pending Updates";
      if (activeFilter === "rejected") return review.status === "Rejected";
      return true;
    });

    // Calculate active filter index for slider position
    const activeFilterIndex = filters.findIndex(
      (filter) => filter.id === activeFilter
    );

    return (
      <div className="grid grid-cols-12 gap-8">
        {/* Left sidebar */}
        <div className="col-span-3 space-y-6">
          {/* Control Status */}
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Control Status
              </span>
              <div className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-help">
                <FaQuestionCircle className="w-4 h-4 text-gray-500" />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-lg ${
                  control.implementationStatus === "Implemented"
                    ? "bg-green-100"
                    : control.implementationStatus === "In Progress"
                    ? "bg-yellow-100"
                    : "bg-red-100"
                }`}
              >
                {control.implementationStatus === "Implemented" ? (
                  <FaCheckCircle className="w-5 h-5 text-green-600" />
                ) : control.implementationStatus === "In Progress" ? (
                  <FaPauseCircle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <FaExclamationTriangle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <span
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${
                  control.implementationStatus === "Implemented"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : control.implementationStatus === "In Progress"
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                    : "bg-red-100 text-red-800 border-red-200"
                }`}
              >
                {control.implementationStatus || "NOT STARTED"}
              </span>
            </div>
            {control.statusReason && (
              <div className="mt-2 text-xs text-gray-600 italic">
                {control.statusReason}
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
            {/* Controls Implemented */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FaCheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold text-gray-700">
                    Controls Implemented
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900 bg-green-50 px-3 py-1 rounded-full">
                  {control.implementationProgress || 0}%
                </span>
              </div>
              <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${control.implementationProgress || 0}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {control.implementedSubcontrols || 0} of{" "}
                {control.totalSubcontrols || 0} subcontrols implemented
              </div>
            </div>

            {/* Evidence Collection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FaFolder className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-semibold text-gray-700">
                    Evidence Collection
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900 bg-yellow-50 px-3 py-1 rounded-full">
                  {control.evidenceCollectionProgress || 0}%
                </span>
              </div>
              <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-1000 ease-out shadow-sm"
                  style={{
                    width: `${control.evidenceCollectionProgress || 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="col-span-6 space-y-6">
          {/* Tab filters with slider effect */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="relative p-1">
              {/* Animated slider background */}
              <div
                className="absolute top-1 left-1 bg-teal-100 rounded-lg transition-all duration-300 ease-in-out shadow-sm"
                style={{
                  width: `${100 / filters.length}%`,
                  height: "calc(100% - 8px)",
                  transform: `translateX(${activeFilterIndex * 100}%)`,
                }}
              />

              {/* Filter buttons */}
              <div className="relative flex">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative z-10 ${
                      activeFilter === filter.id
                        ? "text-teal-700"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Review Cards with animation */}
          <div className="space-y-6 min-h-[400px]">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review, index) => {
                const config = reviewStatusConfig[review.status];
                return (
                  <div
                    key={review.id}
                    className={`bg-white rounded-xl border-l-4 ${config.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fadeIn`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {review.title}
                          </h3>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {review.auditor.avatar}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {review.auditor.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({review.auditor.role})
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {review.date}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${config.bgColor} ${config.textColor}`}
                        >
                          {review.status}
                        </span>
                      </div>

                      {/* Evidence/Content */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-700 mb-2">
                          {review.evidence}
                        </p>

                        {review.warning && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <div className="flex items-start space-x-2">
                              <FaExclamationTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-yellow-800">
                                {review.warning}
                              </p>
                            </div>
                          </div>
                        )}

                        {review.conclusion && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-green-800">
                              {review.conclusion}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {review.tags && (
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {review.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center space-x-3">
                        {review.hasUploadOption && (
                          <button
                            onClick={() => handleEvidenceReuploadModal(review)}
                            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                          >
                            <FaClipboard className="w-4 h-4" />
                            <span>Upload Evidence</span>
                          </button>
                        )}

                        {review.hasViewDetails && (
                          <button
                            onClick={() => handleViewDetailsModal(review)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <FaEye className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                <div className="text-center">
                  <FaExclamationTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No Reviews Found
                  </h3>
                  <p className="text-sm text-gray-500">
                    No reviews match the selected filter.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Progress Overview */}
        <div className="col-span-3 space-y-6">
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-sm font-semibold text-gray-700 mb-6 uppercase tracking-wide">
              Progress Overview
            </h3>

            {/* Multi-colored Circular Progress Chart */}
            <div className="text-center mb-6">
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                <svg
                  className="w-32 h-32 transform -rotate-90"
                  viewBox="0 0 120 120"
                >
                  {/* Background circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />

                  {/* Accepted segment (Green) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${
                      progressData.acceptedPercentage * 2.83
                    } ${283}`}
                    strokeDashoffset="0"
                    className="transition-all duration-1000 ease-out"
                  />

                  {/* Pending segment (Yellow) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${
                      progressData.pendingPercentage * 2.83
                    } ${283}`}
                    strokeDashoffset={`-${
                      progressData.acceptedPercentage * 2.83
                    }`}
                    className="transition-all duration-1000 ease-out"
                  />

                  {/* Rejected segment (Red) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${
                      progressData.rejectedPercentage * 2.83
                    } ${283}`}
                    strokeDashoffset={`-${
                      (progressData.acceptedPercentage +
                        progressData.pendingPercentage) *
                      2.83
                    }`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">
                    {progressData.acceptedPercentage}%
                  </span>
                  <span className="text-xs text-gray-500">Accepted</span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Accepted</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {progressData.accepted}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Pending Updates</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {progressData.pendingUpdates}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Rejected</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {progressData.rejected}
                </span>
              </div>
            </div>
          </div>

          {/* Status Connection Info */}
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border border-teal-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-teal-700 uppercase tracking-wide">
                Status Connection
              </span>
              <div className="p-2 bg-teal-100 rounded-full hover:bg-teal-200 transition-colors cursor-help">
                <FaInfoCircle className="w-4 h-4 text-teal-500" />
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-teal-800">Accepted Reviews</span>
                </div>
                <span className="font-semibold text-teal-900">
                  → Implemented
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-teal-800">Pending Reviews</span>
                </div>
                <span className="font-semibold text-teal-900">
                  → In Progress
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-teal-800">Rejected Reviews</span>
                </div>
                <span className="font-semibold text-teal-900">
                  → Not Started
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="ml-auto w-4/5 h-full bg-white shadow-2xl flex flex-col relative z-10 overflow-hidden">
        {/* Header - Enhanced */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <div className="text-sm text-gray-500 font-medium">
                  Control Title
                </div>
                <div className="text-sm text-gray-600 font-semibold">
                  {control.clause_number}
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {control.title}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all duration-200 cursor-pointer"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Description - Enhanced */}
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-teal-50 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-teal-500 rounded-xl shadow-lg">
              <FaFileAlt className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-3 text-lg">
                Control Description
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {showFullDesc
                  ? control.description
                  : `${control.description.slice(0, 150)}...`}
                <button
                  onClick={() => setShowFullDesc((prev) => !prev)}
                  className="text-teal-600 underline hover:text-teal-800 text-sm font-medium transition-colors ml-2 cursor-pointer"
                >
                  {showFullDesc ? "See Less" : "See More"}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Tabs - Enhanced */}
        <nav className="flex space-x-1 px-8 bg-white border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 border-b-3 font-semibold text-sm transition-all duration-200 relative ${
                activeTab === tab.id
                  ? "border-teal-500 text-teal-600 bg-teal-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div
                className={`p-1 rounded ${
                  activeTab === tab.id ? "bg-teal-100" : "bg-gray-100"
                }`}
              >
                {tab.icon}
              </div>
              <span>{tab.label}</span>
              {tab.hasAlert && (
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse shadow-lg"></div>
              )}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            {activeTab === "Details" && renderDetailsTab()}
            {activeTab === "Subcontrols" && renderSubcontrolsTab()}
            {activeTab === "Auditor Review" && renderAuditorReviewTab()}
          </div>
        </div>
      </div>
      <EvidenceUploadModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedSubcontrol(null);
        }}
        onUpload={handleCreateEvidence}
        availableControls={availableControls || []}
        control={control}
        subcontrol={selectedSubcontrol}
      />
      <CreateAuditorReview
        control={control}
        subcontrol={selectedSubcontrol}
        isOpen={showCreateReviewModal}
        onClose={() => {
          console.log("ControlDetailPanel - Closing CreateAuditorReview modal");
          setShowCreateReviewModal(false);
          setSelectedSubcontrol(null);
        }}
        onSuccess={handleReviewCreated}
        onStatusUpdate={handleAuditorReviewStatusUpdate}
        project={project}
      />
      <ViewDetailsControlPanel
        review={selectedReview}
        isOpen={showViewDetailsModal}
        onClose={() => {
          setShowViewDetailsModal(false);
          setSelectedReview(null);
        }}
      />
      <EvidenceReuploadModal
        review={selectedReviewForReupload}
        control={control}
        subcontrol={selectedSubcontrol}
        project={project}
        isOpen={showEvidenceReuploadModal}
        onClose={() => {
          setShowEvidenceReuploadModal(false);
          setSelectedReviewForReupload(null);
        }}
        onSuccess={handleReviewCreated}
      />
    </div>
  );
}
