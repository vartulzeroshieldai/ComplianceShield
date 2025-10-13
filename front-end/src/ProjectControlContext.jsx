// src/ProjectControlContext.jsx
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";

// Action types
const ACTIONS = {
  UPDATE_PROJECT: "UPDATE_PROJECT",
  INITIALIZE_PROJECTS: "INITIALIZE_PROJECTS",
  RESET_PROJECTS: "RESET_PROJECTS",
  UPDATE_PROJECT_FROM_PARENT: "UPDATE_PROJECT_FROM_PARENT",
};

// Initial state
const initialState = {
  projects: [],
  isInitialized: false,
};

// Reducer function
const projectControlReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.INITIALIZE_PROJECTS:
      return {
        ...state,
        projects: action.payload,
        isInitialized: true,
      };

    case ACTIONS.UPDATE_PROJECT:
      if (!action.payload || !action.payload.id) {
        console.warn("UPDATE_PROJECT: Invalid payload", action.payload);
        return state;
      }
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.payload.id
            ? { ...project, ...action.payload }
            : project
        ),
      };

    case ACTIONS.RESET_PROJECTS:
      return {
        ...state,
        projects: [],
        isInitialized: false,
      };

    case ACTIONS.UPDATE_PROJECT_FROM_PARENT:
      if (!action.payload || !action.payload.id) {
        console.warn(
          "UPDATE_PROJECT_FROM_PARENT: Invalid payload",
          action.payload
        );
        return state;
      }
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.payload.id
            ? { ...project, ...action.payload }
            : project
        ),
      };

    default:
      return state;
  }
};

// Create context
const ProjectControlContext = createContext();

