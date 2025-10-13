import React, {
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  createContext,
} from "react";
import { useAuth } from "./AuthContext";
import { ActionTypes } from "./ComplianceContextTypes";

// Create context directly in this file to avoid circular imports
export const ComplianceContext = createContext();

// Initial state for compliance data
const initialState = {
  // Organization-level aggregated data
  organizationData: {
    totalProjects: 0,
    totalRisks: 0,
    totalControls: 0,
    totalEvidence: 0,
    totalUsers: 0,
    totalAuditors: 0,
    totalTodos: 0,

    // Compliance metrics
    complianceScore: 0,
    securityScore: 0,
    privacyScore: 0,
    regulatoryScore: 0,

    // Status breakdowns
    projectStatusBreakdown: {
      completed: 0,
      inProgress: 0,
      notStarted: 0,
    },
    riskStatusBreakdown: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    controlStatusBreakdown: {
      implemented: 0,
      inProgress: 0,
      notStarted: 0,
    },
    evidenceStatusBreakdown: {
      collected: 0,
      pending: 0,
      missing: 0,
    },
    userStatusBreakdown: {
      active: 0,
      pendingApproval: 0,
      inactive: 0,
    },
    todoStatusBreakdown: {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    },

    // Framework-specific data
    frameworkData: {},

    // Recent activity
    recentActivity: [],

    // Trends (last 12 months)
    monthlyTrends: {
      projects: [],
      risks: [],
      controls: [],
      evidence: [],
    },
  },

  // Raw data collections
  projects: [],
  risks: [],
  controls: [],
  evidence: [],
  users: [],
  auditors: [],
  todos: [],
  frameworks: [],

  // Loading states
  loading: {
    organizationData: false,
    projects: false,
    risks: false,
    controls: false,
    evidence: false,
    users: false,
    auditors: false,
    todos: false,
    frameworks: false,
  },

  // Error states
  errors: {
    organizationData: null,
    projects: null,
    risks: null,
    controls: null,
    evidence: null,
    users: null,
    auditors: null,
    todos: null,
    frameworks: null,
  },

  // Cache metadata
  lastUpdated: null,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
};

// Reducer function
function complianceReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.value,
        },
        loading: {
          ...state.loading,
          [action.payload.key]: false,
        },
      };

    case ActionTypes.SET_PROJECTS:
      console.log(
        "🔍 SET_PROJECTS reducer - Setting projects:",
        action.payload.length
      );
      return {
        ...state,
        projects: action.payload,
        loading: {
          ...state.loading,
          projects: false,
        },
        errors: {
          ...state.errors,
          projects: null,
        },
      };

    case ActionTypes.SET_RISKS:
      return {
        ...state,
        risks: action.payload,
        loading: {
          ...state.loading,
          risks: false,
        },
        errors: {
          ...state.errors,
          risks: null,
        },
      };

    case ActionTypes.SET_CONTROLS:
      console.log(
        "🔍 SET_CONTROLS reducer - Setting controls:",
        action.payload.length
      );
      return {
        ...state,
        controls: action.payload,
        loading: {
          ...state.loading,
          controls: false,
        },
        errors: {
          ...state.errors,
          controls: null,
        },
      };

    case ActionTypes.SET_EVIDENCE:
      console.log(
        "🔍 SET_EVIDENCE reducer - Setting evidence:",
        action.payload.length
      );
      return {
        ...state,
        evidence: action.payload,
        loading: {
          ...state.loading,
          evidence: false,
        },
        errors: {
          ...state.errors,
          evidence: null,
        },
      };

    case ActionTypes.SET_USERS:
      return {
        ...state,
        users: action.payload,
        loading: {
          ...state.loading,
          users: false,
        },
        errors: {
          ...state.errors,
          users: null,
        },
      };

    case ActionTypes.SET_AUDITORS:
      return {
        ...state,
        auditors: action.payload,
        loading: {
          ...state.loading,
          auditors: false,
        },
        errors: {
          ...state.errors,
          auditors: null,
        },
      };

    case ActionTypes.SET_TODOS:
      return {
        ...state,
        todos: action.payload,
        loading: {
          ...state.loading,
          todos: false,
        },
        errors: {
          ...state.errors,
          todos: null,
        },
      };

    case ActionTypes.SET_FRAMEWORKS:
      return {
        ...state,
        frameworks: action.payload,
        loading: {
          ...state.loading,
          frameworks: false,
        },
        errors: {
          ...state.errors,
          frameworks: null,
        },
      };

    case ActionTypes.UPDATE_ORGANIZATION_DATA:
      return {
        ...state,
        organizationData: {
          ...state.organizationData,
          ...action.payload,
        },
        lastUpdated: Date.now(),
      };

    case ActionTypes.CLEAR_ERRORS:
      return {
        ...state,
        errors: initialState.errors,
      };

    case ActionTypes.RESET_STATE:
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

