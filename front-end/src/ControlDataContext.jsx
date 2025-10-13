// src/ControlDataContext.jsx
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";

// Action types
const ACTIONS = {
  UPDATE_CONTROL: "UPDATE_CONTROL",
  INITIALIZE_CONTROLS: "INITIALIZE_CONTROLS",
  RESET_CONTROLS: "RESET_CONTROLS",
  UPDATE_CONTROL_FROM_PARENT: "UPDATE_CONTROL_FROM_PARENT",
};

// Initial state
const initialState = {
  controls: [],
  isInitialized: false,
};

// Reducer function
const controlDataReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.INITIALIZE_CONTROLS:
      return {
        ...state,
        controls: action.payload,
        isInitialized: true,
      };

    case ACTIONS.UPDATE_CONTROL:
      if (!action.payload || !action.payload.id) {
        console.warn("UPDATE_CONTROL: Invalid payload", action.payload);
        return state;
      }
      return {
        ...state,
        controls: state.controls.map((control) =>
          control.id === action.payload.id
            ? { ...control, ...action.payload }
            : control
        ),
      };

    case ACTIONS.RESET_CONTROLS:
      return {
        ...state,
        controls: [],
        isInitialized: false,
      };

    case ACTIONS.UPDATE_CONTROL_FROM_PARENT:
      if (!action.payload || !action.payload.id) {
        console.warn(
          "UPDATE_CONTROL_FROM_PARENT: Invalid payload",
          action.payload
        );
        return state;
      }
      return {
        ...state,
        controls: state.controls.map((control) =>
          control.id === action.payload.id
            ? { ...control, ...action.payload }
            : control
        ),
      };

    default:
      return state;
  }
};

// Create context
const ControlDataContext = createContext();