// Provider component
export const ProjectControlProvider = ({ children }) => {
  const [state, dispatch] = useReducer(projectControlReducer, initialState);

  // Initialize projects data
  const initializeProjects = useCallback((projects) => {
    dispatch({
      type: ACTIONS.INITIALIZE_PROJECTS,
      payload: projects,
    });
  }, []);

  // Update a specific project
  const updateProject = useCallback((updatedProject) => {
    dispatch({
      type: ACTIONS.UPDATE_PROJECT,
      payload: updatedProject,
    });
  }, []);

  // Reset projects data
  const resetProjects = useCallback(() => {
    dispatch({
      type: ACTIONS.RESET_PROJECTS,
    });
  }, []);

  // Update project from parent component (bypasses child dependency)
  const updateProjectFromParent = useCallback((updatedProject) => {
    dispatch({
      type: ACTIONS.UPDATE_PROJECT_FROM_PARENT,
      payload: updatedProject,
    });
  }, []);

  // Calculate and update project data without requiring child component render
  const calculateAndUpdateProject = useCallback(
    async (projectId, fetchWithAuth) => {
      try {
        // Check if project already exists and has recent data to avoid unnecessary calculations
        const existingProject = state.projects.find((p) => p.id === projectId);
        if (
          existingProject &&
          existingProject.lastCalculated &&
          Date.now() - existingProject.lastCalculated < 5000
        ) {
          // 5 second cache
          console.log(
            `ProjectControlContext - Skipping calculation for project ${projectId} (recently calculated)`
          );
          return;
        }

        console.log(
          `ProjectControlContext - Calculating data for project ${projectId} without child render`
        );

        // Fetch project-level data
        const [controlsRes, evidenceRes, teamMembersRes] = await Promise.all([
          fetchWithAuth(`/api/projects/${projectId}/controls/`),
          fetchWithAuth(`/api/projects/${projectId}/evidence/`),
          fetchWithAuth(`/api/projects/${projectId}/team_members/`),
        ]);

        if (!controlsRes.ok) {
          console.warn(`Failed to fetch controls for project ${projectId}`);
          return;
        }

        const controlsData = await controlsRes.json();
        const evidenceData = evidenceRes.ok ? await evidenceRes.json() : [];
        const teamMembersData = teamMembersRes.ok
          ? await teamMembersRes.json()
          : [];

        // Fetch subcontrols and reviews for each control
        const subcontrolsData = [];
        const reviewsData = [];

        // Fetch subcontrols and reviews for all controls in parallel
        const controlDataPromises = controlsData.map(async (control) => {
          try {
            const [subcontrolsRes, reviewsRes] = await Promise.all([
              fetchWithAuth(`/api/controls/${control.id}/subcontrols/`),
              fetchWithAuth(`/api/controls/${control.id}/reviews/`),
            ]);

            const subcontrols = subcontrolsRes.ok
              ? await subcontrolsRes.json()
              : [];
            const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

            return { control, subcontrols, reviews };
          } catch (error) {
            console.warn(
              `Failed to fetch data for control ${control.id}:`,
              error
            );
            return { control, subcontrols: [], reviews: [] };
          }
        });

        const controlDataResults = await Promise.all(controlDataPromises);

        // Aggregate all subcontrols and reviews
        controlDataResults.forEach(({ subcontrols, reviews }) => {
          subcontrolsData.push(...subcontrols);
          reviewsData.push(...reviews);
        });

        // Calculate project-level metrics
        const totalControls = controlsData.length;
        const totalEvidence = evidenceData.length;
        const totalSubcontrols = subcontrolsData.length;
        const totalTeamMembers = teamMembersData.length;

        // Calculate implementation progress based on control statuses
        let implementedControls = 0;
        let inProgressControls = 0;
        let notStartedControls = 0;

        // Calculate control-level progress using subcontrols and reviews data
        for (const { control, subcontrols, reviews } of controlDataResults) {
          let controlStatus = "Not Started";

          if (subcontrols.length > 0) {
            // Control has subcontrols - calculate based on subcontrol reviews
            let implementedSubcontrols = 0;
            let inProgressSubcontrols = 0;

            for (const subcontrol of subcontrols) {
              const subcontrolReviews = reviews.filter((review) => {
                const reviewControlId =
                  review.control !== undefined ? review.control : control.id;
                if (reviewControlId !== control.id) return false;
                if (
                  review.sub_clause === undefined ||
                  review.sub_clause === null
                )
                  return false;
                return (
                  review.sub_clause === subcontrol.id ||
                  String(review.sub_clause) === String(subcontrol.id) ||
                  Number(review.sub_clause) === Number(subcontrol.id)
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

              if (hasAcceptedReview) {
                implementedSubcontrols++;
              } else if (hasPendingReview || hasRejectedReview) {
                inProgressSubcontrols++;
              }
            }

            // Calculate progress for subcontrols-based controls (not used in current logic)
            // const controlProgress = Math.round(
            //   (implementedSubcontrols / subcontrols.length) * 100
            // );

            if (
              implementedSubcontrols === subcontrols.length &&
              subcontrols.length > 0
            ) {
              controlStatus = "Implemented";
            } else if (
              implementedSubcontrols > 0 ||
              inProgressSubcontrols > 0
            ) {
              controlStatus = "In Progress";
            }
          } else {
            // Control has no subcontrols - check control-level reviews
            const controlLevelReviews = reviews.filter((review) => {
              const reviewControlId =
                review.control !== undefined ? review.control : control.id;
              return (
                reviewControlId === control.id &&
                (review.sub_clause === null || review.sub_clause === undefined)
              );
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

            if (hasControlAcceptedReview) {
              controlStatus = "Implemented";
            } else if (hasControlPendingReview) {
              controlStatus = "In Progress";
            } else if (hasControlRejectedReview) {
              controlStatus = "Not Started";
            }
          }

          // Count controls by status
          if (controlStatus === "Implemented") {
            implementedControls++;
          } else if (controlStatus === "In Progress") {
            inProgressControls++;
          } else {
            notStartedControls++;
          }
        }

        // Calculate overall project progress
        const overallProgress =
          totalControls > 0
            ? Math.round((implementedControls / totalControls) * 100)
            : 0;

        // Determine project status
        let projectStatus = "Not Started";
        if (implementedControls === totalControls && totalControls > 0) {
          projectStatus = "Completed";
        } else if (implementedControls > 0 || inProgressControls > 0) {
          projectStatus = "In Progress";
        }

        // Update the project in context
        const updatedProject = {
          id: projectId,
          progress: overallProgress,
          status: projectStatus,
          controlsData,
          evidenceData,
          subcontrolsData,
          teamMembersData,
          totalControls,
          totalEvidence,
          totalSubcontrols,
          totalTeamMembers,
          implementedControls,
          inProgressControls,
          notStartedControls,
          // Additional metrics for detailed view
          controlsCompleted: implementedControls,
          controlsInProgress: inProgressControls,
          controlsNotStarted: notStartedControls,
          lastCalculated: Date.now(),
        };

        dispatch({
          type: ACTIONS.UPDATE_PROJECT_FROM_PARENT,
          payload: updatedProject,
        });

        console.log(
          `ProjectControlContext - Updated project ${projectId} from parent:`,
          updatedProject
        );
      } catch (error) {
        console.error(
          `Failed to calculate project data for ${projectId}:`,
          error
        );
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      projects: state.projects,
      isInitialized: state.isInitialized,
      initializeProjects,
      updateProject,
      resetProjects,
      updateProjectFromParent,
      calculateAndUpdateProject,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      state.projects,
      state.isInitialized,
      // Callback functions are already memoized with useCallback, no need to include them
    ]
  );

  return (
    <ProjectControlContext.Provider value={value}>
      {children}
    </ProjectControlContext.Provider>
  );
};

// Custom hook to use the context
export const useProjectControl = () => {
  const context = useContext(ProjectControlContext);
  if (!context) {
    throw new Error(
      "useProjectControl must be used within a ProjectControlProvider"
    );
  }
  return context;
};

export default ProjectControlContext;