// Provider component
export function ComplianceProvider({ children }) {
  const [state, dispatch] = useReducer(complianceReducer, initialState);
  const { fetchWithAuth, user } = useAuth();
  const cacheRef = useRef({});
  const isCalculatingRef = useRef(false);
  const projectsRef = useRef([]);
  const isFetchingRef = useRef(false);

  // Update projects ref when state changes
  useEffect(() => {
    projectsRef.current = state.projects;
  }, [state.projects]);

  // Helper function to set loading state
  const setLoading = useCallback((key, value) => {
    dispatch({
      type: ActionTypes.SET_LOADING,
      payload: { key, value },
    });
  }, []);

  // Helper function to set error state
  const setError = useCallback((key, error) => {
    dispatch({
      type: ActionTypes.SET_ERROR,
      payload: { key, value: error },
    });
  }, []);

  // Fetch projects data
  const fetchProjects = useCallback(async () => {
    if (!user?.organization) return;

    setLoading("projects", true);
    try {
      const response = await fetchWithAuth("/api/projects/");
      if (response.ok) {
        const projects = await response.json();
        // Filter projects by user's organization
        const orgProjects = projects.filter(
          (project) =>
            project.organization === user.organization.id ||
            project.organization_name === user.organization.name
        );
        console.log(
          "🔍 fetchProjects - Setting projects in state:",
          orgProjects.length
        );
        dispatch({ type: ActionTypes.SET_PROJECTS, payload: orgProjects });
        projectsRef.current = orgProjects; // Update ref
        console.log(
          "🔍 fetchProjects - projectsRef.current updated:",
          projectsRef.current.length
        );
      } else {
        setError("projects", "Failed to fetch projects");
      }
    } catch (error) {
      setError("projects", error.message);
    }
  }, [fetchWithAuth, user, setLoading, setError]);

  // Fetch risks data
  const fetchRisks = useCallback(async () => {
    if (!user?.organization) return;

    setLoading("risks", true);
    try {
      const response = await fetchWithAuth("/api/auditing/risks/");
      if (response.ok) {
        const risks = await response.json();
        // Backend already filters risks by user's organization, so no need to filter again
        dispatch({ type: ActionTypes.SET_RISKS, payload: risks });
      } else {
        setError("risks", "Failed to fetch risks");
      }
    } catch (error) {
      setError("risks", error.message);
    }
  }, [fetchWithAuth, user, setLoading, setError]);

  // Fetch controls data (aggregated from all projects)
  const fetchControls = useCallback(async () => {
    console.log(
      "🔍 fetchControls called - user?.organization:",
      user?.organization
    );
    if (!user?.organization) {
      console.log("🔍 fetchControls - No user organization, returning");
      return;
    }

    setLoading("controls", true);
    try {
      const allControls = [];
      console.log(
        "🔍 fetchControls - projectsRef.current:",
        projectsRef.current.length
      );

      // Fetch controls for each project
      for (const project of projectsRef.current) {
        try {
          const response = await fetchWithAuth(
            `/api/projects/${project.id}/controls/`
          );
          if (response.ok) {
            const projectControls = await response.json();

            // Fetch auditor reviews for each control
            const controlsWithReviews = await Promise.all(
              projectControls.map(async (control) => {
                try {
                  const reviewsResponse = await fetchWithAuth(
                    `/api/controls/${control.id}/reviews/`
                  );
                  let auditorReviews = [];
                  if (reviewsResponse.ok) {
                    auditorReviews = await reviewsResponse.json();
                  }

                  return {
                    ...control,
                    project_id: project.id,
                    project_name: project.name,
                    auditor_reviews: auditorReviews,
                  };
                } catch (error) {
                  console.warn(
                    `Failed to fetch reviews for control ${control.id}:`,
                    error
                  );
                  return {
                    ...control,
                    project_id: project.id,
                    project_name: project.name,
                    auditor_reviews: [],
                  };
                }
              })
            );

            allControls.push(...controlsWithReviews);
          }
        } catch (error) {
          console.warn(
            `Failed to fetch controls for project ${project.id}:`,
            error
          );
        }
      }

      console.log("🔍 fetchControls - allControls:", allControls.length);

      // Debug: Check if any controls have auditor reviews
      const controlsWithReviews = allControls.filter(
        (c) => c.auditor_reviews && c.auditor_reviews.length > 0
      );
      console.log(
        "🔍 fetchControls - Controls with auditor reviews:",
        controlsWithReviews.length
      );
      if (controlsWithReviews.length > 0) {
        console.log("🔍 fetchControls - Sample control with reviews:", {
          id: controlsWithReviews[0].id,
          title: controlsWithReviews[0].title,
          reviews: controlsWithReviews[0].auditor_reviews.map((r) => ({
            id: r.id,
            status: r.status,
            title: r.title,
          })),
        });

        // Debug: Show all controls with auditor reviews and their statuses
        console.log("🔍 ALL CONTROLS WITH AUDITOR REVIEWS:");
        controlsWithReviews.forEach((control) => {
          console.log(`🔍 Control ${control.id} (${control.clause_number}):`, {
            title: control.title,
            auditorReviews:
              control.auditor_reviews?.map((review) => ({
                id: review.id,
                status: review.status,
                reviewer: review.reviewer_name,
                created_at: review.created_at,
              })) || [],
          });
        });
      }

      dispatch({ type: ActionTypes.SET_CONTROLS, payload: allControls });
    } catch (error) {
      setError("controls", error.message);
    }
  }, [fetchWithAuth, user, setLoading, setError]); // Remove state.projects from dependencies

  // Fetch evidence data (aggregated from all projects)
  const fetchEvidence = useCallback(async () => {
    console.log(
      "🔍 fetchEvidence called - user?.organization:",
      user?.organization
    );
    if (!user?.organization) {
      console.log("🔍 fetchEvidence - No user organization, returning");
      return;
    }

    setLoading("evidence", true);
    try {
      const allEvidence = [];
      console.log(
        "🔍 fetchEvidence - projectsRef.current:",
        projectsRef.current.length
      );

      // Fetch evidence for each project
      for (const project of projectsRef.current) {
        try {
          const response = await fetchWithAuth(
            `/api/projects/${project.id}/evidence/`
          );
          if (response.ok) {
            const projectEvidence = await response.json();
            allEvidence.push(
              ...projectEvidence.map((evidence) => ({
                ...evidence,
                project_id: project.id,
                project_name: project.name,
              }))
            );
          }
        } catch (error) {
          console.warn(
            `Failed to fetch evidence for project ${project.id}:`,
            error
          );
        }
      }

      console.log("🔍 fetchEvidence - allEvidence:", allEvidence.length);
      dispatch({ type: ActionTypes.SET_EVIDENCE, payload: allEvidence });
    } catch (error) {
      setError("evidence", error.message);
    }
  }, [fetchWithAuth, user, setLoading, setError]); // Remove state.projects from dependencies

  // Fetch users data
  const fetchUsers = useCallback(async () => {
    if (!user?.organization) return;

    setLoading("users", true);
    try {
      const response = await fetchWithAuth("/api/accounts/users/");
      if (response.ok) {
        const users = await response.json();
        // Filter users by user's organization
        const orgUsers = users.filter(
          (userItem) =>
            userItem.organization === user.organization.id ||
            userItem.organization_name === user.organization.name
        );
        dispatch({ type: ActionTypes.SET_USERS, payload: orgUsers });
      } else {
        setError("users", "Failed to fetch users");
      }
    } catch (error) {
      setError("users", error.message);
    }
  }, [fetchWithAuth, user, setLoading, setError]);

  // Fetch auditors data
  const fetchAuditors = useCallback(async () => {
    if (!user?.organization) return;

    setLoading("auditors", true);
    try {
      const response = await fetchWithAuth("/api/accounts/auditors/");
      if (response.ok) {
        const auditors = await response.json();
        // Filter auditors by user's organization
        const orgAuditors = auditors.filter(
          (auditor) =>
            auditor.organization === user.organization.id ||
            auditor.organization_name === user.organization.name
        );
        dispatch({ type: ActionTypes.SET_AUDITORS, payload: orgAuditors });
      } else {
        setError("auditors", "Failed to fetch auditors");
      }
    } catch (error) {
      setError("auditors", error.message);
    }
  }, [fetchWithAuth, user, setLoading, setError]);

  // Fetch todos data
  const fetchTodos = useCallback(async () => {
    if (!user?.organization) return;

    setLoading("todos", true);
    try {
      const response = await fetchWithAuth("/api/auditing/todos/");
      if (response.ok) {
        const todos = await response.json();
        // Filter todos by user's organization (if applicable)
        const orgTodos = todos.filter(
          (todo) =>
            !todo.project ||
            projectsRef.current.some((project) => project.id === todo.project)
        );
        dispatch({ type: ActionTypes.SET_TODOS, payload: orgTodos });
      } else {
        setError("todos", "Failed to fetch todos");
      }
    } catch (error) {
      setError("todos", error.message);
    }
  }, [fetchWithAuth, user, setLoading, setError]); // Remove state.projects from dependencies

  // Fetch frameworks data
  const fetchFrameworks = useCallback(async () => {
    setLoading("frameworks", true);
    try {
      const response = await fetchWithAuth("/api/frameworks/");
      if (response.ok) {
        const frameworks = await response.json();
        dispatch({ type: ActionTypes.SET_FRAMEWORKS, payload: frameworks });
      } else {
        setError("frameworks", "Failed to fetch frameworks");
      }
    } catch (error) {
      setError("frameworks", error.message);
    }
  }, [fetchWithAuth, setLoading, setError]);

  // Calculate organization-level aggregated data
  const calculateOrganizationData = useCallback(() => {
    if (isCalculatingRef.current) return;
    isCalculatingRef.current = true;

    try {
      const now = Date.now();
      const { projects, risks, controls, evidence, users, auditors, todos } =
        state;

      console.log("🔍 calculateOrganizationData - State data lengths:", {
        projects: projects.length,
        risks: risks.length,
        controls: controls.length,
        evidence: evidence.length,
        users: users.length,
        auditors: auditors.length,
        todos: todos.length,
      });

      // Create a cache key that includes data lengths to ensure cache invalidation when data changes
      const cacheKey = `organizationData_${projects.length}_${risks.length}_${controls.length}_${evidence.length}_${users.length}_${auditors.length}_${todos.length}`;

      // Check cache
      if (
        cacheRef.current[cacheKey] &&
        now - cacheRef.current[cacheKey].timestamp < state.cacheExpiry
      ) {
        console.log(
          "🔍 calculateOrganizationData - Using cached data for key:",
          cacheKey
        );
        dispatch({
          type: ActionTypes.UPDATE_ORGANIZATION_DATA,
          payload: cacheRef.current[cacheKey].data,
        });
        isCalculatingRef.current = false;
        return;
      }

      console.log(
        "🔍 calculateOrganizationData - Cache miss, recalculating for key:",
        cacheKey
      );

      // Debug logging
      console.log("🔍 ComplianceContext - calculateOrganizationData:", {
        projects: projects.length,
        risks: risks.length,
        controls: controls.length,
        evidence: evidence.length,
        users: users.length,
        auditors: auditors.length,
        todos: todos.length,
      });

      // Calculate basic counts
      const totalProjects = projects.length;
      const totalRisks = risks.length;
      const totalControls = controls.length;
      const totalEvidence = evidence.length;
      const totalUsers = users.length;
      const totalAuditors = auditors.length;
      const totalTodos = todos.length;

      console.log("🔍 calculateOrganizationData - Input data lengths:", {
        projects: projects.length,
        risks: risks.length,
        controls: controls.length,
        evidence: evidence.length,
        users: users.length,
        auditors: auditors.length,
        todos: todos.length,
      });

      // Calculate project status breakdown
      const projectStatusBreakdown = projects.reduce(
        (acc, project) => {
          const status = project.status || "Not Started";
          if (status === "Completed") acc.completed++;
          else if (status === "In Progress") acc.inProgress++;
          else acc.notStarted++;
          return acc;
        },
        { completed: 0, inProgress: 0, notStarted: 0 }
      );

      // Calculate risk status breakdown
      const riskStatusBreakdown = risks.reduce(
        (acc, risk) => {
          const level = risk.risk_level || risk.level || "medium";
          if (level === "low") acc.low++;
          else if (level === "medium") acc.medium++;
          else if (level === "high") acc.high++;
          else if (level === "critical") acc.critical++;
          return acc;
        },
        { low: 0, medium: 0, high: 0, critical: 0 }
      );

      // Calculate control status breakdown based on evidence and auditor reviews
      const controlStatusBreakdown = {
        implemented: 0,
        inProgress: 0,
        notStarted: 0,
      };

      // More accurate calculation based on actual control data
      if (controls.length > 0) {
        console.log(
          "🔍 Control Status Calculation - Sample control:",
          controls[0]
        );
        console.log(
          "🔍 Control Status Calculation - Sample control fields:",
          Object.keys(controls[0])
        );
        console.log(
          "🔍 Control Status Calculation - Sample evidence:",
          evidence[0]
        );
        console.log(
          `🔍 Control Status Calculation - Processing ${controls.length} total controls`
        );
        console.log(
          "🔍 Control Status Calculation - All evidence fields:",
          evidence.slice(0, 3).map((e) => ({
            id: e.id,
            evidence_name: e.evidence_name,
            control_id: e.control_id,
            subcontrol_id: e.subcontrol_id,
            sub_clause: e.sub_clause,
            project_id: e.project_id,
            // Show all available fields
            allFields: Object.keys(e),
          }))
        );

        // Also log the full evidence objects to see the actual structure
        console.log(
          "🔍 Control Status Calculation - Full evidence objects:",
          evidence.slice(0, 2)
        );

        // DEDUPLICATION: Create a map of unique controls by their ID to avoid counting duplicates across projects
        const uniqueControlsMap = new Map();
        controls.forEach((control) => {
          if (!uniqueControlsMap.has(control.id)) {
            uniqueControlsMap.set(control.id, control);
          }
        });
        const uniqueControls = Array.from(uniqueControlsMap.values());

        console.log(
          `🔍 DEDUPLICATION: Total controls: ${
            controls.length
          }, Unique controls: ${uniqueControls.length}, Duplicates removed: ${
            controls.length - uniqueControls.length
          }`
        );

        uniqueControls.forEach((control, index) => {
          // Check if control has evidence
          // Evidence can be linked to controls in two ways:
          // 1. Through clauses (ManyToMany) - e.clauses contains control IDs
          // 2. Through sub_clause (ForeignKey) - e.sub_clause.clause_id matches control.id
          const controlEvidence = evidence.filter((e) => {
            // Check if evidence is linked to this control through clauses
            const linkedThroughClauses =
              e.clauses &&
              e.clauses.some((clauseId) => clauseId === control.id);

            // Check if evidence is linked to this control through sub_clause
            // e.sub_clause is the subcontrol ID, we need to check if this subcontrol belongs to the control
            const linkedThroughSubClause =
              e.sub_clause &&
              control.sub_clauses &&
              control.sub_clauses.some((sub) => sub.id === e.sub_clause);

            return linkedThroughClauses || linkedThroughSubClause;
          });

          // Debug: Log evidence mapping for first few controls
          if (index < 3) {
            console.log(
              `🔍 Evidence mapping for Control ${index} (ID: ${control.id}):`,
              {
                controlId: control.id,
                controlTitle: control.title,
                evidenceMatches: controlEvidence.length,
                evidenceIds: controlEvidence.map((e) => e.id),
                evidenceControlIds: controlEvidence
                  .map((e) => e.clauses || [])
                  .flat(),
              }
            );
          }

          if (index < 2) {
            // Debug first 2 controls
            console.log(
              `🔍 Evidence mapping for Control ${index} (ID: ${control.id}):`,
              {
                controlId: control.id,
                controlTitle: control.title,
                evidenceMatches: controlEvidence.length,
                evidenceIds: controlEvidence.map((e) => e.id),
                // Show what we're trying to match - CORRECTED FIELDS
                evidenceControlIds: evidence.slice(0, 3).map((e) => ({
                  id: e.id,
                  clauses: e.clauses, // ManyToMany field
                  sub_clause: e.sub_clause, // ForeignKey field
                  sub_clause_number: e.sub_clause_number, // Serialized field
                })),
              }
            );
          }

          // Check if control has auditor reviews
          const hasAuditorReview =
            control.auditor_reviews && control.auditor_reviews.length > 0;

          if (index < 3) {
            // Debug first 3 controls
            console.log(`🔍 Control ${index}:`, {
              id: control.id,
              title: control.title || control.name,
              hasAuditorReview,
              auditorReviews: control.auditor_reviews,
              evidenceCount: controlEvidence.length,
              evidence: controlEvidence,
              sub_clauses: control.sub_clauses,
            });
          }

          // CORRECTED LOGIC: A control is only "implemented" when ALL its subcontrols are implemented
          let controlStatus = "Not Started";

          if (control.sub_clauses && control.sub_clauses.length > 0) {
            // PRIORITY 1: Controls with subcontrols - check if ALL subcontrols have evidence AND auditor review as "Accepted"
            const totalSubcontrols = control.sub_clauses.length;
            let implementedSubcontrols = 0;
            let inProgressSubcontrols = 0;

            // For each subcontrol, check if it has evidence AND auditor review as "Accepted"
            control.sub_clauses.forEach((subcontrol) => {
              const subcontrolEvidence = evidence.filter((e) => {
                // Check if evidence is linked to this subcontrol through sub_clause
                const linkedThroughSubClause = e.sub_clause === subcontrol.id;

                // Check if evidence is linked to this subcontrol through clauses (ManyToMany)
                const linkedThroughClauses =
                  e.clauses &&
                  e.clauses.some((clauseId) => clauseId === subcontrol.id);

                // Check if evidence is linked to this subcontrol through localStorage mapping
                const localStorageKey = `evidenceMapping_${control.project_id}_${control.id}`;
                const localStorageMapping =
                  localStorage.getItem(localStorageKey);
                let linkedThroughLocalStorage = false;

                if (localStorageMapping) {
                  try {
                    const mapping = JSON.parse(localStorageMapping);
                    // localStorage stores mapping as array of [key, value] pairs from Map.entries()
                    // where key is evidenceId and value is subcontrolId
                    linkedThroughLocalStorage = mapping.some(
                      ([evidenceId, subcontrolId]) =>
                        evidenceId === e.id && subcontrolId === subcontrol.id
                    );
                  } catch (error) {
                    console.warn(
                      "Failed to parse localStorage mapping:",
                      error
                    );
                  }
                }

                return (
                  linkedThroughSubClause ||
                  linkedThroughClauses ||
                  linkedThroughLocalStorage
                );
              });

              // Check if this subcontrol has auditor reviews
              const subcontrolReviews = control.auditor_reviews
                ? control.auditor_reviews.filter(
                    (review) =>
                      review.sub_clause &&
                      review.sub_clause.id === subcontrol.id
                  )
                : [];

              // Smart fallback logic: Use control-level reviews only if:
              // 1. No subcontrol-specific reviews exist, AND
              // 2. The control has evidence (indicating it's been worked on)
              const hasSubcontrolSpecificReviews = subcontrolReviews.length > 0;
              const hasControlLevelReviews =
                control.auditor_reviews && control.auditor_reviews.length > 0;
              const hasEvidence = subcontrolEvidence.length > 0;

              let effectiveReviews = subcontrolReviews;

              if (
                !hasSubcontrolSpecificReviews &&
                hasControlLevelReviews &&
                hasEvidence
              ) {
                // Fallback to control-level reviews only when appropriate
                effectiveReviews = control.auditor_reviews || [];
              }

              const subcontrolAcceptedReview = effectiveReviews.some(
                (r) => r.status === "Accepted"
              );

              // Debug each subcontrol
              if (index < 2) {
                console.log(
                  `🔍 Subcontrol ${subcontrol.id} (${subcontrol.title}):`,
                  {
                    subcontrolId: subcontrol.id,
                    subcontrolTitle: subcontrol.title,
                    evidenceCount: subcontrolEvidence.length,
                    hasAcceptedReview: subcontrolAcceptedReview,
                    evidenceIds: subcontrolEvidence.map((e) => e.id),
                    reviewStatuses: subcontrolReviews.map((r) => r.status),
                    // Debug evidence structure
                    sampleEvidence:
                      subcontrolEvidence.length > 0
                        ? {
                            id: subcontrolEvidence[0].id,
                            sub_clause: subcontrolEvidence[0].sub_clause,
                            clauses: subcontrolEvidence[0].clauses,
                            sub_clause_number:
                              subcontrolEvidence[0].sub_clause_number,
                          }
                        : null,
                    // Debug all evidence for this control
                    allEvidenceForControl: evidence
                      .filter(
                        (e) =>
                          e.clauses &&
                          e.clauses.some((clauseId) => clauseId === control.id)
                      )
                      .slice(0, 2)
                      .map((e) => ({
                        id: e.id,
                        sub_clause: e.sub_clause,
                        clauses: e.clauses,
                        sub_clause_number: e.sub_clause_number,
                      })),
                    // Debug localStorage mapping
                    localStorageKey: `evidenceMapping_${control.project_id}_${control.id}`,
                    localStorageMapping: (() => {
                      const key = `evidenceMapping_${control.project_id}_${control.id}`;
                      const mapping = localStorage.getItem(key);
                      if (mapping) {
                        try {
                          const parsed = JSON.parse(mapping);
                          // Filter for entries where subcontrolId matches
                          return parsed.filter(
                            ([, subcontrolId]) => subcontrolId === subcontrol.id
                          );
                        } catch {
                          return null;
                        }
                      }
                      return null;
                    })(),
                  }
                );
              }

              // Use the same logic as ProjectControlContext.jsx - only consider auditor reviews
              if (subcontrolAcceptedReview) {
                // Subcontrol has accepted review - consider it implemented
                implementedSubcontrols++;
              } else if (
                subcontrolReviews.some(
                  (r) =>
                    r.status === "Pending Updates" || r.status === "Rejected"
                )
              ) {
                // Subcontrol has pending or rejected review - consider it in progress
                inProgressSubcontrols++;
              }
            });

            // Debug logging for subcontrol analysis
            if (index < 2) {
              console.log(
                `🔍 Control ${index} Subcontrol Analysis (PRIORITY 1):`,
                {
                  controlId: control.id,
                  controlTitle: control.title,
                  totalSubcontrols,
                  implementedSubcontrols,
                  inProgressSubcontrols,
                  allSubcontrolsHaveEvidenceAndAcceptedReview:
                    implementedSubcontrols === totalSubcontrols,
                  subcontrols: control.sub_clauses.map((sub) => ({
                    id: sub.id,
                    title: sub.title,
                    hasEvidence: evidence.some(
                      (e) => e.sub_clause && e.sub_clause.id === sub.id
                    ),
                    hasAcceptedReview:
                      control.auditor_reviews &&
                      control.auditor_reviews.some(
                        (review) =>
                          review.sub_clause &&
                          review.sub_clause.id === sub.id &&
                          review.status === "Accepted"
                      ),
                  })),
                }
              );
            }

            // A control is "implemented" when ALL its subcontrols have "Accepted" auditor review (regardless of evidence)
            if (
              implementedSubcontrols === totalSubcontrols &&
              totalSubcontrols > 0
            ) {
              controlStatus = "Implemented";
              console.log(
                `🔍 Control ${control.id} (${control.clause_number}) marked as IMPLEMENTED - All ${totalSubcontrols} subcontrols have accepted reviews`
              );
            } else if (
              implementedSubcontrols > 0 ||
              inProgressSubcontrols > 0
            ) {
              controlStatus = "In Progress";
            }
          } else if (hasAuditorReview) {
            // PRIORITY 2: Controls without subcontrols - check if control has "Accepted" auditor review (regardless of evidence)
            const hasControlAcceptedReview = control.auditor_reviews.some(
              (r) => r.status === "Accepted"
            );
            const hasControlPendingReview = control.auditor_reviews.some(
              (r) => r.status === "Pending Updates"
            );
            const hasControlRejectedReview = control.auditor_reviews.some(
              (r) => r.status === "Rejected"
            );

            // Control is "Implemented" when it has "Accepted" auditor review (regardless of evidence)
            if (hasControlAcceptedReview) {
              controlStatus = "Implemented";
              console.log(
                `🔍 Control ${control.id} (${control.clause_number}) marked as IMPLEMENTED - Has accepted auditor review`
              );
            } else if (hasControlPendingReview) {
              controlStatus = "In Progress";
            } else if (hasControlRejectedReview) {
              controlStatus = "Not Started";
            }
          } else {
            // Controls without auditor reviews = "In Progress" (regardless of evidence) but NOT "Implemented"
            controlStatus = "In Progress";
          }

          // Debug final control status
          if (index < 3) {
            console.log(`🔍 Control ${index} Final Status:`, {
              controlId: control.id,
              controlTitle: control.title,
              finalStatus: controlStatus,
              hasAuditorReview,
              hasSubcontrols:
                control.sub_clauses && control.sub_clauses.length > 0,
              subcontrolCount: control.sub_clauses
                ? control.sub_clauses.length
                : 0,
              evidenceCount: controlEvidence.length,
              priority:
                control.sub_clauses && control.sub_clauses.length > 0
                  ? "PRIORITY 1: Subcontrol-based (Evidence + Accepted Review)"
                  : hasAuditorReview
                  ? "PRIORITY 2: Control-based (Evidence + Accepted Review)"
                  : "NO AUDITOR REVIEW: In Progress (not Implemented)",
              logic:
                control.sub_clauses && control.sub_clauses.length > 0
                  ? "ALL subcontrols need evidence AND accepted review"
                  : hasAuditorReview
                  ? "Control needs evidence AND accepted review"
                  : "No auditor review = In Progress (regardless of evidence)",
            });
          }

          // Count the control based on its final status
          if (controlStatus === "Implemented") {
            controlStatusBreakdown.implemented++;
          } else if (controlStatus === "In Progress") {
            controlStatusBreakdown.inProgress++;
          } else {
            controlStatusBreakdown.notStarted++;
          }
        });

        console.log(
          "🔍 Final Control Status Breakdown:",
          controlStatusBreakdown
        );
      } else {
        // Fallback: estimate based on evidence and projects
        console.log("🔍 No controls found, using fallback estimation");
        console.log("🔍 Fallback - controls.length:", controls.length);
        console.log("🔍 Fallback - controls data:", controls);
        projects.forEach((project) => {
          const projectEvidence = evidence.filter(
            (e) => e.project_id === project.id
          );

          if (projectEvidence.length > 0) {
            // If there's evidence, estimate some controls as implemented
            const estimatedImplemented = Math.min(
              Math.ceil(projectEvidence.length / 3), // More conservative estimate
              10 // Cap at 10 per project
            );
            controlStatusBreakdown.implemented += estimatedImplemented;

            // Estimate some as in progress
            const estimatedInProgress = Math.min(
              Math.ceil(projectEvidence.length / 5),
              5 // Cap at 5 per project
            );
            controlStatusBreakdown.inProgress += estimatedInProgress;
          }
        });

        console.log(
          "🔍 Fallback Control Status Breakdown:",
          controlStatusBreakdown
        );
      }

      console.log("🔍 Control Status Breakdown:", controlStatusBreakdown);

      // Debug: Show ALL controls and their calculated statuses
      if (controls.length > 0) {
        console.log("🔍 ALL CONTROLS STATUS CALCULATION:");

        const allControlsWithStatus = controls.map((control) => {
          const hasAuditorReview =
            control.auditor_reviews && control.auditor_reviews.length > 0;
          const hasSubcontrols =
            control.sub_clauses && control.sub_clauses.length > 0;

          let calculatedStatus = "Not Started";

          if (hasSubcontrols) {
            // PRIORITY 1: Controls with subcontrols
            const totalSubcontrols = control.sub_clauses.length;
            let implementedSubcontrols = 0;

            control.sub_clauses.forEach((subcontrol) => {
              // Check if this subcontrol has accepted auditor review
              const hasSubcontrolAcceptedReview =
                control.auditor_reviews &&
                control.auditor_reviews.some(
                  (review) =>
                    review.sub_clause &&
                    review.sub_clause.id === subcontrol.id &&
                    review.status === "Accepted"
                );

              if (hasSubcontrolAcceptedReview) {
                implementedSubcontrols++;
              }
            });

            if (
              implementedSubcontrols === totalSubcontrols &&
              totalSubcontrols > 0
            ) {
              calculatedStatus = "Implemented";
            } else if (implementedSubcontrols > 0) {
              calculatedStatus = "In Progress";
            }
          } else if (hasAuditorReview) {
            // PRIORITY 2: Controls without subcontrols
            const hasControlAcceptedReview = control.auditor_reviews.some(
              (review) => review.status === "Accepted"
            );
            if (hasControlAcceptedReview) {
              calculatedStatus = "Implemented";
            } else {
              calculatedStatus = "In Progress";
            }
          } else {
            calculatedStatus = "In Progress"; // No auditor review = In Progress
          }

          return {
            id: control.id,
            title: control.title,
            clause_number: control.clause_number,
            calculatedStatus,
            hasSubcontrols,
            hasAuditorReview,
            auditorReviews:
              control.auditor_reviews?.map((review) => ({
                status: review.status,
                reviewer: review.reviewer_name,
                sub_clause_id: review.sub_clause?.id,
              })) || [],
            subcontrols:
              control.sub_clauses?.map((sub) => ({
                id: sub.id,
                title: sub.title,
                hasAcceptedReview:
                  control.auditor_reviews?.some(
                    (review) =>
                      review.sub_clause &&
                      review.sub_clause.id === sub.id &&
                      review.status === "Accepted"
                  ) || false,
              })) || [],
          };
        });

        console.log(
          "🔍 ALL CONTROLS WITH CALCULATED STATUSES:",
          allControlsWithStatus
        );

        // Show only implemented controls
        const implementedControls = allControlsWithStatus.filter(
          (control) => control.calculatedStatus === "Implemented"
        );

        console.log(
          "🔍 IMPLEMENTED CONTROLS DETAILS:",
          implementedControls.map((control) => ({
            id: control.id,
            title: control.title,
            clause_number: control.clause_number,
            hasSubcontrols: control.hasSubcontrols,
            auditorReviews: control.auditorReviews,
            subcontrols: control.subcontrols,
          }))
        );

        // Debug: Compare debugging calculation vs main calculation
        console.log("🔍 DEBUGGING vs MAIN CALCULATION COMPARISON:");
        console.log(
          "🔍 Debugging calculation - Implemented controls:",
          implementedControls.length
        );
        console.log(
          "🔍 Main calculation - Implemented controls:",
          controlStatusBreakdown.implemented
        );
        console.log(
          "🔍 Difference:",
          controlStatusBreakdown.implemented - implementedControls.length
        );

        // Debug: Show the actual control status breakdown calculation
        console.log("🔍 ACTUAL CONTROL STATUS CALCULATION:");
        console.log("🔍 Total controls processed:", controls.length);
        console.log(
          "🔍 Controls with auditor reviews:",
          controls.filter(
            (c) => c.auditor_reviews && c.auditor_reviews.length > 0
          ).length
        );
        console.log(
          "🔍 Controls with subcontrols:",
          controls.filter((c) => c.sub_clauses && c.sub_clauses.length > 0)
            .length
        );
        console.log(
          "🔍 Controls without subcontrols:",
          controls.filter((c) => !c.sub_clauses || c.sub_clauses.length === 0)
            .length
        );
      }

      // Calculate framework-specific compliance breakdown
      const frameworkComplianceBreakdown = [];

      if (controls.length > 0) {
        // Group controls by framework
        const controlsByFramework = {};

        controls.forEach((control) => {
          const frameworkId = control.framework_id || control.framework;
          const frameworkName =
            control.framework_name || `Framework ${frameworkId}`;

          console.log(
            `🔍 Control ${control.id} (${control.title}) - frameworkId: ${frameworkId}, frameworkName: ${frameworkName}, projectId: ${control.project_id}`
          );

          if (!controlsByFramework[frameworkId]) {
            controlsByFramework[frameworkId] = {
              frameworkId,
              frameworkName,
              controls: [],
              breakdown: { implemented: 0, inProgress: 0, notStarted: 0 },
            };
          }
          controlsByFramework[frameworkId].controls.push(control);
        });

        console.log(`🔍 Total controls processed: ${controls.length} controls`);
        console.log(
          "🔍 Controls grouped by framework:",
          Object.keys(controlsByFramework).map((id) => ({
            frameworkId: id,
            frameworkName: controlsByFramework[id].frameworkName,
            controlCount: controlsByFramework[id].controls.length,
          }))
        );

        // Calculate compliance breakdown for each framework
        Object.values(controlsByFramework).forEach((frameworkData) => {
          console.log(
            `🔍 Processing Framework: ${frameworkData.frameworkName} (ID: ${frameworkData.frameworkId}) with ${frameworkData.controls.length} controls`
          );

          frameworkData.controls.forEach((control) => {
            // Use the already calculated control status from the main loop
            // We need to re-run the same logic to get the status for this specific control
            let controlStatus = "Not Started";

            if (control.sub_clauses && control.sub_clauses.length > 0) {
              // PRIORITY 1: Controls with subcontrols - check if ALL subcontrols have "Accepted" auditor review (regardless of evidence)
              const totalSubcontrols = control.sub_clauses.length;
              let implementedSubcontrols = 0;

              control.sub_clauses.forEach((subcontrol) => {
                const hasSubcontrolAcceptedReview =
                  control.auditor_reviews &&
                  control.auditor_reviews.some(
                    (review) =>
                      review.sub_clause &&
                      review.sub_clause.id === subcontrol.id &&
                      review.status === "Accepted"
                  );

                if (hasSubcontrolAcceptedReview) {
                  implementedSubcontrols++;
                }
              });

              if (
                implementedSubcontrols === totalSubcontrols &&
                totalSubcontrols > 0
              ) {
                controlStatus = "Implemented";
              } else if (implementedSubcontrols > 0) {
                controlStatus = "In Progress";
              }
            } else if (
              control.auditor_reviews &&
              control.auditor_reviews.length > 0
            ) {
              // PRIORITY 2: Controls without subcontrols - check if control has "Accepted" auditor review (regardless of evidence)
              const hasControlAcceptedReview = control.auditor_reviews.some(
                (review) => review.status === "Accepted"
              );

              if (hasControlAcceptedReview) {
                controlStatus = "Implemented";
              } else {
                controlStatus = "In Progress";
              }
            } else {
              // Controls without auditor reviews = "In Progress" (regardless of evidence) but NOT "Implemented"
              controlStatus = "In Progress";
            }

            // Count the control based on its final status
            if (controlStatus === "Implemented") {
              frameworkData.breakdown.implemented++;
            } else if (controlStatus === "In Progress") {
              frameworkData.breakdown.inProgress++;
            } else {
              frameworkData.breakdown.notStarted++;
            }

            console.log(
              `🔍 Control ${control.id} (${control.title}) in ${frameworkData.frameworkName}: ${controlStatus}`
            );
          });

          const frameworkResult = {
            frameworkId: frameworkData.frameworkId,
            frameworkName: frameworkData.frameworkName,
            totalControls: frameworkData.controls.length,
            implemented: frameworkData.breakdown.implemented,
            inProgress: frameworkData.breakdown.inProgress,
            notStarted: frameworkData.breakdown.notStarted,
            compliancePercentage:
              frameworkData.controls.length > 0
                ? Math.round(
                    (frameworkData.breakdown.implemented /
                      frameworkData.controls.length) *
                      100
                  )
                : 0,
          };

          console.log(
            `🔍 Framework ${frameworkData.frameworkName} Result:`,
            frameworkResult
          );

          frameworkComplianceBreakdown.push(frameworkResult);
        });
      }

      console.log(
        "🔍 Framework Compliance Breakdown:",
        frameworkComplianceBreakdown
      );

      // Calculate evidence status breakdown
      const evidenceStatusBreakdown = evidence.reduce(
        (acc, evidenceItem) => {
          const status = evidenceItem.status || "collected";
          if (status === "collected" || status === "approved") acc.collected++;
          else if (status === "pending") acc.pending++;
          else acc.missing++;
          return acc;
        },
        { collected: 0, pending: 0, missing: 0 }
      );

      // Calculate user status breakdown
      const userStatusBreakdown = users.reduce(
        (acc, userItem) => {
          const status = userItem.status || "active";
          if (status === "active") acc.active++;
          else if (status === "pending_approval") acc.pendingApproval++;
          else acc.inactive++;
          return acc;
        },
        { active: 0, pendingApproval: 0, inactive: 0 }
      );

      // Calculate todo status breakdown
      const todoStatusBreakdown = todos.reduce(
        (acc, todo) => {
          const status = todo.status || "Pending";
          if (status === "Pending") acc.pending++;
          else if (status === "Approved") acc.approved++;
          else if (status === "Rejected") acc.rejected++;
          else if (status === "Completed") acc.completed++;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0, completed: 0 }
      );

      // Calculate framework-specific data
      const frameworkData = {};
      projects.forEach((project) => {
        const framework = project.framework || "Unknown";
        if (!frameworkData[framework]) {
          frameworkData[framework] = {
            projects: 0,
            controls: 0,
            evidence: 0,
            risks: 0,
          };
        }
        frameworkData[framework].projects++;
      });

      // Add controls and evidence to framework data
      controls.forEach((control) => {
        const project = projects.find((p) => p.id === control.project_id);
        if (project) {
          const framework = project.framework || "Unknown";
          if (frameworkData[framework]) {
            frameworkData[framework].controls++;
          }
        }
      });

      evidence.forEach((evidenceItem) => {
        const project = projects.find((p) => p.id === evidenceItem.project_id);
        if (project) {
          const framework = project.framework || "Unknown";
          if (frameworkData[framework]) {
            frameworkData[framework].evidence++;
          }
        }
      });

      // Calculate security, privacy, and regulatory scores based on actual data
      // Security score: 70% control implementation + 30% evidence collection
      const controlImplementationRate =
        totalControls > 0
          ? (controlStatusBreakdown.implemented / totalControls) * 100
          : 0;
      const evidenceCollectionRate =
        totalControls > 0
          ? (evidenceStatusBreakdown.collected / totalControls) * 100
          : 0;

      const securityScore = Math.round(
        controlImplementationRate * 0.7 + evidenceCollectionRate * 0.3
      );

      // Privacy score: based on risk management (higher score for lower risk levels)
      let privacyScore = 0;
      if (totalRisks > 0) {
        const riskManagementScore =
          (riskStatusBreakdown.low * 100 +
            riskStatusBreakdown.medium * 75 +
            riskStatusBreakdown.high * 50 +
            riskStatusBreakdown.critical * 25) /
          totalRisks;
        privacyScore = Math.round(riskManagementScore);
      } else {
        privacyScore = 100; // No risks = perfect privacy score
      }

      // Regulatory score: 50% project completion + 50% framework compliance
      const projectCompletionRate =
        totalProjects > 0
          ? (projectStatusBreakdown.completed / totalProjects) * 100
          : 0;
      const frameworkComplianceRate = controlImplementationRate;

      const regulatoryScore = Math.round(
        projectCompletionRate * 0.5 + frameworkComplianceRate * 0.5
      );

      // Calculate overall compliance score (weighted average)
      // Security (40%), Privacy (35%), Regulatory (25%) - as shown in UI
      const complianceScore = Math.round(
        securityScore * 0.4 + privacyScore * 0.35 + regulatoryScore * 0.25
      );

      console.log("🔍 Compliance Score Calculations:", {
        securityScore,
        privacyScore,
        regulatoryScore,
        complianceScore,
        breakdown: {
          controlImplementationRate,
          evidenceCollectionRate,
          projectCompletionRate,
          frameworkComplianceRate,
          riskManagementScore:
            totalRisks > 0
              ? (riskStatusBreakdown.low * 100 +
                  riskStatusBreakdown.medium * 75 +
                  riskStatusBreakdown.high * 50 +
                  riskStatusBreakdown.critical * 25) /
                totalRisks
              : 100,
        },
        data: {
          totalControls,
          totalEvidence,
          totalRisks,
          totalProjects,
          controlStatusBreakdown,
          evidenceStatusBreakdown,
          riskStatusBreakdown,
          projectStatusBreakdown,
        },
      });

      // Generate recent activity (last 30 days)
      const recentActivity = [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Add recent projects
      projects
        .filter(
          (project) =>
            new Date(project.created_at || project.created) > thirtyDaysAgo
        )
        .forEach((project) => {
          recentActivity.push({
            type: "project_created",
            title: `New project created: ${project.name}`,
            timestamp: project.created_at || project.created,
            icon: "FaProjectDiagram",
          });
        });

      // Add recent risks
      risks
        .filter(
          (risk) => new Date(risk.created_at || risk.created) > thirtyDaysAgo
        )
        .forEach((risk) => {
          recentActivity.push({
            type: "risk_created",
            title: `New risk identified: ${risk.title}`,
            timestamp: risk.created_at || risk.created,
            icon: "FaExclamationTriangle",
          });
        });

      // Sort by timestamp
      recentActivity.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Generate monthly trends (mock data for now)
      const monthlyTrends = {
        projects: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(
            Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString("en-US", { month: "short" }),
          count: Math.floor(Math.random() * 5) + 1,
        })),
        risks: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(
            Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString("en-US", { month: "short" }),
          count: Math.floor(Math.random() * 10) + 1,
        })),
        controls: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(
            Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString("en-US", { month: "short" }),
          count: Math.floor(Math.random() * 20) + 5,
        })),
        evidence: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(
            Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString("en-US", { month: "short" }),
          count: Math.floor(Math.random() * 15) + 3,
        })),
      };

      const organizationData = {
        totalProjects,
        totalRisks,
        totalControls,
        totalEvidence,
        totalUsers,
        totalAuditors,
        totalTodos,
        complianceScore,
        securityScore,
        privacyScore,
        regulatoryScore,
        projectStatusBreakdown,
        riskStatusBreakdown,
        controlStatusBreakdown,
        evidenceStatusBreakdown,
        userStatusBreakdown,
        todoStatusBreakdown,
        frameworkData,
        frameworkComplianceBreakdown,
        recentActivity: recentActivity.slice(0, 10), // Limit to 10 most recent
        monthlyTrends,
        lastUpdated: Date.now(), // Add timestamp
      };

      console.log("🔍 Final Organization Data:", {
        totalProjects,
        totalRisks,
        totalControls,
        totalEvidence,
        controlStatusBreakdown,
        evidenceStatusBreakdown,
        complianceScore,
        securityScore,
        privacyScore,
        regulatoryScore,
      });

      // Cache the result
      cacheRef.current[cacheKey] = {
        data: organizationData,
        timestamp: now,
      };

      dispatch({
        type: ActionTypes.UPDATE_ORGANIZATION_DATA,
        payload: organizationData,
      });
    } catch (error) {
      console.error("Error calculating organization data:", error);
    } finally {
      isCalculatingRef.current = false;
    }
  }, [state]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    console.log(
      "🔍 fetchAllData called - user?.organization:",
      user?.organization,
      "isFetchingRef.current:",
      isFetchingRef.current
    );
    if (!user?.organization || isFetchingRef.current) {
      console.log(
        "🔍 fetchAllData - Skipping due to no user organization or already fetching"
      );
      return;
    }

    isFetchingRef.current = true;
    try {
      console.log("🔍 fetchAllData - Starting to fetch all data in parallel");
      // First, fetch independent data in parallel
      await Promise.all([
        fetchProjects(),
        fetchRisks(),
        fetchUsers(),
        fetchAuditors(),
        fetchTodos(),
        fetchFrameworks(),
      ]);
      console.log("🔍 fetchAllData - Completed fetching independent data");
      
      // Then fetch dependent data (controls and evidence) after projects are loaded
      console.log("🔍 fetchAllData - Starting to fetch dependent data");
      await Promise.all([
        fetchControls(),
        fetchEvidence(),
      ]);
      console.log("🔍 fetchAllData - Completed fetching all data including dependent data");
    } catch (error) {
      console.error("Error fetching all data:", error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [
    user,
    fetchProjects,
    fetchRisks,
    fetchUsers,
    fetchAuditors,
    fetchTodos,
    fetchFrameworks,
    fetchControls,
    fetchEvidence,
  ]);

  // Note: fetchControls and fetchEvidence are now called directly in fetchAllData
  // to ensure complete data integration. The previous useEffect has been removed
  // to prevent duplicate fetching and race conditions.

  // Calculate organization data when raw data changes
  useEffect(() => {
    console.log(
      "🔍 useEffect for calculateOrganizationData triggered with state lengths:",
      {
        projects: state.projects.length,
        risks: state.risks.length,
        controls: state.controls.length,
        evidence: state.evidence.length,
        users: state.users.length,
        auditors: state.auditors.length,
        todos: state.todos.length,
      }
    );

    // Only calculate organization data if we have meaningful data
    // Prioritize projects and controls/evidence for complete integration
    const hasProjects = state.projects.length > 0;
    const hasControls = state.controls.length > 0;
    const hasEvidence = state.evidence.length > 0;
    const hasOtherData = state.risks.length > 0 || state.users.length > 0 || state.auditors.length > 0 || state.todos.length > 0;

    if (hasProjects && (hasControls || hasEvidence) || hasOtherData) {
      console.log(
        "🔍 useEffect - Conditions met for complete data integration, scheduling calculateOrganizationData"
      );
      // Add a small delay to ensure all data is properly loaded
      const timeoutId = setTimeout(() => {
        console.log(
          "🔍 useEffect - setTimeout executing, calling calculateOrganizationData with complete data"
        );
        calculateOrganizationData();
      }, 300); // Increased delay to ensure all data is loaded

      return () => clearTimeout(timeoutId);
    } else {
      console.log(
        "🔍 useEffect - Conditions not met for complete data integration, skipping calculateOrganizationData"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.projects.length,
    state.risks.length,
    state.controls.length,
    state.evidence.length,
    state.users.length,
    state.auditors.length,
    state.todos.length,
  ]); // Intentionally exclude calculateOrganizationData to prevent infinite loops

  // Initial data fetch
  useEffect(() => {
    console.log(
      "🔍 Initial data fetch useEffect - user?.organization:",
      user?.organization
    );
    if (user?.organization) {
      console.log("🔍 Initial data fetch - Calling fetchAllData");
      fetchAllData();
    } else {
      console.log(
        "🔍 Initial data fetch - No user organization, skipping fetchAllData"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organization?.id]); // Intentionally exclude fetchAllData to prevent infinite loops

  // Clear errors function
  const clearErrors = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_ERRORS });
  }, []);

  // Reset state function
  const resetState = useCallback(() => {
    dispatch({ type: ActionTypes.RESET_STATE });
    cacheRef.current = {};
  }, []);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    cacheRef.current = {};
    await fetchAllData();
  }, [fetchAllData]);

  // Context value with memoization
  const contextValue = useMemo(
    () => ({
      // State
      ...state,

      // Actions
      fetchProjects,
      fetchRisks,
      fetchControls,
      fetchEvidence,
      fetchUsers,
      fetchAuditors,
      fetchTodos,
      fetchFrameworks,
      fetchAllData,
      refreshAllData,
      calculateOrganizationData,
      clearErrors,
      resetState,

      // Computed values
      isLoading: Object.values(state.loading).some((loading) => loading),
      hasErrors: Object.values(state.errors).some((error) => error !== null),
      isDataStale:
        state.lastUpdated && Date.now() - state.lastUpdated > state.cacheExpiry,
    }),
    [
      state,
      fetchProjects,
      fetchRisks,
      fetchControls,
      fetchEvidence,
      fetchUsers,
      fetchAuditors,
      fetchTodos,
      fetchFrameworks,
      fetchAllData,
      refreshAllData,
      calculateOrganizationData,
      clearErrors,
      resetState,
    ]
  );

  return (
    <ComplianceContext.Provider value={contextValue}>
      {children}
    </ComplianceContext.Provider>
  );
}

// Default export for easier importing
export default ComplianceProvider;
