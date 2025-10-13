// src/components/Projects/Projects.jsx

import React, { useState, useEffect } from "react";
import { FaPlus, FaTimes, FaEllipsisV } from "react-icons/fa";
import classNames from "classnames";
import ProjectOverviewModal from "./ProjectOverviewModal";
import { useAuth } from "./AuthContext";
import { useProjectControl } from "./ProjectControlContext";

export default function Projects({ onOpenProject }) {
  // --- STATE MANAGEMENT ---
  const [projects, setProjects] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, fetchWithAuth } = useAuth();

  // Project control context
  const {
    projects: contextProjects,
    initializeProjects,
    calculateAndUpdateProject,
  } = useProjectControl();

  // State for modals and menus from the design file
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    description: "",
    framework: "",
    organization: null, // ✅ FIX 1: Add organization field to initial state
  });
  const [editingId, setEditingId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [overviewProject, setOverviewProject] = useState(null);

  // --- API DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Debug: Log user organization data
        console.log("Projects - User object:", user);
        console.log("Projects - User organization:", user?.organization);
        console.log(
          "Projects - User organization name:",
          user?.organization?.name
        );

        const [projectsRes, frameworksRes] = await Promise.all([
          fetchWithAuth("/api/projects/"),
          fetchWithAuth("/api/frameworks/"),
        ]);
        if (!projectsRes.ok || !frameworksRes.ok) {
          throw new Error("Failed to fetch data from the server.");
        }
        const projectsData = await projectsRes.json();
        const frameworksData = await frameworksRes.json();

        setProjects(projectsData);
        setFrameworks(frameworksData);
        setError(null);

        // Initialize project control context and calculate data for each project
        initializeProjects(projectsData);

        // Calculate project data for all projects
        projectsData.forEach((project) => {
          if (project?.id) {
            console.log(
              `Projects - Calculating data for project ${project.id} (${project.name})`
            );
            calculateAndUpdateProject(project.id, fetchWithAuth);
          }
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchWithAuth, calculateAndUpdateProject, initializeProjects, user]);

  // --- API MUTATIONS ---
  const handleCreateOrUpdate = async () => {
    const isUpdating = !!editingId;
    const method = isUpdating ? "PUT" : "POST";
    const url = isUpdating ? `/api/projects/${editingId}/` : "/api/projects/";

    // Ensure organization is included in the form data
    const formData = {
      ...form,
      organization: user?.organization?.id || user?.organization || null,
    };

    console.log("Projects - Submitting form data:", formData);
    console.log("Projects - User organization:", user?.organization);

    try {
      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            `Failed to ${isUpdating ? "update" : "create"} project.`
        );
      }
      const savedProject = await response.json();
      if (isUpdating) {
        setProjects(
          projects.map((p) => (p.id === editingId ? savedProject : p))
        );
      } else {
        setProjects([...projects, savedProject]);
      }
      closeModal();
    } catch (err) {
      console.error("Submit error:", err);
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        const response = await fetchWithAuth(`/api/projects/${id}/`, {
          method: "DELETE",
        });
        if (response.status !== 204) {
          throw new Error("Failed to delete project.");
        }
        setProjects(projects.filter((p) => p.id !== id));
        setOpenMenu(null);
        if (overviewProject?.id === id) {
          setOverviewProject(null);
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert(err.message);
      }
    }
  };

  // --- MODAL AND FORM HANDLING ---
  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      organization: user?.organization?.id || user?.organization || null,
      framework: "",
    });
    setStep(1);
    setEditingId(null);
  };
  const openModal = () => {
    resetForm();
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };
  const handleNext = () => {
    if (form.name && form.description) {
      setStep(2);
    }
  };
  const handleFrameworkSelect = (frameworkId) => {
    setForm((f) => ({ ...f, framework: frameworkId }));
  };
  const openEditModal = (proj) => {
    setForm({
      name: proj.name,
      description: proj.description,
      organization: user?.organization?.id || user?.organization || null,
      framework: proj.framework,
    });
    setStep(1);
    setEditingId(proj.id);
    setShowModal(true);
    setOpenMenu(null);
  };

  // Hook to close ellipsis menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".project-menu")) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getFrameworkMeta = (frameworkId) => {
    const framework = frameworks.find((f) => f.id === frameworkId);
    return framework;
  };

  // --- RENDER LOGIC ---
  if (loading)
    return (
      <div className="p-8 text-center text-gray-600">Loading projects...</div>
    );
  if (error)
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  return (
    <>
      <style>
        {`
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}
      </style>
      <div className="w-full h-full p-8 bg-gradient-to-br from-teal-50 via-white to-indigo-50 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <button
            onClick={openModal}
            className="flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-teal-400 text-base font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors cursor-pointer"
          >
            <FaPlus size={18} />
            <span>New Project</span>
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 text-gray-400">
            <h2 className="text-3xl text-gray-200 mb-2">Get Started</h2>
            <p className="mb-4 text-center">
              No projects found. Projects allow you to start working with
              compliance frameworks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(contextProjects.length > 0 ? contextProjects : projects).map(
              (proj) => (
                <div
                  key={proj.id}
                  className="bg-white rounded-lg shadow p-6 relative hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {proj.name}
                    </h3>
                    <div className="relative project-menu">
                      <button
                        onClick={() =>
                          setOpenMenu((id) => (id === proj.id ? null : proj.id))
                        }
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Project options menu"
                      >
                        <FaEllipsisV />
                      </button>
                      {openMenu === proj.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 text-sm z-10">
                          <button
                            onClick={() => openEditModal(proj)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(proj.id)}
                            className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center mb-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90">
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          stroke="#E5E7EB"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          stroke="#14b8a6"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${
                            2 * Math.PI * 50 * (1 - (proj.progress || 0) / 100)
                          }`}
                          strokeLinecap="round"
                          className="progress-circle"
                          style={{
                            strokeDashoffset: `${
                              2 *
                              Math.PI *
                              50 *
                              (1 - (proj.progress || 0) / 100)
                            }`,
                          }}
                        />
                      </svg>
                      <span
                        className="absolute inset-0 flex items-center justify-center text-xl font-medium text-gray-700 transition-all duration-1000 ease-out"
                        style={{
                          animation: "fadeInScale 0.8s ease-out",
                        }}
                      >
                        {proj.progress || 0}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {proj.status || "NOT STARTED"}
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Framework:</span>
                      <button
                        className="inline-block px-3 py-1 bg-teal-100 text-teal-600 text-sm rounded hover:bg-teal-200 transition-colors cursor-pointer"
                        onClick={() => setOverviewProject(proj)}
                      >
                        {proj.framework_name ||
                          getFrameworkMeta(proj.framework)?.name ||
                          (proj.framework
                            ? `ID: ${proj.framework}`
                            : "Not Assigned")}
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid - Now using calculated data from ProjectControlContext */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span>🔒 Controls</span>
                      <span className="ml-auto font-medium">
                        {proj.totalControls || proj.controlsData?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span>📋 Subcontrols</span>
                      <span className="ml-auto font-medium">
                        {proj.totalSubcontrols ||
                          proj.subcontrolsData?.length ||
                          0}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span>👥 Team Members</span>
                      <span className="ml-auto font-medium">
                        {proj.totalTeamMembers ||
                          proj.teamMembersData?.length ||
                          0}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span>📦 Evidence</span>
                      <span className="ml-auto font-medium">
                        {proj.totalEvidence || proj.evidenceData?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
                    Created: {new Date(proj.created_at).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
                    Updated: {new Date(proj.updated_at).toLocaleString()}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Modal for Create/Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            {/* ✅ FIX 3: Changed to rounded-xl and added overflow-hidden */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
              {/* ✅ FIX 4: Updated header styling to match UserManagement */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {step === 1
                    ? editingId
                      ? "Edit Project"
                      : "Create Project"
                    : "Select Framework"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
                  aria-label="Close Modal"
                >
                  <FaTimes size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6 text-gray-900">
                {step === 1 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, name: e.target.value }))
                          }
                          placeholder="Project name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                          Description
                        </label>
                        <input
                          type="text"
                          value={form.description}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Description"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                          Organization
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={
                            user?.organization?.name ||
                            user?.organization ||
                            "No Organization"
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow duration-150 ease-in-out cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-96 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {frameworks.map((fw) => {
                        const isSelected = form.framework === fw.id;
                        return (
                          <button
                            key={fw.id}
                            onClick={() => handleFrameworkSelect(fw.id)}
                            className={classNames(
                              "relative p-4 text-left rounded-lg border bg-white transition-colors w-full h-32 flex flex-col",
                              {
                                "border-2 border-teal-300": isSelected,
                                "border border-gray-300": !isSelected,
                                "hover:bg-teal-50 hover:border-teal-300":
                                  !isSelected,
                              }
                            )}
                          >
                            {/* Tick icon top-right when selected */}
                            {isSelected && (
                              <span className="absolute top-2 right-2 text-teal-400">
                                ✓
                              </span>
                            )}

                            <div className="flex-1 min-h-0">
                              <h3
                                className={classNames(
                                  "font-semibold text-sm leading-tight mb-2 truncate",
                                  isSelected ? "text-teal-600" : "text-black"
                                )}
                                title={fw.name}
                              >
                                {fw.name}
                              </h3>
                              <p
                                className="text-gray-400 text-xs leading-relaxed line-clamp-3 overflow-hidden"
                                title={fw.description}
                              >
                                {fw.description}
                              </p>
                            </div>
                            {/* Spacer to keep consistent height */}
                            <div className="h-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {/* ✅ FIX 5: Updated footer styling to match UserManagement */}
              <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 space-x-3">
                {step === 1 ? (
                  <>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!form.name || !form.description}
                      className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      Next
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCreateOrUpdate}
                    disabled={!form.framework}
                    className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    {editingId ? "Update" : "Create"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {overviewProject && (
          <ProjectOverviewModal
            project={overviewProject}
            framework={frameworks.find(
              (f) => f.id === overviewProject.framework
            )}
            onClose={() => setOverviewProject(null)}
            onDelete={handleDelete}
            onOpenProject={onOpenProject}
          />
        )}
      </div>
    </>
  );
}
