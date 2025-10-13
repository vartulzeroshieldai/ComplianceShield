// src/CreateDataProtectionProjectModal.jsx
import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { useAuth } from "./AuthContext";

export default function CreateDataProtectionProjectModal({
  isOpen,
  onClose,
  onSubmit,
  editingProject,
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    projectName: "",
    type: "Web",
    priority: "Medium",
    dueDate: "",
  });

  // Populate form data when editing
  useEffect(() => {
    if (editingProject) {
      setFormData({
        projectName: editingProject.projectName || "",
        type: editingProject.type || "Web",
        priority: editingProject.priority || "Medium",
        dueDate: editingProject.dueDate || "",
      });
    } else {
      setFormData({
        projectName: "",
        type: "Web",
        priority: "Medium",
        dueDate: "",
      });
    }
  }, [editingProject, isOpen]);

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        const authTokens = localStorage.getItem("authTokens");
        const token = authTokens ? JSON.parse(authTokens).access : null;

        if (!token) {
          setErrors({ projectName: "Authentication required" });
          return;
        }

        // Create project data for backend
        const projectData = {
          name: formData.projectName,
          description: `Data protection project for ${formData.projectName}`,
          project_type: formData.type.toLowerCase(),
          compliance_project: null, // Can be linked to compliance projects later
        };

        // Submit to backend
        const response = await fetch("/api/privacy-detection/api/projects/", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(projectData),
        });

        if (response.ok) {
          const createdProject = await response.json();

          // Also create a local project for the frontend state
          const localProjectData = {
            ...formData,
            id: createdProject.id,
            owner: user?.username || "Current User",
            createdAt: new Date().toISOString(),
            status: "Not Started",
            completion: 0,
          };

          onSubmit(localProjectData);

          // Reset form
          setFormData({
            projectName: "",
            type: "Web",
            priority: "Medium",
            dueDate: "",
          });
          setErrors({});
        } else if (response.status === 401) {
          setErrors({
            projectName: "Authentication expired. Please login again.",
          });
        } else {
          const errorData = await response.json();
          setErrors({
            projectName: errorData.detail || "Failed to create project",
          });
        }
      } catch (err) {
        console.error("Error creating project:", err);
        setErrors({
          projectName: "Failed to create project. Please try again.",
        });
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      projectName: "",
      type: "Web",
      priority: "Medium",
      dueDate: "",
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all duration-300 animate-scaleIn">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingProject ? "Edit Project" : "Create New Project"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
              aria-label="Close Modal"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="p-6 space-y-6">
            {/* Project Name / Organization Name */}
            <div className="animate-slideIn" style={{ animationDelay: "0.1s" }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Project Name / Organization Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                placeholder="Enter project or organization name"
                className={`w-full px-4 py-3 border ${
                  errors.projectName ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all hover:border-teal-300 hover:shadow-md`}
              />
              {errors.projectName && (
                <p className="mt-1 text-sm text-red-500 animate-shake">
                  {errors.projectName}
                </p>
              )}
            </div>

            {/* Type */}
            <div className="animate-slideIn" style={{ animationDelay: "0.2s" }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all hover:border-teal-300 hover:shadow-md cursor-pointer"
              >
                <option value="Web">Web</option>
                <option value="Mobile">Mobile</option>
                <option value="Code">Code</option>
              </select>
            </div>

            {/* Priority */}
            <div className="animate-slideIn" style={{ animationDelay: "0.3s" }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Priority
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all hover:border-teal-300 hover:shadow-md cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Owner (Read-only) */}
            <div className="animate-slideIn" style={{ animationDelay: "0.4s" }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Owner
              </label>
              <input
                type="text"
                value={user?.username || "Current User"}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Due Date */}
            <div className="animate-slideIn" style={{ animationDelay: "0.5s" }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Due Date
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
                className={`w-full px-4 py-3 border ${
                  errors.dueDate ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all hover:border-teal-300 hover:shadow-md cursor-pointer`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-500 animate-shake">
                  {errors.dueDate}
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 flex items-center justify-end px-6 py-4 space-x-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            {editingProject ? "Update Project" : "Create Project"}
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
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
          animation-fill-mode: both;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
