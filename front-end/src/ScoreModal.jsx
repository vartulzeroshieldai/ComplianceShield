// src/ScoreModal.jsx
import React from "react";
import { FaTimes, FaArrowLeft, FaChartBar } from "react-icons/fa";

export default function ScoreModal({
  scores,
  isOpen,
  onClose,
  onBack,
  onFinalSave,
  responses,
  sections,
}) {
  if (!isOpen || !scores) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FaChartBar className="mr-2 text-green-600" />
            Questionnaire Results
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
            aria-label="Close Modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Score Content */}
        <div className="px-10 py-10 bg-white overflow-y-auto flex-1">
          {/* Overall Score Card */}
          <div className="mb-8 p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Overall Score</h3>
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {scores.overall.percentage}%
              </div>
              <div className="text-lg text-gray-600 mb-6">
                {scores.overall.met} Met • {scores.overall.notMet} Not Met • {scores.overall.notApplicable} Not Applicable
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${scores.overall.percentage}%` }}
                ></div>
              </div>
               <div className="text-sm text-gray-500">
                 Based on {scores.overall.applicableQuestions} applicable questions
                 <br />
                 <span className="text-xs text-gray-400">
                   (Unanswered questions counted as "Not Met")
                 </span>
               </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Category Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(scores.categoryScores).map(([category, score]) => (
                <div key={category} className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-700 truncate">
                      {category}
                    </h4>
                    <span className="text-2xl font-bold text-green-600">
                      {score.percentage}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {score.met} Met • {score.notMet} Not Met • {score.notApplicable} Not Applicable
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${score.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {score.applicableQuestions} applicable questions
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score Interpretation */}
          <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Score Interpretation</h3>
            <div className="text-sm text-gray-700">
              {scores.overall.percentage >= 90 && (
                <span className="text-green-600 font-semibold">Excellent! Your organization demonstrates strong compliance practices.</span>
              )}
              {scores.overall.percentage >= 70 && scores.overall.percentage < 90 && (
                <span className="text-blue-600 font-semibold">Good progress! Consider addressing areas with lower scores.</span>
              )}
              {scores.overall.percentage >= 50 && scores.overall.percentage < 70 && (
                <span className="text-yellow-600 font-semibold">Moderate compliance. Focus on improving areas marked as "Not Met".</span>
              )}
              {scores.overall.percentage < 50 && (
                <span className="text-red-600 font-semibold">Significant improvement needed. Prioritize addressing compliance gaps.</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 flex items-center justify-between px-10 py-4 border-t border-gray-200 space-x-3 flex-shrink-0">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white text-gray-600 rounded-full shadow hover:bg-gray-100 hover:text-gray-800 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
          >
            Back to Questionnaire
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
            >
              Close
            </button>
            
            {onFinalSave && (
              <button
                onClick={onFinalSave}
                className="px-6 py-3 bg-white text-teal-400 rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
              >
                Save Results
              </button>
            )}
          </div>
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
