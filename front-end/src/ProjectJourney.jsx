// src/components/Projects/ProjectJourney.jsx

import React from "react";
import {
  FaUserFriends,
  FaUserShield,
  FaComments,
  FaShieldAlt,
  FaFolderOpen,
  FaChartBar,
  FaPlus,
} from "react-icons/fa";

export default function ProjectJourney({ projectJourney, commentsData = [] }) {
  // Create fallback steps in case projectJourney is incomplete
  const createFallbackStep = (title, step) => ({
    step,
    title,
    description: `${title} step`,
    completed: false,
    completedCount: 0,
    totalCount: 1,
    percent: 0,
  });

  // Use the projectJourney data directly, but update the comments step with dynamic data
  const orderedJourney = (projectJourney || []).map((step, index) => {
    // Update the comments step with dynamic data
    if (step.title === "Add Comments") {
      return {
        ...step,
        completed: commentsData.length > 0,
        completedCount: commentsData.length,
        totalCount: 1,
        percent: commentsData.length > 0 ? 100 : 0,
      };
    }
    return step;
  });

  // If no projectJourney data, create fallback journey
  const finalJourney =
    orderedJourney.length > 0
      ? orderedJourney
      : [
          createFallbackStep("Add Members", 1),
          createFallbackStep("Add Auditor", 2),
          createFallbackStep("Add Comments", 3),
          createFallbackStep("Implement Controls", 4),
          createFallbackStep("Evidence Collection", 5),
          createFallbackStep("Risk Register", 6),
        ];

  // Get step status based on completion with null checks
  const getStepStatus = (step) => {
    if (!step) return "not-started";
    if (step.completed) return "completed";
    if ((step.percent || 0) > 0 && (step.percent || 0) < 100)
      return "in-progress";
    if ((step.percent || 0) === 100) return "completed";
    return "not-started";
  };

  // Get colors based on status
  const getStatusColors = (status) => {
    switch (status) {
      case "completed":
        return {
          circle: "bg-green-500 border-green-500 text-white",
          text: "text-green-600",
          badge: "bg-green-100 text-green-700",
          line: "bg-green-500",
        };
      case "in-progress":
        return {
          circle: "bg-yellow-500 border-yellow-500 text-white",
          text: "text-yellow-600",
          badge: "bg-yellow-100 text-yellow-700",
          line: "bg-yellow-500",
        };
      default:
        return {
          circle: "bg-red-500 border-red-500 text-white",
          text: "text-red-600",
          badge: "bg-red-100 text-red-700",
          line: "bg-gray-300",
        };
    }
  };

  // Icons for each step
  const stepIcons = [
    <FaUserFriends key="members" />,
    <FaUserShield key="auditor" />,
    <FaComments key="comments" />,
    <FaShieldAlt key="controls" />,
    <FaFolderOpen key="evidence" />,
    <FaChartBar key="risks" />,
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Project Journey
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Track your compliance progress
          </p>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-7 left-7 right-7 h-1 bg-gray-200 rounded-full z-0"></div>

        {/* Progress lines between circles with subtle glow */}
        <div className="absolute top-7 left-7 right-7 h-1 z-0">
          <div className="flex h-full">
            {finalJourney.map((step, index) => {
              if (index === finalJourney.length - 1) return null; // No line after last step

              const currentStatus = getStepStatus(step);
              const nextStep = finalJourney[index + 1];
              const nextStatus = getStepStatus(nextStep);
              const colors = getStatusColors(currentStatus);

              // Line color logic with subtle shadow effects
              let lineClasses = "bg-gray-300";
              if (currentStatus === "completed") {
                lineClasses = "bg-green-500 shadow-sm";
              } else if (currentStatus === "in-progress") {
                lineClasses = "bg-yellow-500 shadow-sm";
              }

              return (
                <div
                  key={index}
                  className="flex items-center"
                  style={{ width: `${100 / (finalJourney.length - 1)}%` }}
                >
                  <div
                    className={`h-full w-full transition-all duration-500 rounded-full ${lineClasses}`}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Steps */}
        <div className="flex justify-between items-start relative z-10">
          {finalJourney.map((step, index) => {
            const status = getStepStatus(step);
            const colors = getStatusColors(status);
            const IconComponent = stepIcons[index];

            return (
              <div
                key={`${step.step || index}-${step.title || "step"}-${index}`}
                className="group flex flex-col items-center cursor-pointer relative"
              >
                {/* Tooltip positioned relative to this container */}
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                    {step?.description ||
                      `${step?.title || "Step"} - ${
                        status === "completed"
                          ? "Complete"
                          : status === "in-progress"
                          ? "In Progress"
                          : "Not Started"
                      }`}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>

                {/* Circle with enhanced effects */}
                <div
                  className={`
                    relative flex items-center justify-center w-14 h-14 rounded-full border-2 
                    transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-1
                    shadow-lg hover:shadow-xl ${colors.circle}
                  `}
                  style={{
                    boxShadow:
                      status === "completed"
                        ? "0 4px 20px rgba(34, 197, 94, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)"
                        : status === "in-progress"
                        ? "0 4px 20px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)"
                        : "0 4px 20px rgba(239, 68, 68, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div className="transition-transform duration-300 group-hover:scale-110">
                    {IconComponent}
                  </div>

                  {/* Subtle pulse for in-progress */}
                  {status === "in-progress" && (
                    <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-20 animate-pulse"></div>
                  )}

                  {/* Success glow for completed */}
                  {status === "completed" && (
                    <div className="absolute -inset-0.5 rounded-full bg-green-400 opacity-20 blur-sm"></div>
                  )}
                </div>

                {/* Step Title with hover effect */}
                <div
                  className={`mt-3 text-sm font-medium text-center max-w-20 transition-all duration-300 group-hover:text-opacity-80 ${colors.text}`}
                >
                  {step?.title || "Step"}
                </div>

                {/* Status Badge with enhanced styling */}
                <div
                  className={`mt-2 px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 transform group-hover:scale-105 shadow-sm hover:shadow-md ${colors.badge}`}
                >
                  {status === "completed"
                    ? "Complete"
                    : status === "in-progress"
                    ? `${step?.percent || 0}%`
                    : "0%"}
                </div>

                {/* Progress Fraction */}
                <div className="mt-1 text-xs text-gray-500 transition-colors duration-300 group-hover:text-gray-700">
                  {step?.completedCount || 0}/{step?.totalCount || 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
