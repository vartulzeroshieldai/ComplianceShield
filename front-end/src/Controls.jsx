// src/components/Projects/Controls.jsx

import React, { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaHourglassHalf,
  FaFileAlt,
  FaPauseCircle,
  FaTimesCircle,
  FaChevronDown,
  FaChevronRight,
  FaTasks,
  // --- FIX #1: Import new icons for the Auditor column ---
  FaExclamationTriangle,
  FaCheck,
} from "react-icons/fa";
import ControlDetailPanel from "./ControlDetailPanel";
import { useControlData } from "./ControlDataContext";
import { useAuth } from "./AuthContext";

export default function Controls({ controls = [], project, onDataUpdate }) {
  const {
    controls: contextControls,
    initializeControls,
    updateControl,
    calculateAndUpdateControl,
  } = useControlData();
  const { fetchWithAuth } = useAuth();
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [auditorFilter, setAuditorFilter] = useState("All Auditors");
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedControl, setSelectedControl] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Initialize context with controls data when component mounts or controls prop changes
  useEffect(() => {
    if (controls.length > 0) {
      initializeControls(controls);

      // Calculate control data for all controls without requiring child components to render
      controls.forEach((control) => {
        if (project?.id && control?.id) {
          console.log(
            `Controls - Calculating data for control ${control.id} (${control.clause_number}) without child render`
          );
          calculateAndUpdateControl(control.id, project.id, fetchWithAuth);
        }
      });
    }
  }, [controls, project?.id]);

  // Use context controls if available, otherwise fall back to props
  const displayControls =
    contextControls.length > 0 ? contextControls : controls;

  // --- FIX: Sort controls by ID in ascending order ---
  // We create a new sorted array from the display controls.
  // Using localeCompare with numeric: true ensures natural sorting for IDs like "A.2" and "A.10".
  const sortedControls = [...displayControls].sort((a, b) =>
    String(a.clause_number).localeCompare(String(b.clause_number), undefined, {
      numeric: true,
    })
  );

  const filteredControls = sortedControls.filter((control) => {
    const controlStatus =
      control.implementationStatus || control.status || "Not Started";
    const auditorEnabled = control.auditorEnabled || false;

    // Fix the status matching logic to handle "Completed/Implemented" filter
    let statusMatch = false;
    if (statusFilter === "All Status") {
      statusMatch = true;
    } else if (statusFilter === "Completed/Implemented") {
      statusMatch =
        controlStatus === "Completed" || controlStatus === "Implemented";
    } else {
      statusMatch = controlStatus === statusFilter;
    }

    const auditorMatch =
      auditorFilter === "All Auditors" ||
      (auditorFilter === "Enabled" && auditorEnabled) ||
      (auditorFilter === "Disabled" && !auditorEnabled);
    return statusMatch && auditorMatch;
  });

  const totalControls = filteredControls.length;
  const totalSubcontrols = filteredControls.reduce(
    (sum, c) => sum + (c.sub_clauses?.length || 0),
    0
  );


  // --- Row Expansion Logic ---
  const toggleRowExpansion = (controlId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [controlId]: !prev[controlId],
    }));
  };

  // --- UI Helper Functions ---
  const getStatusBadge = (status) => {
    const statusMap = {
      Completed: { text: "Completed", icon: FaCheckCircle, color: "green" },
      Implemented: { text: "Implemented", icon: FaCheckCircle, color: "green" },
      "In Progress": {
        text: "In Progress",
        icon: FaHourglassHalf,
        color: "blue",
      },
    };
    const config = statusMap[status] || {
      text: "Not Started",
      icon: FaPauseCircle,
      color: "red",
    };
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}
      >
        <Icon className={`w-3 h-3 mr-1 text-${config.color}-600`} />
        {config.text}
      </span>
    );
  };

  // --- FIX #1: Updated Subcontrols badge to match new design ---
  const getSubcontrolsBadge = (control) => {
    const completed =
      control.implementedSubcontrols || control.subcontrolsCompleted || 0;
    const total = control.totalSubcontrols || control.sub_clauses?.length || 0;
    const status =
      control.implementationStatus || control.status || "Not Started";
    let iconColor = "text-red-500";
    let bgColor = "bg-red-100";
    let textColor = "text-red-700";
    let Icon = FaTimesCircle;

    if (status === "Completed" || status === "Implemented") {
      iconColor = "text-green-500";
      bgColor = "bg-green-100";
      textColor = "text-green-700";
      Icon = FaCheckCircle;
    } else if (status === "In Progress") {
      iconColor = "text-yellow-500";
      bgColor = "bg-yellow-100";
      textColor = "text-yellow-700";
      Icon = FaHourglassHalf;
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${bgColor} ${textColor}`}
      >
        <Icon className={`w-3 h-3 mr-1.5 ${iconColor}`} />
        {completed} / {total}
      </span>
    );
  };

  // Updated progress bar color function
  const getProgressBarColor = (status, progress) => {
    // If progress is 100%, always use green regardless of status
    if (progress >= 100) {
      return "bg-gradient-to-r from-green-400 to-green-700";
    }
    // For any progress < 100%, use blue gradient
    return "bg-gradient-to-r from-blue-400 via-cyan-600 to-blue-600";
  };

  const handleControlClick = (control) => {
    setSelectedControl(control);
    setIsPanelOpen(true);
  };

  // Handler to update control data using context
  const handleControlUpdate = (updatedControl) => {
    console.log("Controls - handleControlUpdate called with:", updatedControl);
    updateControl(updatedControl);

    // Also call the original onDataUpdate if provided (for backward compatibility)
    if (onDataUpdate) {
      onDataUpdate();
    }
  };

  // Function to refresh control data without requiring child component render
  const refreshControlData = async (controlId = null) => {
    if (controlId) {
      // Refresh specific control
      console.log(
        `Controls - Refreshing data for control ${controlId} without child render`
      );
      await calculateAndUpdateControl(controlId, project.id, fetchWithAuth);
    } else {
      // Refresh all controls
      console.log(
        "Controls - Refreshing data for all controls without child render"
      );
      for (const control of controls) {
        if (project?.id && control?.id) {
          await calculateAndUpdateControl(
            control.id,
            project.id,
            fetchWithAuth
          );
        }
      }
    }
  };

  // Show loading state if no controls data yet
  if (controls.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading controls...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Compliance Controls
            </h2>
            <span className="text-sm text-gray-500">
              {totalControls} of {controls.length} controls – {totalSubcontrols}{" "}
              subcontrols total
            </span>
          </div>
          <div className="flex items-center space-x-4 mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2 text-gray-600">
              <FaChevronDown className="text-gray-500" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option>All Status</option>
                <option>Completed/Implemented</option>
                <option>In Progress</option>
                <option>Not Started</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Auditor:</span>
              <select
                value={auditorFilter}
                onChange={(e) => setAuditorFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option>All Auditors</option>
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Control Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Control Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcontrols
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auditor Enabled
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredControls.map((control, idx) => {
                const progress =
                  control.implementationProgress || control.progress || 0;

                return (
                  <tr
                    key={control.id}
                    className={`${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-gray-100`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleRowExpansion(control.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedRows[control.id] ? (
                            <FaChevronDown className="w-3 h-3" />
                          ) : (
                            <FaChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <span
                          className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800"
                          onClick={() => handleControlClick(control)}
                        >
                          {control.clause_number}
                        </span>
                      </div>
                    </td>
                    {/* Enhanced Control Name column with improved progress bar */}
                    <td className="px-6 py-4">
                      <div className="w-72">
                        <div className="text-sm font-semibold text-gray-900 mb-1">
                          {control.title}
                        </div>
                        <div className="flex items-start text-xs text-gray-500 mb-2">
                          <FaFileAlt className="w-4 h-4 mt-0.5 text-gray-400 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {control.description}
                          </span>
                        </div>
                        {/* Enhanced Progress Bar with Animation and Dynamic Positioning */}
                        <div className="relative w-full bg-gray-200 rounded-full h-5 overflow-hidden shadow-inner">
                          {/* Progress fill with animation */}
                          <div
                            className={`h-5 rounded-full transition-all duration-700 ease-out progress-bar-animated ${getProgressBarColor(
                              control.implementationStatus || control.status,
                              progress
                            )}`}
                            style={{
                              width: `${progress}%`,
                              boxShadow:
                                progress > 0
                                  ? "inset 0 1px 2px rgba(255, 255, 255, 0.3)"
                                  : "none",
                            }}
                          ></div>
                          {/* Percentage text positioned in the center of the filled portion */}
                          {progress > 0 && (
                            <div
                              className="absolute top-0 h-5 flex items-center justify-center transition-all duration-700 ease-out"
                              style={{
                                width: `${Math.max(progress, 20)}%`, // Minimum 20% width to show text properly
                                left: 0,
                              }}
                            >
                              <span className="text-xs font-bold text-white progress-text-glow z-10">
                                {progress}%
                              </span>
                            </div>
                          )}
                          {/* Show percentage on the right side if progress is 0 */}
                          {progress === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                0%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {control.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSubcontrolsBadge(control)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(
                        control.implementationStatus ||
                          control.status ||
                          "Not Started"
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {control.auditorEnabled === true ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800">
                          <FaCheckCircle className="w-3 h-3 mr-1.5 text-green-600" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-800">
                          <FaTimesCircle className="w-3 h-3 mr-1.5 text-gray-500" />
                          Disabled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ControlDetailPanel
          control={selectedControl}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          availableControls={sortedControls}
          project={project}
          onDataUpdate={handleControlUpdate}
          refreshControlData={refreshControlData}
        />
      </div>
    </>
  );
}
