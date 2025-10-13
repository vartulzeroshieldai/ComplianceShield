// src/ViewDetailsControlPanel.jsx
import React from "react";
import {
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaClipboard,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaFileAlt,
  FaTags,
} from "react-icons/fa";

export default function ViewDetailsControlPanel({ review, isOpen, onClose }) {
  if (!isOpen || !review) return null;

  // Status styling configurations
  const statusConfig = {
    Rejected: {
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      borderColor: "border-red-200",
      iconColor: "text-red-500",
      icon: FaExclamationTriangle,
      gradientFrom: "from-red-50",
      gradientTo: "to-red-100",
    },
    "Pending Updates": {
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      borderColor: "border-yellow-200",
      iconColor: "text-yellow-500",
      icon: FaClock,
      gradientFrom: "from-yellow-50",
      gradientTo: "to-yellow-100",
    },
    Accepted: {
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border-green-200",
      iconColor: "text-green-500",
      icon: FaCheckCircle,
      gradientFrom: "from-green-50",
      gradientTo: "to-green-100",
    },
  };

  const config = statusConfig[review.status] || statusConfig["Pending Updates"];
  const StatusIcon = config.icon;

  // Helper to format the date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300 animate-scaleIn relative text-gray-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div
              className={`p-3 rounded-xl ${config.bgColor} ${config.borderColor} border-2 shadow-lg`}
            >
              <StatusIcon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {review.title}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${config.bgColor} ${config.textColor} ${config.borderColor} border`}
                >
                  {review.status}
                </span>
                <span className="text-sm text-gray-500">
                  Review ID: #{review.id}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
            aria-label="Close Modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row gap-8 px-8 py-8 bg-white flex-1 overflow-y-auto">
          {/* Left Panel - Review Details */}
          <div className="flex-1 space-y-6 min-h-0">
            {/* Auditor Information */}
            <div
              className={`bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} p-6 rounded-xl border ${config.borderColor} shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <FaUser className={`w-5 h-5 ${config.iconColor}`} />
                  <span>Auditor Information</span>
                </h3>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {review.auditor?.avatar || "AU"}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {review.auditor?.name || "Unknown Auditor"}
                  </h4>
                  <p className="text-sm text-gray-600 mb-1">
                    {review.auditor?.role || "Auditor"}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <FaCalendarAlt className="w-3 h-3" />
                    <span>Reviewed on {formatDateTime(review.date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Section */}
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <FaClipboard className="w-5 h-5 text-teal-500" />
                  <span>Evidence Review</span>
                </h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-teal-400">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Evidence Details
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {review.evidence || "No evidence details provided."}
                  </p>
                </div>

                {/* Warning Section */}
                {review.warning && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <FaExclamationTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-800 mb-1">
                          Warning
                        </h4>
                        <p className="text-sm text-yellow-700">
                          {review.warning}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conclusion Section */}
                {review.conclusion && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <FaCheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-800 mb-1">
                          Conclusion
                        </h4>
                        <p className="text-sm text-green-700">
                          {review.conclusion}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags Section */}
            {review.tags && review.tags.length > 0 && (
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                    <FaTags className="w-5 h-5 text-purple-500" />
                    <span>Tags</span>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full border border-purple-200 hover:bg-purple-200 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Review Summary */}
          <div className="flex-1 bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-6 min-h-0">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <FaFileAlt className="w-5 h-5 text-teal-500" />
                <span>Review Summary</span>
              </h3>
            </div>

            {/* Review Details Grid */}
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                <div className="col-span-1 text-gray-600 font-semibold">
                  Status:
                </div>
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${config.bgColor} ${config.textColor}`}
                  >
                    <StatusIcon
                      className={`w-3 h-3 mr-2 ${config.iconColor}`}
                    />
                    {review.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                <div className="col-span-1 text-gray-600 font-semibold">
                  Review Date:
                </div>
                <div className="col-span-2 text-gray-800">
                  {formatDateTime(review.date)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                <div className="col-span-1 text-gray-600 font-semibold">
                  Auditor:
                </div>
                <div className="col-span-2 text-gray-800">
                  {review.auditor?.name || "Unknown"}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                <div className="col-span-1 text-gray-600 font-semibold">
                  Role:
                </div>
                <div className="col-span-2 text-gray-800">
                  {review.auditor?.role || "Auditor"}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                <div className="col-span-1 text-gray-600 font-semibold">
                  Review ID:
                </div>
                <div className="col-span-2 text-gray-800 font-mono">
                  #{review.id}
                </div>
              </div>

              {review.sub_clause && (
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                  <div className="col-span-1 text-gray-600 font-semibold">
                    Sub-clause:
                  </div>
                  <div className="col-span-2 text-gray-800">
                    {review.sub_clause}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 flex items-center justify-end px-10 py-4 space-x-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
          >
            Close
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
