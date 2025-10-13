import React, { useState, useEffect } from "react";
import { FaDownload, FaFileAlt, FaCalendarAlt, FaCog, FaFilter, FaChartBar } from "react-icons/fa";
import { useAuth } from "./AuthContext";

export default function Report({ project }) {
  const { fetchWithAuth } = useAuth();
  const [reportParameters, setReportParameters] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [dateRange, setDateRange] = useState({
    dateFrom: '',
    dateTo: ''
  });
  const [includeSections, setIncludeSections] = useState({
    executive_summary: true,
    control_details: true,
    compliance_scoring: true,
    risk_assessment: true,
    remediation_plan: true,
    evidence_management: true,
    technical_findings: true,
    stakeholder_data: true
  });
  const [reportTitle, setReportTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project?.id) {
      fetchReportParameters();
      setReportTitle(`${project.name} - ${project.framework_name || 'Compliance'} Assessment Report`);
    }
  }, [project]);

  const fetchReportParameters = async () => {
    try {
      const response = await fetchWithAuth(`/api/projects/${project.id}/report/parameters/`);

      if (response.ok) {
        const data = await response.json();
        setReportParameters(data.available_parameters);
        
        // Set default date range
        if (data.available_parameters.date_range.latest_assessment) {
          setDateRange({
            dateFrom: data.available_parameters.date_range.earliest_assessment || '',
            dateTo: data.available_parameters.date_range.latest_assessment || ''
          });
        }
      } else {
        setError('Failed to fetch report parameters');
      }
    } catch (err) {
      setError('Error fetching report parameters');
      console.error('Error:', err);
    }
  };

  const handleDownloadReport = async () => {
    if (!project?.id) {
      setError('No project selected');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const requestBody = {
        date_from: dateRange.dateFrom || null,
        date_to: dateRange.dateTo || null,
        control_categories: selectedCategories.length > 0 ? selectedCategories : null,
        include_sections: includeSections,
        report_title: reportTitle || `${project.name} - ${project.framework_name || 'Compliance'} Assessment Report`
      };

      const response = await fetchWithAuth(`/api/projects/${project.id}/report/pdf/`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        // Handle PDF download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Get filename from response headers or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `${project.name}_${project.framework_name || 'Compliance'}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log("Report downloaded successfully");
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate report');
      }
    } catch (err) {
      setError('Error generating report');
      console.error('Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewData = async () => {
    if (!project?.id) {
      setError('No project selected');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateRange.dateFrom) params.append('date_from', dateRange.dateFrom);
      if (dateRange.dateTo) params.append('date_to', dateRange.dateTo);
      if (selectedCategories.length > 0) params.append('control_categories', selectedCategories.join(','));
      params.append('format', 'json');

      const response = await fetchWithAuth(`/api/projects/${project.id}/report/data/?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Report data preview:', data);
        
        // You could display this data in a modal or separate component
        alert(`Report preview generated successfully! 
        
Total Controls: ${data.report_data.control_assessment.total_controls_assessed}
Overall Compliance: ${data.report_data.compliance_scoring.overall_compliance_percentage}%
Total Risks: ${data.report_data.risk_assessment.risk_summary.total_risks}
Action Items: ${data.report_data.remediation_planning.action_items_summary.total_items}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate report preview');
      }
    } catch (err) {
      setError('Error generating report preview');
      console.error('Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSectionChange = (section) => {
    setIncludeSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!project) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Please select a project to generate reports.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      {/* Report Header */}
      <div className="text-center max-w-4xl mx-auto">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaFileAlt className="text-teal-600 text-2xl" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Compliance Assessment Report</h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Generate comprehensive compliance reports with detailed control assessments, 
          compliance metrics, risk analysis, and remediation planning for your selected framework.
        </p>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Report Configuration */}
        <div className="mb-8 space-y-6">
          {/* Report Title */}
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Title
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter custom report title..."
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.dateFrom}
                onChange={(e) => setDateRange(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.dateTo}
                onChange={(e) => setDateRange(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="text-left">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 font-medium"
            >
              <FaCog className="text-sm" />
              <span>Advanced Options</span>
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-6 p-4 bg-gray-50 rounded-lg text-left">
              {/* Control Categories */}
              {reportParameters?.control_categories && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <FaFilter className="inline mr-2" />
                    Control Categories (Leave empty for all)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {reportParameters.control_categories.map(category => (
                      <label key={category} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => handleCategoryChange(category)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Report Sections */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Include Sections
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(reportParameters?.report_sections || {}).map(([key, description]) => (
                    <label key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={includeSections[key] || false}
                        onChange={() => handleSectionChange(key)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700" title={description}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handlePreviewData}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-gray-600 text-base font-semibold shadow hover:bg-gray-100 hover:text-gray-800 focus:outline-none transition-all duration-300 ease-in-out cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:transition-none"
          >
            <FaChartBar className="w-4 h-4 transition-transform duration-300 ease-in-out" />
            <span>{isGenerating ? 'Generating...' : 'Preview Data'}</span>
          </button>

          <button
            onClick={handleDownloadReport}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-teal-400 text-base font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-all duration-300 ease-in-out cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:transition-none"
          >
            <FaDownload className="w-4 h-4 transition-transform duration-300 ease-in-out" />
            <span>{isGenerating ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 flex items-center justify-center text-sm text-gray-500">
          <FaCalendarAlt className="mr-2" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>

        {/* Report Info */}
        {reportParameters && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left">
            <h3 className="font-medium text-blue-900 mb-2">Report Information</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Project:</strong> {reportParameters.project_name || project.name}</p>
              <p><strong>Framework:</strong> {reportParameters.framework}</p>
              <p><strong>Available Categories:</strong> {reportParameters.control_categories?.length || 0}</p>
              {reportParameters.date_range?.earliest_assessment && (
                <p><strong>Assessment Period:</strong> {reportParameters.date_range.earliest_assessment} to {reportParameters.date_range.latest_assessment}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
