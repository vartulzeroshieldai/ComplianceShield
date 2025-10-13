// src/DataProtectionPlatform.jsx
import React, { useState, useEffect } from "react";
import DataProtectionLanding from "./DataProtectionLanding";
import CreateDataProtectionProjectModal from "./CreateDataProtectionProjectModal";
import DataProtectionProjectsList from "./DataProtectionProjectsList";
import PrivacyDetection from "./PrivacyDetection";
import { useAuth } from "./AuthContext";

export default function DataProtectionPlatform() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState("landing"); // landing, list, analysis

  // Role-based access control - only Admin and Contributor can access Privacy Detection
  const canAccessPrivacyDetection =
    user && ["Admin", "Contributor"].includes(user.role);

  // Debug logging
  console.log("🔍 DataProtectionPlatform Access Debug:", {
    user: user,
    userRole: user?.role,
    canAccessPrivacyDetection: canAccessPrivacyDetection,
  });

  // If user doesn't have permission, show access denied message
  if (!canAccessPrivacyDetection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the Privacy Detection section.
            This feature is only available to Administrators and Contributors.
          </p>
          <p className="text-sm text-gray-500">
            Current role:{" "}
            <span className="font-semibold">{user?.role || "Unknown"}</span>
          </p>
        </div>
      </div>
    );
  }

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch projects from backend
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const authTokens = localStorage.getItem("authTokens");
      const token = authTokens ? JSON.parse(authTokens).access : null;

      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/privacy-detection/user-projects/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const backendProjects = await response.json();

        // Transform backend projects to match frontend format
        const transformedProjects = backendProjects.map((project) => ({
          id: project.id,
          projectName: project.name,
          targetUrl: "", // Not available in backend model
          type:
            project.project_type.charAt(0).toUpperCase() +
            project.project_type.slice(1),
          priority: "Medium", // Default priority
          owner: project.owner_name || user?.username || "Current User",
          createdAt: project.created_at,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 30 days from now
          // Status will be calculated dynamically in the component based on assessment progress
          status: "Not Started", // Will be overridden by dynamic calculation
          // Completion will be calculated dynamically in the component based on PIA/DPIA/RoPA
          completion: 0, // Will be overridden by dynamic calculation
        }));

        setProjects(transformedProjects);
        setError(null);
      } else if (response.status === 401) {
        setError("Authentication expired. Please login again.");
      } else {
        setError("Failed to load projects");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects on component mount
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const handleCreateProject = () => {
    setShowCreateModal(true);
  };

  const handleViewProjects = () => {
    setCurrentPage("list");
  };

  const handleSubmitProject = (projectData) => {
    if (editingProject) {
      // Update existing project - keep existing status and completion
      setProjects(
        projects.map((p) =>
          p.id === editingProject.id
            ? {
                ...p,
                ...projectData,
                status: p.status,
                completion: p.completion,
              }
            : p
        )
      );
      setEditingProject(null);
    } else {
      // Create new project with "Not Started" status
      const newProject = {
        ...projectData,
        status: "Not Started", // Set initial status to "Not Started"
        completion: 0, // Set initial completion to 0%
      };
      setProjects([newProject, ...projects]);
    }
    setShowCreateModal(false);
    setCurrentPage("list");

    // Refresh projects from backend to ensure consistency
    fetchProjects();
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowCreateModal(true);
  };

  const handleViewProject = (project) => {
    // Update project status to "In Progress" if it's "Not Started"
    if (project.status === "Not Started") {
      setProjects(
        projects.map((p) =>
          p.id === project.id ? { ...p, status: "In Progress" } : p
        )
      );
      // Update the selected project with new status
      setSelectedProject({ ...project, status: "In Progress" });
    } else {
      setSelectedProject(project);
    }
    setCurrentPage("analysis");
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setCurrentPage("list");
  };

  const handleBackToLanding = () => {
    setSelectedProject(null);
    setCurrentPage("landing");
  };

  const handleDeleteProject = (projectId) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      setProjects(projects.filter((p) => p.id !== projectId));
    }
  };

  // Show loading state
  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data protection projects...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Projects
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Page 1: Landing */}
      {currentPage === "landing" && (
        <div className="animate-pageTransition">
          <DataProtectionLanding
            onCreateProject={handleCreateProject}
            onViewProjects={handleViewProjects}
          />
        </div>
      )}

      {/* Page 2: Create Project Modal */}
      <CreateDataProtectionProjectModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingProject(null);
        }}
        onSubmit={handleSubmitProject}
        editingProject={editingProject}
      />

      {/* Page 3: Projects List */}
      {currentPage === "list" && (
        <div className="animate-pageTransition">
          <DataProtectionProjectsList
            projects={projects}
            onViewProject={handleViewProject}
            onCreateNew={handleCreateProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
          />
        </div>
      )}

      {/* Page 4: Privacy Detection/Analysis */}
      {currentPage === "analysis" && selectedProject && (
        <div className="animate-pageTransition">
          {/* Back button */}
          <div className="bg-gray-50 p-4 border-b border-gray-200 hover:bg-gray-100 transition-colors">
            <button
              onClick={handleBackToList}
              className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 font-medium transition-all duration-200 hover:translate-x-[-4px] group"
            >
              <span className="text-xl group-hover:animate-bounce-horizontal">
                ←
              </span>
              <span>Back to Projects</span>
            </button>
          </div>
          <PrivacyDetection selectedProject={selectedProject} />
        </div>
      )}

      {/* Add animations CSS */}
      <style>{`
        @keyframes pageTransition {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-5px); }
        }
        .animate-pageTransition {
          animation: pageTransition 0.4s ease-out;
        }
        .group:hover .group-hover\\:animate-bounce-horizontal {
          animation: bounce-horizontal 0.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
