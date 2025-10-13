// src/EvidenceReuploadModal.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  FaTimes,
  FaUpload,
  FaFileAlt,
  FaSave,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";

export default function EvidenceReuploadModal({
  review,
  control,
  subcontrol,
  project,
  isOpen,
  onClose,
  onSuccess,
}) {
  const { fetchWithAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Form state with auto-filled existing evidence details
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    file: null,
    mappedControls: [],
  });

  // Auto-fill form data when review changes
  useEffect(() => {
    if (review && isOpen) {
      // Try to find existing evidence for this control/subcontrol to pre-fill the form
      const fetchExistingEvidence = async () => {
        try {
          const evidenceResponse = await fetchWithAuth(
            `/api/projects/${project.id}/evidence/`
          );

          if (evidenceResponse.ok) {
            const allEvidence = await evidenceResponse.json();

            // Find evidence that matches this control and subcontrol
            const matchingEvidence = allEvidence.find((evidence) => {
              const hasMatchingControl =
                evidence.clauses &&
                evidence.clauses.some((clause) => clause.id === control.id);
              const hasMatchingSubcontrol = subcontrol
                ? evidence.sub_clause === subcontrol.id
                : !evidence.sub_clause;
              return hasMatchingControl && hasMatchingSubcontrol;
            });

            if (matchingEvidence) {
              // Pre-fill with existing evidence data
              setFormData({
                title:
                  matchingEvidence.evidence_name ||
                  `Updated Evidence for ${review.title}`,
                description:
                  matchingEvidence.description || review.evidence || "",
                content:
                  matchingEvidence.evidence_content ||
                  review.evidence_notes ||
                  "",
                file: null,
                mappedControls: matchingEvidence.clauses || [control],
              });
              console.log(
                "EvidenceReuploadModal - Pre-filled form with existing evidence:",
                matchingEvidence
              );
            } else {
              // No existing evidence, use review data
              setFormData({
                title: `Updated Evidence for ${review.title}`,
                description: review.evidence || "",
                content: review.evidence_notes || "",
                file: null,
                mappedControls: [control],
              });
              console.log(
                "EvidenceReuploadModal - No existing evidence found, using review data"
              );
            }
          }
        } catch (error) {
          console.error(
            "EvidenceReuploadModal - Error fetching existing evidence:",
            error
          );
          // Fallback to review data
          setFormData({
            title: `Updated Evidence for ${review.title}`,
            description: review.evidence || "",
            content: review.evidence_notes || "",
            file: null,
            mappedControls: [control],
          });
        }
      };

      fetchExistingEvidence();
    }
  }, [review, isOpen, control, subcontrol, project, fetchWithAuth]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);

      // Create preview URL for images
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // First, try to find existing evidence for this control/subcontrol combination
      let existingEvidenceId = null;
      let existingEvidence = null;

      // Look for existing evidence linked to this control/subcontrol
      const evidenceResponse = await fetchWithAuth(
        `/api/projects/${project.id}/evidence/`
      );

      if (evidenceResponse.ok) {
        const allEvidence = await evidenceResponse.json();
        console.log(
          "EvidenceReuploadModal - All evidence for project:",
          allEvidence
        );

        // Find evidence that matches this control and subcontrol
        const matchingEvidence = allEvidence.find((evidence) => {
          // Check if evidence is linked to the same control
          const hasMatchingControl =
            evidence.clauses &&
            evidence.clauses.some((clause) => clause.id === control.id);

          // Check if evidence is linked to the same subcontrol (or both are null)
          const hasMatchingSubcontrol = subcontrol
            ? evidence.sub_clause === subcontrol.id
            : !evidence.sub_clause;

          console.log("EvidenceReuploadModal - Checking evidence:", {
            evidence_id: evidence.id,
            evidence_clauses: evidence.clauses,
            control_id: control.id,
            evidence_sub_clause: evidence.sub_clause,
            subcontrol_id: subcontrol?.id,
            hasMatchingControl,
            hasMatchingSubcontrol,
          });

          return hasMatchingControl && hasMatchingSubcontrol;
        });

        if (matchingEvidence) {
          existingEvidenceId = matchingEvidence.id;
          existingEvidence = matchingEvidence;
          console.log(
            "EvidenceReuploadModal - Found existing evidence to update:",
            matchingEvidence
          );
        } else {
          console.log(
            "EvidenceReuploadModal - No existing evidence found, will create new"
          );
        }
      }

      const submitData = new FormData();
      submitData.append("evidence_name", formData.title);
      submitData.append("description", formData.description);
      submitData.append("evidence_content", formData.content);

      // Add the control
      submitData.append("clauses", control.id);

      // Add subcontrol if available
      if (subcontrol) {
        submitData.append("sub_clause", subcontrol.id);
      }

      // Add the new file if selected
      if (selectedFile) {
        submitData.append("file", selectedFile);
      }

      console.log("EvidenceReuploadModal - Submitting evidence:", {
        evidence_name: formData.title,
        description: formData.description,
        evidence_content: formData.content,
        control_id: control.id,
        subcontrol_id: subcontrol?.id,
        has_file: !!selectedFile,
        file_name: selectedFile?.name,
        existing_evidence_id: existingEvidenceId,
        action: existingEvidenceId ? "UPDATE_EXISTING" : "CREATE_NEW",
      });

      let response;

      if (existingEvidenceId) {
        // Update existing evidence
        console.log(
          "EvidenceReuploadModal - Updating existing evidence ID:",
          existingEvidenceId
        );
        response = await fetchWithAuth(
          `/api/projects/${project.id}/evidence/${existingEvidenceId}/`,
          {
            method: "PATCH",
            body: submitData,
          }
        );
      } else {
        // Create new evidence
        console.log("EvidenceReuploadModal - Creating new evidence");
        response = await fetchWithAuth(
          `/api/projects/${project.id}/evidence/`,
          {
            method: "POST",
            body: submitData,
          }
        );
      }

      if (response.ok) {
        const responseData = await response.json();
        console.log(
          "EvidenceReuploadModal - Evidence operation successful:",
          responseData
        );

        setSuccess(true);
        setSuccessMessage(
          existingEvidenceId
            ? "Evidence updated successfully!"
            : "New evidence created successfully!"
        );

        // Call success callback to refresh data
        if (onSuccess) {
          onSuccess();
        }

        // Close modal after a short delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        console.error("EvidenceReuploadModal - Error response:", errorData);
        setError(
          errorData.detail || errorData.message || "Failed to update evidence"
        );
      }
    } catch (err) {
      console.error("EvidenceReuploadModal - Network error:", err);
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(false);
      setSuccessMessage("");
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    }
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen || !review) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <FaUpload className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Update Evidence
              </h2>
              <p className="text-sm text-gray-500">
                Re-upload evidence for: {review.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-800"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="p-6 overflow-y-auto flex-grow min-h-0">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
              <FaCheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <FaExclamationTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Review Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FaInfoCircle className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-700">
                Review Details
              </h3>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Review:</strong> {review.title}
              </p>
              <p>
                <strong>Status:</strong> {review.status}
              </p>
              <p>
                <strong>Control:</strong> {control.clause_number} -{" "}
                {control.title}
              </p>
              {subcontrol && (
                <p>
                  <strong>Subcontrol:</strong> {subcontrol.sub_clause_number} -{" "}
                  {subcontrol.title}
                </p>
              )}
            </div>
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-700">
                <strong>Smart Update:</strong> If evidence already exists for
                this control/subcontrol, it will be updated with new
                information. If no evidence exists, a new record will be
                created. This prevents duplicate evidence and keeps the system
                clean.
              </p>
            </div>
          </div>

          {/* Evidence Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence Name *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 focus:shadow-xl text-sm"
              placeholder="Provide name for the evidence..."
            />
          </div>

          {/* Description and Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 focus:shadow-xl text-sm resize-none"
                placeholder="Add description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 focus:shadow-xl text-sm resize-none"
                placeholder="Add content"
              />
            </div>
          </div>

          {/* Auto-Mapped Controls */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto-Mapped Controls
            </label>
            <div className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-md">
              {formData.mappedControls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.mappedControls.map((controlItem) => (
                    <div
                      key={controlItem.id}
                      className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-2 rounded-full"
                    >
                      <span className="font-semibold mr-1">
                        {controlItem.clause_number}
                      </span>
                      <span className="max-w-32 truncate">
                        {controlItem.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500 text-sm">
                  No controls automatically mapped
                </span>
              )}
            </div>

            {/* Show subcontrol information separately */}
            {subcontrol && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Related Subcontrol:
                </div>
                <div className="inline-flex items-center bg-green-100 text-green-800 text-xs px-3 py-2 rounded-full">
                  <span className="font-semibold mr-1">
                    {subcontrol.sub_clause_number}
                  </span>
                  <span className="max-w-32 truncate">{subcontrol.title}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Evidence is automatically mapped to the current control
              {subcontrol &&
                " and will be associated with the specific subcontrol"}
            </p>
          </div>

          {/* Evidence File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                selectedFile
                  ? "border-teal-400 bg-teal-50"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">
                    Selected: {selectedFile.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 hover:text-red-700 text-sm underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-gray-500">
                    Drag & Drop your evidence file here or{" "}
                    <label
                      htmlFor="file-upload"
                      className="text-blue-600 hover:text-blue-700 cursor-pointer underline font-medium"
                    >
                      browse
                    </label>
                  </div>
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                  />
                  <div className="text-xs text-gray-400">
                    Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG,
                    PNG, TXT
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
              <span className="font-medium">Note:</span> Only 1 evidence file
              can be attached to each Evidence object.
            </div>

            {/* File Preview */}
            {previewUrl && (
              <div className="mt-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-48 object-contain border border-gray-200 rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 p-6 flex-shrink-0">
          <div className="text-sm text-gray-400">Powered by CyberUltron</div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-2 text-red-400 shadow hover:bg-red-400 hover:text-white rounded-full font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="px-5 py-2 rounded-full disabled:opacity-50 bg-white text-teal-400 font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <FaSave className="w-4 h-4" />
                  <span>Update Evidence</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
