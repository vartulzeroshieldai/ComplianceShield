// src/DataProtectionLanding.jsx
import React, { useState, useEffect } from "react";
import {
  FaShieldAlt,
  FaLock,
  FaFileAlt,
  FaPlus,
  FaList,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartBar,
} from "react-icons/fa";
import { useAuth } from "./AuthContext";
import { usePrivacyDetection } from "./PrivacyDetectionContext";

export default function DataProtectionLanding({
  onCreateProject,
  onViewProjects,
}) {
  const { user } = useAuth();
  const {
    dashboardStats,
    loading,
    error,
    refreshData,
    totalProjects,
    activeScans,
    totalFindings,
    criticalIssues,
  } = usePrivacyDetection();

  // Debug logging
  console.log("🔍 DataProtectionLanding Debug:", {
    user: user,
    userRole: user?.role,
    hasUser: !!user,
    dashboardStats,
    totalProjects,
    activeScans,
    totalFindings,
    criticalIssues,
  });


  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "running":
        return "text-blue-600 bg-blue-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  if (loading) {
    console.log("🔍 Rendering loading state");
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  console.log("🔍 Rendering main content with state:", {
    loading,
    error,
    hasDashboardStats: !!dashboardStats,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-6 animate-fadeIn">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 animate-slideDown">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 animate-bounce-subtle">
              <FaShieldAlt className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3 hover:text-teal-600 transition-colors duration-300">
            Data Protection Platform
          </h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Comprehensive compliance and security analysis for your applications
          </p>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={refreshData}
            className="flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-teal-400 text-base font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors cursor-pointer"
          >
            <FaSpinner className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slideUp">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <FaShieldAlt className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Scans</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeScans}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaSpinner className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Findings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalFindings}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FaExclamationTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {criticalIssues}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FaExclamationTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>


        {/* Get Started Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01] animate-slideUp">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Get Started</h2>
          <p className="text-gray-600 mb-5 text-sm">
            Create a new data protection project to analyze your web
            applications and mobile apps for compliance with GDPR, CCPA, and
            other privacy regulations.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-teal-50 transition-all duration-200 group">
              <div className="flex-shrink-0 w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200 group-hover:shadow-md">
                <span className="text-teal-600 font-bold text-xs">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-0.5 text-sm group-hover:text-teal-600 transition-colors">
                  Upload Your Codebase
                </h3>
                <p className="text-xs text-gray-600">
                  Upload .xr.ar or .zip files containing your web application
                  code
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-teal-50 transition-all duration-200 group">
              <div className="flex-shrink-0 w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200 group-hover:shadow-md">
                <span className="text-teal-600 font-bold text-xs">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-0.5 text-sm group-hover:text-teal-600 transition-colors">
                  Add Mobile Apps
                </h3>
                <p className="text-xs text-gray-600">
                  Include iOS (.ipa) and Android (.apk) applications for
                  comprehensive analysis
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-teal-50 transition-all duration-200 group">
              <div className="flex-shrink-0 w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200 group-hover:shadow-md">
                <span className="text-teal-600 font-bold text-xs">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-0.5 text-sm group-hover:text-teal-600 transition-colors">
                  Analyze & Comply
                </h3>
                <p className="text-xs text-gray-600">
                  Get detailed reports on data collection, storage, and
                  compliance gaps
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCreateProject}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors cursor-pointer"
            >
              <FaPlus size={18} />
              <span>Create New Project</span>
            </button>

            <button
              onClick={onViewProjects}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors cursor-pointer"
            >
              <FaList size={18} />
              <span>View All Projects</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-slideUp">
            <div className="flex items-center space-x-2">
              <FaExclamationTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            {console.log("🔍 Rendering error message:", error)}
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-teal-300 group cursor-pointer animate-slideUp"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-teal-200 transition-all duration-300">
              <FaShieldAlt className="w-5 h-5 text-teal-600 group-hover:text-teal-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5 text-sm group-hover:text-teal-600 transition-colors">
              Privacy Compliance
            </h3>
            <p className="text-xs text-gray-600">
              Automated scanning for GDPR, CCPA, and international privacy
              regulations
            </p>
            <div className="mt-2 text-xs text-teal-600">
              {dashboardStats?.total_scans || 0} scans completed
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-green-300 group cursor-pointer animate-slideUp"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-green-200 transition-all duration-300">
              <FaLock className="w-5 h-5 text-green-600 group-hover:text-green-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5 text-sm group-hover:text-green-600 transition-colors">
              Security Analysis
            </h3>
            <p className="text-xs text-gray-600">
              Identify vulnerabilities and security risks in your applications
            </p>
            <div className="mt-2 text-xs text-green-600">
              {dashboardStats?.completion_rate?.toFixed(1) || 0}% completion
              rate
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-purple-300 group cursor-pointer animate-slideUp"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-200 transition-all duration-300">
              <FaFileAlt className="w-5 h-5 text-purple-600 group-hover:text-purple-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5 text-sm group-hover:text-purple-600 transition-colors">
              Detailed Reports
            </h3>
            <p className="text-xs text-gray-600">
              Comprehensive documentation and actionable recommendations
            </p>
            <div className="mt-2 text-xs text-purple-600">
              {totalFindings} findings identified
            </div>
          </div>
        </div>
      </div>

      {/* Add animations CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.6s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
          animation-fill-mode: both;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
