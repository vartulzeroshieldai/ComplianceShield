// CreateRiskModal.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSpinner,
  FaChevronDown,
} from "react-icons/fa";

export default function CreateRiskModal({
  isOpen,
  onClose,
  onCreate,
  user,
  projects = [],
  currentProject = null,
  asComponent = false,
}) {
  // State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Operational",
    likelihood: "",
    impact: "",
    status: "New",
    owner: "",
    dateIdentified: new Date().toISOString().split("T")[0],
    targetMitigation: "",
    mitigationPlan: "",
    project: "",
    risk_rating: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Color helper functions for dropdowns
  const getCategoryColor = (category) => {
    const colors = {
      'Compliance': { bg: '#dbeafe', text: '#1e40af' }, // blue
      'Security': { bg: '#fee2e2', text: '#dc2626' }, // red
      'Financial': { bg: '#dcfce7', text: '#16a34a' }, // green
      'Operational': { bg: '#f3f4f6', text: '#374151' }, // gray
      'Technical': { bg: '#f3e8ff', text: '#7c3aed' }, // purple
    };
    return colors[category] || colors.Operational;
  };

  const getStatusColor = (status) => {
    const colors = {
      'New': { bg: '#dbeafe', text: '#1e40af' }, // blue
      'In Progress': { bg: '#f3e8ff', text: '#7c3aed' }, // purple
      'Mitigated': { bg: '#dcfce7', text: '#16a34a' }, // green
    };
    return colors[status] || colors.New;
  };

  const getLikelihoodColor = (likelihood) => {
    const colors = {
      'Very Unlikely': { bg: '#dcfce7', text: '#16a34a' }, // green
      'Unlikely': { bg: '#fef3c7', text: '#d97706' }, // yellow
      'Possible': { bg: '#fed7aa', text: '#ea580c' }, // orange
      'Likely': { bg: '#fecaca', text: '#dc2626' }, // red
      'Very Likely': { bg: '#fee2e2', text: '#991b1b' }, // dark red
    };
    return colors[likelihood] || { bg: 'white', text: 'black' };
  };

  const getImpactColor = (impact) => {
    const colors = {
      'Low': { bg: '#dcfce7', text: '#16a34a' }, // green
      'Moderate': { bg: '#fef3c7', text: '#d97706' }, // yellow
      'High': { bg: '#fed7aa', text: '#ea580c' }, // orange
      'Severe': { bg: '#fee2e2', text: '#dc2626' }, // red
    };
    return colors[impact] || { bg: 'white', text: 'black' };
  };
  
  const categories = [
    "Compliance",
    "Security",
    "Financial",
    "Operational",
    "Technical",
  ];
  const likelihoods = [
    "Very Unlikely",
    "Unlikely",
    "Possible",
    "Likely",
    "Very Likely",
  ];
  const impacts = ["Severe", "High", "Moderate", "Low"];
  const statuses = ["New", "In Progress", "Mitigated"];

  // Initialize form data
  useEffect(() => {
    if (isOpen || asComponent) {
      setFormData({
        title: "",
        description: "",
        category: "Operational",
        likelihood: "",
        impact: "",
        status: "New",
        owner: user?.username || "",
        dateIdentified: new Date().toISOString().split("T")[0],
        targetMitigation: "",
        mitigationPlan: "",
        project: currentProject
          ? currentProject.id
          : projects.length > 0
          ? projects[0].id
          : "",
        risk_rating: "",
      });
      setErrors({});
    }
  }, [isOpen, asComponent, user, projects, currentProject]);

  // Calculate risk rating
  useEffect(() => {
    const likelihoodMap = {
      "Very Unlikely": 1,
      Unlikely: 2,
      Possible: 3,
      Likely: 4,
      "Very Likely": 5,
    };
    const impactMap = {
      Low: 1,
      Moderate: 2,
      High: 3,
      Severe: 4,
    };

    if (formData.likelihood && formData.impact) {
      const likelihood = likelihoodMap[formData.likelihood];
      const impact = impactMap[formData.impact];
      const rating = likelihood * impact;

      let riskRating = "";
      if (rating <= 4) riskRating = "Low";
      else if (rating <= 8) riskRating = "Medium";
      else if (rating <= 12) riskRating = "High";
      else riskRating = "Critical";

      setFormData((prev) => ({ ...prev, risk_rating: riskRating }));
    }
  }, [formData.likelihood, formData.impact]);

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleClose = () => {
    onClose();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!currentProject && !formData.project) {
      newErrors.project = "A project must be selected.";
    }
    if (!formData.title?.trim()) {
      newErrors.title = "Risk title is required";
    }
    if (!formData.likelihood) {
      newErrors.likelihood = "Likelihood is required";
    }
    if (!formData.impact) {
      newErrors.impact = "Impact is required";
    }
    if (!formData.owner?.trim()) {
      newErrors.owner = "Owner/Assignee is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onCreate(formData);
    } catch (error) {
      console.error("Error creating risk:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  if (!isOpen && !asComponent) return null;

  // Custom Dropdown Component
  const CustomDropdown = ({ 
    name, 
    value, 
    onChange, 
    options, 
    placeholder, 
    getOptionStyle,
    error,
    className = ""
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
      onChange({ target: { name, value: optionValue } });
      setIsOpen(false);
    };

    const selectedOption = options.find(opt => opt === value);
    const selectedStyle = selectedOption ? getOptionStyle(selectedOption) : null;

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 border rounded-lg bg-white transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02] hover:border-teal-300 hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none text-left flex items-center justify-between ${
            error
              ? "border-red-300 bg-red-50 focus:border-teal-500 focus:ring-teal-500"
              : "border-gray-300"
          } ${className}`}
          style={{
            backgroundColor: selectedStyle ? selectedStyle.bg : 'white',
            color: selectedStyle ? selectedStyle.text : '#374151'
          }}
        >
          <span>{value || placeholder}</span>
          <FaChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            <div className="py-2">
              {options.map((option, index) => {
                const optionStyle = getOptionStyle(option);
                return (
                  <div 
                    key={option} 
                    className={`px-4 py-3 hover:bg-gray-100 transition-colors duration-150 cursor-pointer border-gray-100 ${
                      index !== options.length - 1 ? 'border-b' : ''
                    } ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                    onClick={() => handleSelect(option)}
                  >
                    <div className="flex items-center justify-start">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                        style={{
                          backgroundColor: optionStyle.bg,
                          color: optionStyle.text,
                          borderColor: optionStyle.bg,
                        }}
                      >
                        {option}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div
        className={`${
          asComponent
            ? "w-full"
            : "bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
        }`}
      >
        
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Risk Details
                </h3>
                <FaInfoCircle className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Risk Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    maxLength={100}
                    className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02] focus:shadow-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none ${
                      errors.title
                        ? "border-red-300 bg-red-50 focus:border-teal-500 focus:ring-teal-500"
                        : "border-gray-300 hover:border-teal-300 hover:shadow-md"
                    }`}
                    placeholder="Enter risk title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="w-3 h-3 mr-1" />
                      {errors.title}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.title.length}/100 characters
                  </p>
                </div>

                {currentProject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                      {currentProject.name}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Risk will be created for this project
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02] hover:border-teal-300 hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
                    placeholder="Describe the risk in detail"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <CustomDropdown
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      options={categories}
                      placeholder="Select category"
                      getOptionStyle={getCategoryColor}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <CustomDropdown
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={statuses}
                      placeholder="Select status"
                      getOptionStyle={getStatusColor}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Likelihood <span className="text-red-500">*</span>
                    </label>
                    <CustomDropdown
                      name="likelihood"
                      value={formData.likelihood}
                      onChange={handleChange}
                      options={likelihoods}
                      placeholder="Select likelihood"
                      getOptionStyle={getLikelihoodColor}
                      error={errors.likelihood}
                      className={errors.likelihood ? "border-red-300 bg-red-50" : ""}
                    />
                    {errors.likelihood && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="w-3 h-3 mr-1" />
                        {errors.likelihood}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Impact <span className="text-red-500">*</span>
                    </label>
                    <CustomDropdown
                      name="impact"
                      value={formData.impact}
                      onChange={handleChange}
                      options={impacts}
                      placeholder="Select impact"
                      getOptionStyle={getImpactColor}
                      error={errors.impact}
                      className={errors.impact ? "border-red-300 bg-red-50" : ""}
                    />
                    {errors.impact && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="w-3 h-3 mr-1" />
                        {errors.impact}
                      </p>
                    )}
                  </div>
                </div>

                {formData.risk_rating && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Rating (Auto-calculated)
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 flex items-center space-x-2">
                      <RatingBadge rating={formData.risk_rating} />
                      <span className="text-sm text-gray-600">Based on likelihood and impact assessment</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner/Assignee <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="owner"
                    value={formData.owner}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02] focus:shadow-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none ${
                      errors.owner
                        ? "border-red-300 bg-red-50 focus:border-teal-500 focus:ring-teal-500"
                        : "border-gray-300 hover:border-teal-300 hover:shadow-md"
                    }`}
                    placeholder="Enter owner/assignee name"
                  />
                  {errors.owner && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="w-3 h-3 mr-1" />
                      {errors.owner}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Identified
                    </label>
                    <input
                      type="date"
                      name="dateIdentified"
                      value={formData.dateIdentified}
                      onChange={handleChange}
                      max={getCurrentDate()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02] hover:border-teal-300 hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Mitigation Date
                    </label>
                    <input
                      type="date"
                      name="targetMitigation"
                      value={formData.targetMitigation}
                      onChange={handleChange}
                      min={formData.dateIdentified}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02] hover:border-teal-300 hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mitigation Plan
                  </label>
                  <textarea
                    name="mitigationPlan"
                    value={formData.mitigationPlan}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02] hover:border-teal-300 hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
                    placeholder="Describe the mitigation plan"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex-shrink-0">
            <p className="text-xs text-gray-500">
              Fields marked with <span className="text-red-500">*</span> are
              required
            </p>
            <div className="flex items-center space-x-3">
              {!asComponent && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-red-400 shadow hover:bg-red-400 hover:text-white rounded-full font-semibold hover:text-black cursor-pointer"
                >
                  Close
                </button>
              )}
              <button
                  type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting} 
                className="flex items-center justify-center px-5 py-2 rounded-full disabled:opacity-50 bg-white text-teal-400 font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-all duration-300 transform hover:scale-105 focus:scale-105 hover:shadow-lg focus:shadow-lg focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Risk"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  // Return as component or modal based on asComponent prop
  return asComponent ? (
    renderContent()
  ) : (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {renderContent()}
    </div>
  );
}

// Helper Components for Color-coded Badges
function CategoryBadge({ category }) {
  const colors = {
    Compliance: "bg-blue-100 text-blue-800 border-blue-200",
    Security: "bg-red-100 text-red-800 border-red-200",
    Financial: "bg-green-100 text-green-800 border-green-200",
    Operational: "bg-gray-100 text-gray-800 border-gray-200",
    Technical: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[category] || colors.Operational}`}>
      {category}
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = {
    New: "bg-blue-100 text-blue-800 border-blue-200",
    "In Progress": "bg-purple-100 text-purple-800 border-purple-200",
    Mitigated: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.New}`}>
      {status}
    </span>
  );
}

function RatingBadge({ rating }) {
  const colors = {
    Low: "bg-green-100 text-green-800 border-green-200",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[rating] || colors.Low}`}>
      {rating}
    </span>
  );
}
