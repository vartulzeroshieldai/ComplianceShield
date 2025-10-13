// src/QuestionnaireModal.jsx
import React, { useState, useEffect } from "react";
import { FaTimes, FaChartBar } from "react-icons/fa";
import { useAuth } from "./AuthContext"; // Import the useAuth hook
import ScoreModal from "./ScoreModal"; // Import the new ScoreModal component

export default function QuestionnaireModal({
  sections,
  isOpen,
  onClose,
  onSave,
}) {
  const { user } = useAuth(); // Get the current user from the context

  // --- FIX: Check if the user has the 'Admin' role ---
  const isAdmin = user && user.role === "Admin";

  // State for tracking responses and score display
  const [responses, setResponses] = useState({});
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scores, setScores] = useState(null);

  // Function to handle response changes
  const handleResponseChange = (sectionIdx, questionIdx, value) => {
    setResponses(prev => ({
      ...prev,
      [`${sectionIdx}-${questionIdx}`]: value
    }));
  };

  // Calculate scores for each category and overall
  const calculateScores = () => {
    const categoryScores = {};
    let totalQuestions = 0;
    let totalMet = 0;
    let totalNotMet = 0;
    let totalNotApplicable = 0;

    sections.forEach((section, sectionIdx) => {
      let categoryMet = 0;
      let categoryNotMet = 0;
      let categoryNotApplicable = 0;
      let categoryTotal = 0;

      section.questions.forEach((question, questionIdx) => {
        const responseKey = `${sectionIdx}-${questionIdx}`;
        const response = responses[responseKey];

        // Count all questions (answered and unanswered)
        categoryTotal++;
        totalQuestions++;

        if (response) {
          // User has selected an option
          switch (response) {
            case 'Met':
              categoryMet++;
              totalMet++;
              break;
            case 'Not Met':
              categoryNotMet++;
              totalNotMet++;
              break;
            case 'Not Applicable':
              categoryNotApplicable++;
              totalNotApplicable++;
              break;
          }
        } else {
          // User has not selected any option - treat as "Not Met"
          categoryNotMet++;
          totalNotMet++;
        }
      });

      // Calculate category percentage (excluding Not Applicable, but including unanswered as Not Met)
      const categoryApplicableQuestions = categoryMet + categoryNotMet;
      const categoryPercentage = categoryApplicableQuestions > 0
        ? Math.round((categoryMet / categoryApplicableQuestions) * 100)
        : 0;

      categoryScores[section.heading] = {
        met: categoryMet,
        notMet: categoryNotMet,
        notApplicable: categoryNotApplicable,
        total: categoryTotal,
        applicableQuestions: categoryApplicableQuestions,
        percentage: categoryPercentage
      };
    });

    // Calculate overall percentage (excluding Not Applicable, but including unanswered as Not Met)
    const overallApplicableQuestions = totalMet + totalNotMet;
    const overallPercentage = overallApplicableQuestions > 0
      ? Math.round((totalMet / overallApplicableQuestions) * 100)
      : 0;

    return {
      categoryScores,
      overall: {
        met: totalMet,
        notMet: totalNotMet,
        notApplicable: totalNotApplicable,
        total: totalQuestions,
        applicableQuestions: overallApplicableQuestions,
        percentage: overallPercentage
      }
    };
  };

  // FIXED: Handle save and show score modal - DON'T close parent modal
  const handleSave = () => {
    const calculatedScores = calculateScores();
    setScores(calculatedScores);
    setShowScoreModal(true);
    
    // REMOVED: Don't call onSave here as it closes the modal
    // Store data for potential later use
    const saveData = {
      responses,
      scores: calculatedScores,
      timestamp: new Date().toISOString(),
      user: user?.id
    };
    
    // Optional: Store in localStorage for later retrieval
    localStorage.setItem('questionnaireData', JSON.stringify(saveData));
  };

  // Handle final save to backend
  const handleFinalSave = async () => {
    try {
      const saveData = {
        responses,
        scores,
        sections,
        timestamp: new Date().toISOString(),
        user: user?.id
      };
      
      // Get auth token
      const authTokens = localStorage.getItem("authTokens");
      const token = authTokens ? JSON.parse(authTokens).access : null;

      if (!token) {
        alert("Authentication required. Please log in again.");
        return;
      }

      // Submit to backend
      const response = await fetch("/api/questionnaire/submit/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saveData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Questionnaire saved successfully:", result);
        alert("Questionnaire results saved successfully!");
        
        // Call the original onSave if provided
        if (onSave) {
          onSave(saveData);
        }
        
        // Close the modal
        onClose();
      } else {
        const errorData = await response.json();
        console.error("Error saving questionnaire:", errorData);
        alert(`Failed to save questionnaire: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error saving questionnaire:", error);
      alert("Error saving questionnaire. Please try again.");
    }
  };

  // FIXED: Handle back from score modal - only close ScoreModal
  const handleBackFromScore = () => {
    setShowScoreModal(false);
  };

  // Reset responses when modal closes
  useEffect(() => {
    if (!isOpen) {
      setResponses({});
      setShowScoreModal(false);
      setScores(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Questionnaire</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
            aria-label="Close Modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Scrollable Questions */}
        <div className="px-10 py-10 bg-white overflow-y-auto flex-1 space-y-14">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h3 className="mb-4 text-xl font-bold text-gray-700">
                {section.heading}
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Question
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-teal-700">
                        Met
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-red-600">
                        Not Met
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
                        Not Applicable
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {section.questions.map((q, qIdx) => (
                      <tr key={qIdx}>
                        <td className="px-4 py-2 text-gray-700 align-top min-w-[320px] text-justify leading-relaxed">
                          {`${sectionIdx + 1}.${qIdx + 1} ${q}`}
                        </td>
                        {["Met", "Not Met", "Not Applicable"].map(
                          (opt, optIdx) => (
                            <td className="px-6 py-2 text-center" key={optIdx}>
                              <input
                                type="radio"
                                name={`section-${sectionIdx}-question-${qIdx}`}
                                value={opt}
                                checked={responses[`${sectionIdx}-${qIdx}`] === opt}
                                onChange={(e) => handleResponseChange(sectionIdx, qIdx, e.target.value)}
                                className="form-radio text-teal-600"
                                aria-label={opt}
                              />
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Indicator - Simple completion status */}
         {Object.keys(responses).length > 0 && (
           <div className="px-10 pb-6">
             <div className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium text-gray-700">
                   Questions Answered: {Object.keys(responses).length}
                 </span>
                 <span className="text-sm text-gray-500">
                   Click "Submit & View Score" to see results
                 </span>
               </div>
             </div>
           </div>
         )}

        {/* Footer */}
        <div className="bg-gray-50 flex items-center justify-end px-10 py-4 border-t border-gray-200 space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
          >
            Cancel
          </button>

          {/* --- FIX: Show these buttons only to Admins ---
          {isAdmin && (
            <>
              <button className="px-6 py-3 bg-white text-teal-400 rounded-full shadow hover:bg-teal-400 hover:text-white font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer">
                Add
              </button>
              <button className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer">
                Remove
              </button>
            </>
          )} */}

          <button
            onClick={handleSave}
            disabled={Object.keys(responses).length === 0}
            className="px-6 py-3 bg-white text-teal-400 rounded-full shadow hover:bg-teal-400 hover:text-white font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit & View Score
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

      {/* FIXED: Score Modal - Separate Component */}
      <ScoreModal
        scores={scores}
        isOpen={showScoreModal}
        onClose={handleBackFromScore}
        onBack={handleBackFromScore}
        onFinalSave={handleFinalSave}
        responses={responses}
        sections={sections}
      />
    </div>
  );
}