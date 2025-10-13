// src/EvidenceDetailedView.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  FaTimes,
  FaInfoCircle,
  FaUser,
  FaCalendarAlt,
  FaFileAlt,
  FaEye,
} from "react-icons/fa";
import { useAuth } from "./AuthContext";

export default function EvidenceDetailedView({
  evidence,
  isOpen,
  onClose,
  project,
}) {
  const [detailedEvidence, setDetailedEvidence] = useState(evidence || {});
  const [loading, setLoading] = useState(false);
  const { fetchWithAuth, user } = useAuth();

  // Get user role
  const userRole = user?.role || user?.user_type || "Contributor";

  // Define fetchDetailedEvidence function first
  const fetchDetailedEvidence = useCallback(async () => {
    try {
      setLoading(true);
      console.log(
        "EvidenceDetailedView - Fetching detailed evidence for ID:",
        evidence.id
      );

      const response = await fetchWithAuth(
        `/api/projects/${project.id}/evidence/${evidence.id}/`
      );

      if (response.ok) {
        const detailedData = await response.json();
        console.log(
          "EvidenceDetailedView - Fetched detailed evidence:",
          detailedData
        );

        // Merge the fetched data with the processed evidence data to preserve mappedControls
        const mergedData = {
          ...detailedData,
          // Preserve the processed data from Evidence.jsx
          mappedControls: evidence.mappedControls || [],
          subcontrols: evidence.subcontrols || 0,
          // Add other processed fields if needed
        };

        setDetailedEvidence(mergedData);
      } else {
        console.error(
          "EvidenceDetailedView - Failed to fetch detailed evidence:",
          response.status
        );
        // Keep the original evidence data if fetch fails
        setDetailedEvidence(evidence);
      }
    } catch (error) {
      console.error(
        "EvidenceDetailedView - Error fetching detailed evidence:",
        error
      );
      // Keep the original evidence data if fetch fails
      setDetailedEvidence(evidence);
    } finally {
      setLoading(false);
    }
  }, [evidence, project, fetchWithAuth]);

  // Update detailedEvidence when evidence prop changes
  useEffect(() => {
    console.log("EvidenceDetailedView - Evidence prop changed:", evidence);
    setDetailedEvidence(evidence || {});
  }, [evidence]);

  // Fetch detailed evidence data when modal opens
  useEffect(() => {
    if (isOpen && evidence && evidence.id && project) {
      fetchDetailedEvidence();
    } else if (!isOpen) {
      // Reset detailed evidence when modal closes
      setDetailedEvidence(evidence || {});
    }
  }, [isOpen, evidence, project, fetchDetailedEvidence]);

  if (!isOpen || !evidence) return null;

  // Ensure detailedEvidence is never null
  const safeEvidence = detailedEvidence || evidence || {};

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get file size in human readable format
  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  // Check if preview should be disabled
  const isPreviewDisabled = () => {
    const approvalStatus = safeEvidence.approval_status || "pending";
    return userRole === "Auditor" && approvalStatus !== "approved";
  };

  // Handle file preview
  const handlePreview = () => {
    // Block preview for Auditors if evidence is not approved
    if (isPreviewDisabled()) {
      alert(
        "This evidence has not been approved yet. Only approved evidence can be previewed."
      );
      return;
    }

    if (safeEvidence.file) {
      // If file is a File object, create object URL for preview
      if (safeEvidence.file instanceof File) {
        const objectUrl = URL.createObjectURL(safeEvidence.file);
        window.open(objectUrl, "_blank");
        // Clean up the object URL after a delay
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } else if (safeEvidence.file_url) {
        // If file_url exists, open it directly
        window.open(safeEvidence.file_url, "_blank");
      } else if (typeof safeEvidence.file === "string") {
        let fileUrl;

        // Check if the file string already contains the full URL
        if (
          safeEvidence.file.startsWith("http://") ||
          safeEvidence.file.startsWith("https://")
        ) {
          // File already has full URL, use it directly
          fileUrl = safeEvidence.file;
        } else {
          // File is just a path, construct the proper Django media URL
          fileUrl = `/media/${safeEvidence.file}`;
        }

        console.log(
          "EvidenceDetailedView - Attempting to preview file:",
          fileUrl
        );

        // Test if the file exists before opening
        fetch(fileUrl, { method: "HEAD" })
          .then((response) => {
            if (response.ok) {
              window.open(fileUrl, "_blank");
            } else {
              alert(
                `File not found: ${
                  safeEvidence.file_name || safeEvidence.file
                }\n\nThe file may have been deleted or moved.`
              );
            }
          })
          .catch((error) => {
            console.error("Error checking file:", error);
            alert(
              `Error accessing file: ${
                safeEvidence.file_name || safeEvidence.file
              }\n\nPlease check if the file exists.`
            );
          });
      }
    } else {
      alert("No file is attached to this evidence.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 animate-scaleIn">
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500">Loading evidence details...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaInfoCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Evidence Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
            aria-label="Close Modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-10 py-10 bg-white overflow-y-auto flex-grow min-h-0 space-y-6">
          {/* Evidence Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence Title
            </label>
            <input
              type="text"
              value={safeEvidence.evidence_name || safeEvidence.title || "N/A"}
              readOnly
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Evidence Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence Description
            </label>
            <textarea
              value={safeEvidence.description || "No description provided"}
              readOnly
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Evidence Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence Content
            </label>
            <textarea
              value={
                safeEvidence.evidence_content ||
                safeEvidence.content ||
                "No content provided"
              }
              readOnly
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Approval Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Approval Status
            </label>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      safeEvidence.approval_status === "approved"
                        ? "bg-green-100 text-green-800"
                        : safeEvidence.approval_status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {safeEvidence.approval_status === "approved"
                      ? "Approved"
                      : safeEvidence.approval_status === "rejected"
                      ? "Rejected"
                      : "Pending Approval"}
                  </span>
                </div>
                {safeEvidence.approved_by_name && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Reviewed by:</span>{" "}
                    {safeEvidence.approved_by_name}
                  </div>
                )}
              </div>
              {safeEvidence.approved_at && (
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">Date:</span>{" "}
                  {formatDate(safeEvidence.approved_at)}
                </div>
              )}
              {safeEvidence.approval_notes && (
                <div className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Notes:</span>{" "}
                  {safeEvidence.approval_notes}
                </div>
              )}
            </div>
          </div>

          {/* File Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence File
            </label>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              {safeEvidence.file ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaFileAlt className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {safeEvidence.file_name ||
                            safeEvidence.file ||
                            "Evidence File"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(safeEvidence.file_size)}
                          {typeof safeEvidence.file === "string" && (
                            <span className="ml-2 text-orange-600">
                              (File may not exist on server)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePreview}
                        disabled={isPreviewDisabled()}
                        className={`flex items-center space-x-1 px-4 py-2 rounded-full shadow font-semibold transition-all duration-200 text-sm ${
                          isPreviewDisabled()
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                            : "bg-white text-teal-400 hover:bg-teal-400 hover:text-white transform hover:scale-105 active:scale-95 cursor-pointer"
                        }`}
                        title={
                          isPreviewDisabled()
                            ? "Evidence must be approved before preview"
                            : "Preview file"
                        }
                      >
                        <FaEye className="w-4 h-4" />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaFileAlt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No file attached</p>
                </div>
              )}
            </div>
          </div>

          {/* Mapped Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mapped Controls
            </label>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              {safeEvidence.mappedControls &&
              safeEvidence.mappedControls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {safeEvidence.mappedControls.map((control, index) => (
                    <div key={index} className="flex flex-wrap gap-2">
                      {/* Always show the main control badge */}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {typeof control === "string"
                          ? control
                          : control.clause_number}
                      </span>
                      {/* Show specific subcontrol badge if evidence was created for a specific subcontrol */}
                      {typeof control === "object" &&
                        control.hasSpecificSubcontrol && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {control.specificSubcontrolNumber}
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No controls mapped</p>
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Creator Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creator
              </label>
              <div className="flex items-center space-x-2">
                <FaUser className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={
                    safeEvidence.creator_name ||
                    safeEvidence.created_by ||
                    "Unknown"
                  }
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Creation Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created Date
              </label>
              <div className="flex items-center space-x-2">
                <FaCalendarAlt className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={formatDate(safeEvidence.created_at)}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Last Updated */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Updated
              </label>
              <div className="flex items-center space-x-2">
                <FaCalendarAlt className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={formatDate(safeEvidence.updated_at)}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Subcontrols Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Subcontrols Count
              </label>
              <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {safeEvidence.subcontrols || 0} subcontrols
                </span>
                <span className="ml-2 text-gray-600">
                  across all mapped controls
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 flex items-center justify-end px-10 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
          >
            Close
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
