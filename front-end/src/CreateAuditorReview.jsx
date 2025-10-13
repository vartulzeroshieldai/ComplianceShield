// src/CreateAuditorReview.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import {
  FaTimes,
  FaSave,
  FaUser,
  FaTag,
  FaFileAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaUpload,
  FaEye,
} from "react-icons/fa";

export default function CreateAuditorReview({
  control,
  subcontrol,
  isOpen,
  onClose,
  onSuccess,
  project,
}) {
  const { fetchWithAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Generate auto-mapped tags based on control and subcontrol information
  const generateAutoTags = useCallback(() => {
    const autoTags = [];

    // Add control information
    if (control) {
      autoTags.push(`Control:${control.clause_number}`);
      autoTags.push(`Control:${control.title?.replace(/\s+/g, "_")}`);
    }

    // Add subcontrol information if available
    if (subcontrol) {
      // Only add subcontrol clause number, not the description
      if (subcontrol.sub_clause_number) {
        autoTags.push(`Subcontrol:${subcontrol.sub_clause_number}`);
      }
    }

    // Add project information
    if (project) {
      autoTags.push(`Project:${project.name?.replace(/\s+/g, "_")}`);
      if (
        project.framework &&
        project.framework.name &&
        project.framework.name !== "undefined"
      ) {
        autoTags.push(
          `Framework:${project.framework.name?.replace(/\s+/g, "_")}`
        );
      }
    }

    // Add current date
    const currentDate = new Date().toISOString().split("T")[0];
    autoTags.push(`Review_Date:${currentDate}`);

    return autoTags;
  }, [control, subcontrol, project]);

  // Memoize the initial auto tags to prevent infinite loops
  const initialAutoTags = useMemo(() => generateAutoTags(), [generateAutoTags]);

  // Form state with auto-generated tags
  const [formData, setFormData] = useState({
    title: "",
    status: "Pending Updates",
    evidence: "",
    evidence_notes: "",
    conclusion: "",
    warning: "",
    autoTags: initialAutoTags,
    userTags: [],
    has_upload_option: true,
    has_view_details: true,
  });

  // Update auto tags when subcontrol or control changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      autoTags: generateAutoTags(),
    }));
  }, [generateAutoTags]);

  // Status options
  const statusOptions = [
    { value: "Accepted", label: "Accepted", color: "text-green-600" },
    { value: "Rejected", label: "Rejected", color: "text-red-600" },
    {
      value: "Pending Updates",
      label: "Pending Updates",
      color: "text-yellow-600",
    },
  ];

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle user tags input
  const handleUserTagsChange = (e) => {
    const tagsString = e.target.value;
    const tagsArray = tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    setFormData((prev) => ({
      ...prev,
      userTags: tagsArray,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const requestData = {
        title: formData.title,
        status: formData.status,
        evidence: formData.evidence,
        evidence_notes: formData.evidence_notes,
        conclusion: formData.conclusion,
        warning: formData.warning,
        tags: [...formData.autoTags, ...formData.userTags],
        hasUploadOption: formData.has_upload_option,
        hasViewDetails: formData.has_view_details,
        control: control.id,
        sub_clause: subcontrol ? subcontrol.id : null,
      };

      console.log("CreateAuditorReview - Request data:", requestData);
      console.log("CreateAuditorReview - Subcontrol:", subcontrol);
      console.log(
        "CreateAuditorReview - Subcontrol ID:",
        subcontrol ? subcontrol.id : null
      );

      const response = await fetchWithAuth(
        `/api/controls/${control.id}/reviews/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        console.log("CreateAuditorReview - Response data:", responseData);
        console.log(
          "CreateAuditorReview - Created review sub_clause:",
          responseData.sub_clause
        );
        console.log(
          "CreateAuditorReview - Created review control:",
          responseData.control
        );
        console.log(
          "CreateAuditorReview - Full response object:",
          JSON.stringify(responseData, null, 2)
        );

        setSuccess(true);
        // Reset form
        setFormData({
          title: "",
          status: "Pending Updates",
          evidence: "",
          evidence_notes: "",
          conclusion: "",
          warning: "",
          autoTags: generateAutoTags(),
          userTags: [],
          has_upload_option: true,
          has_view_details: true,
        });

        // Call success callback to refresh data
        console.log("CreateAuditorReview - Calling onSuccess callback");
        if (onSuccess) {
          onSuccess();
        }

        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to create auditor review");
      }
    } catch (err) {
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
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300 animate-scaleIn relative text-gray-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 rounded-xl shadow-lg">
              <FaUser className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Create Auditor Review
              </h2>
              <p className="text-sm text-gray-500">
                Review for: {control?.title} ({control?.clause_number})
                {subcontrol &&
                  ` - ${subcontrol.title} (${
                    subcontrol.sub_clause_number || subcontrol.id
                  })`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
            aria-label="Close Modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto bg-white">
          <form
            id="auditor-review-form"
            onSubmit={handleSubmit}
            className="px-10 py-8 space-y-6"
          >
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <FaCheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-800">
                  Auditor review created successfully!
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <FaExclamationTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1"
                  placeholder="Enter review title"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-Generated Tags (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-Generated Tags
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                  <div className="flex flex-wrap gap-1">
                    {formData.autoTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 hover:bg-teal-200 transition-colors duration-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  These tags are automatically generated and cannot be edited
                </p>
              </div>

              {/* User Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Tags
                </label>
                <input
                  type="text"
                  value={formData.userTags.join(", ")}
                  onChange={handleUserTagsChange}
                  className="w-full px-3 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1"
                  placeholder="Enter additional tags separated by commas"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add custom tags separated by commas
                </p>
              </div>
            </div>

            {/* Evidence Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FaFileAlt className="w-4 h-4 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  Evidence Details
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence Description *
                </label>
                <textarea
                  name="evidence"
                  value={formData.evidence}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1"
                  placeholder="Describe the evidence provided for this review"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence Notes
                </label>
                <textarea
                  name="evidence_notes"
                  value={formData.evidence_notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1"
                  placeholder="Additional notes about the evidence"
                />
              </div>
            </div>

            {/* Review Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FaInfoCircle className="w-4 h-4 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  Review Details
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conclusion
                </label>
                <textarea
                  name="conclusion"
                  value={formData.conclusion}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1"
                  placeholder="Final conclusion of the review"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warning (if applicable)
                </label>
                <textarea
                  name="warning"
                  value={formData.warning}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1"
                  placeholder="Warning message if additional information is required"
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FaUpload className="w-4 h-4 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  Review Options
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="has_upload_option"
                    checked={formData.has_upload_option}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Enable Upload Option
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="has_view_details"
                    checked={formData.has_view_details}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Enable View Details Option
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 flex items-center justify-end px-10 py-4 space-x-3 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="auditor-review-form"
            disabled={loading}
            className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <FaSave className="w-4 h-4" />
                <span>Create Review</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Animations CSS */}
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