// Provider component
export const ControlDataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(controlDataReducer, initialState);

  // Initialize controls data
  const initializeControls = useCallback((controls) => {
    dispatch({
      type: ACTIONS.INITIALIZE_CONTROLS,
      payload: controls,
    });
  }, []);

  // Update a specific control
  const updateControl = useCallback((updatedControl) => {
    dispatch({
      type: ACTIONS.UPDATE_CONTROL,
      payload: updatedControl,
    });
  }, []);

  // Reset controls data
  const resetControls = useCallback(() => {
    dispatch({
      type: ACTIONS.RESET_CONTROLS,
    });
  }, []);

  // Update control from parent component (bypasses child dependency)
  const updateControlFromParent = useCallback((updatedControl) => {
    dispatch({
      type: ACTIONS.UPDATE_CONTROL_FROM_PARENT,
      payload: updatedControl,
    });
  }, []);

  // Calculate and update control data without requiring child component render
  const calculateAndUpdateControl = useCallback(
    async (controlId, projectId, fetchWithAuth) => {
      try {
        // Check if control already exists and has recent data to avoid unnecessary calculations
        const existingControl = state.controls.find((c) => c.id === controlId);
        if (
          existingControl &&
          existingControl.lastCalculated &&
          Date.now() - existingControl.lastCalculated < 5000
        ) {
          // 5 second cache
          console.log(
            `ControlDataContext - Skipping calculation for control ${controlId} (recently calculated)`
          );
          return;
        }

        console.log(
          `ControlDataContext - Calculating data for control ${controlId} without child render`
        );

        // Fetch data directly from APIs
        const [subcontrolsRes, reviewsRes, evidenceRes] = await Promise.all([
          fetchWithAuth(`/api/controls/${controlId}/subcontrols/`),
          fetchWithAuth(`/api/controls/${controlId}/reviews/`),
          fetchWithAuth(`/api/projects/${projectId}/evidence/`),
        ]);

        if (!subcontrolsRes.ok || !reviewsRes.ok || !evidenceRes.ok) {
          console.warn(`Failed to fetch data for control ${controlId}`);
          return;
        }

        const subcontrolsData = await subcontrolsRes.json();
        const reviewsData = await reviewsRes.json();
        const evidenceData = await evidenceRes.json();

        // Load evidence mapping from localStorage
        let evidenceSubcontrolMapping = new Map();
        try {
          const mappingKey = `evidenceMapping_${projectId}_${controlId}`;
          const stored = localStorage.getItem(mappingKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            evidenceSubcontrolMapping = new Map(parsed);
          }
        } catch (error) {
          console.warn("Failed to load evidence mapping:", error);
        }

        // Calculate implementation status
        const totalSubcontrols = subcontrolsData.length;
        let implementedSubcontrols = 0;
        let inProgressSubcontrols = 0;
        let controlImplementationStatus = "Not Started";
        let controlStatusReason = "No implementation progress";

        // Calculate subcontrol implementation status
        subcontrolsData.forEach((sub) => {
          // Count reviews for this subcontrol
          const subcontrolReviews = reviewsData.filter((review) => {
            const reviewControlId =
              review.control !== undefined ? review.control : controlId;
            if (!review || reviewControlId !== controlId) return false;
            if (review.sub_clause === undefined || review.sub_clause === null)
              return false;
            const reviewSubClause = review.sub_clause;
            const subcontrolId = sub.id;
            return (
              reviewSubClause === subcontrolId ||
              String(reviewSubClause) === String(subcontrolId) ||
              Number(reviewSubClause) === Number(subcontrolId)
            );
          });

          // Determine subcontrol status
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
        });

        // Calculate control-level auditor review status
        const controlLevelReviews = reviewsData.filter((review) => {
          const reviewControlId =
            review.control !== undefined ? review.control : controlId;
          if (totalSubcontrols > 0) {
            return (
              reviewControlId === controlId &&
              (review.sub_clause === null || review.sub_clause === undefined)
            );
          } else {
            return reviewControlId === controlId;
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

        // Determine overall control status
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

        // Calculate implementation progress
        let implementationProgress = 0;
        if (totalSubcontrols > 0) {
          implementationProgress = Math.round(
            (implementedSubcontrols / totalSubcontrols) * 100
          );
        } else {
          implementationProgress =
            controlImplementationStatus === "Implemented"
              ? 100
              : controlImplementationStatus === "In Progress"
              ? 50
              : 0;
        }

        // Calculate evidence collection progress
        let evidenceCollectionProgress = 0;
        if (totalSubcontrols > 0) {
          const subcontrolsWithEvidence = subcontrolsData.filter((sub) => {
            const evidenceCount = evidenceData.filter((ev) => {
              const directMatch = ev.sub_clause === sub.id;
              const clauseMatch =
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
                  return clauseId === controlId && ev.sub_clause === sub.id;
                });
              const subClauseMatch =
                ev.sub_clause === sub.id ||
                String(ev.sub_clause) === String(sub.id) ||
                Number(ev.sub_clause) === Number(sub.id);
              const smartFallbackMatch =
                ev.sub_clause === undefined &&
                evidenceSubcontrolMapping.has(ev.id) &&
                evidenceSubcontrolMapping.get(ev.id) === sub.id;
              return (
                directMatch ||
                clauseMatch ||
                subClauseMatch ||
                smartFallbackMatch
              );
            }).length;
            return evidenceCount > 0;
          }).length;
          evidenceCollectionProgress = Math.round(
            (subcontrolsWithEvidence / totalSubcontrols) * 100
          );
        } else {
          const controlLevelEvidenceCount = evidenceData.filter((ev) => {
            return (
              ev.clauses &&
              ev.clauses.some((c) => {
                if (typeof c === "object" && c.id !== undefined) {
                  return c.id === controlId;
                }
                if (typeof c === "number") {
                  return c === controlId;
                }
                if (typeof c === "string") {
                  return String(c) === String(controlId);
                }
                return false;
              })
            );
          }).length;
          evidenceCollectionProgress = controlLevelEvidenceCount > 0 ? 100 : 0;
        }

        // Update the control in context
        const updatedControl = {
          id: controlId,
          implementationStatus: controlImplementationStatus,
          statusReason: controlStatusReason,
          implementationProgress,
          evidenceCollectionProgress,
          implementedSubcontrols,
          inProgressSubcontrols,
          notStartedSubcontrols:
            totalSubcontrols - implementedSubcontrols - inProgressSubcontrols,
          totalSubcontrols,
          evidenceCount: evidenceData.filter((ev) => {
            return (
              ev.clauses &&
              ev.clauses.some((c) => {
                if (typeof c === "object" && c.id !== undefined) {
                  return c.id === controlId;
                }
                if (typeof c === "number") {
                  return c === controlId;
                }
                if (typeof c === "string") {
                  return String(c) === String(controlId);
                }
                return false;
              })
            );
          }).length,
          lastCalculated: Date.now(),
        };

        dispatch({
          type: ACTIONS.UPDATE_CONTROL_FROM_PARENT,
          payload: updatedControl,
        });

        console.log(
          `ControlDataContext - Updated control ${controlId} from parent:`,
          updatedControl
        );
      } catch (error) {
        console.error(
          `Failed to calculate control data for ${controlId}:`,
          error
        );
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      controls: state.controls,
      isInitialized: state.isInitialized,
      initializeControls,
      updateControl,
      resetControls,
      updateControlFromParent,
      calculateAndUpdateControl,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      state.controls,
      state.isInitialized,
      // Callback functions are already memoized with useCallback, no need to include them
    ]
  );

  return (
    <ControlDataContext.Provider value={value}>
      {children}
    </ControlDataContext.Provider>
  );
};

// Custom hook to use the context
export const useControlData = () => {
  const context = useContext(ControlDataContext);
  if (!context) {
    throw new Error("useControlData must be used within a ControlDataProvider");
  }
  return context;
};

export default ControlDataContext;
