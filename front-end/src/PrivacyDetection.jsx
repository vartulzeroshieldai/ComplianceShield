// src/PrivacyDetection.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  FaShieldAlt,
  FaPlay,
  FaMobileAlt,
  FaDesktop,
  FaGithub,
  FaGitlab,
  FaSearch,
  FaDownload,
  FaFilter,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaEye,
  FaEyeSlash,
  FaChevronDown,
  FaLink,
  FaTimes,
  FaFileAlt,
  FaDatabase,
  FaCode,
  FaCalendarAlt,
} from "react-icons/fa";

export default function PrivacyDetection({ selectedProject }) {
  const { fetchWithAuth } = useAuth();

  const [selectedRepository, setSelectedRepository] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showPassword, setShowPassword] = useState(false);

  // Code Inspection states
  const [repositoryConnected, setRepositoryConnected] = useState(false);

  // Git-Scan State (uses GitLeaks for secret detection)
  const [gitScan, setGitScan] = useState({
    isRunning: false,
    results: null,
    error: null,
  });

  // SAST-Scan State
  const [sastScan, setSastScan] = useState({
    isRunning: false,
    results: null,
    error: null,
  });

  // Mobile Analysis State
  const [mobileScan, setMobileScan] = useState({
    isRunning: false,
    results: null,
    error: null,
    uploadedFile: null,
  });
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Add new state for cookie analyzer
  const [cookieAnalysis, setCookieAnalysis] = useState({
    isRunning: false,
    results: null,
    error: null,
  });

  // Add new state for security headers check
  const [securityHeadersCheck, setSecurityHeadersCheck] = useState({
    isRunning: false,
    results: null,
    error: null,
  });

  // Add state for Privacy Impact Assessment (PIA)
  const [piaReport, setPiaReport] = useState({
    isGenerating: false,
    report: null,
    error: null,
    showReport: false,
  });

  // Add state for Data Protection Impact Assessment (DPIA)
  const [dpiaReport, setDpiaReport] = useState({
    isGenerating: false,
    report: null,
    error: null,
    showReport: false,
  });

  // Add state for Records of Processing Activities (RoPA)
  const [ropaReport, setRopaReport] = useState({
    isGenerating: false,
    report: null,
    error: null,
    showReport: false,
  });

  // Calculate dynamic progress data based on scan results using useMemo
  const progressData = React.useMemo(() => {
    let completedChecks = 0;
    const totalChecks = 7; // 2 web + 2 mobile + 1 code + 2 privacy (PIA excluded for now)

    // Web Checks
    const webAccepted =
      (securityHeadersCheck.results ? 1 : 0) + (cookieAnalysis.results ? 1 : 0);
    const webPending = 2 - webAccepted;

    completedChecks += webAccepted;

    // Mobile Checks (currently always pending as there's no mobile scan yet)
    const mobileAccepted = mobileScan.results ? 2 : 0;
    const mobilePending = 2 - mobileAccepted;

    completedChecks += mobileAccepted;

    // Code Inspection
    const codeFindings = gitScan.results?.gitleaks?.findings || [];
    const totalFindings = codeFindings.length;
    const codeAccepted = gitScan.results ? 1 : 0;

    completedChecks += codeAccepted;

    // Privacy Reports (DPIA and RoPA - PIA excluded)
    const privacyAccepted = 0; // None implemented yet
    const privacyPending = 2; // DPIA and RoPA

    completedChecks += privacyAccepted;

    // Calculate overall progress percentage
    const overallProgress = Math.round((completedChecks / totalChecks) * 100);

    return {
      overall: overallProgress,
      webChecks: {
        accepted: webAccepted,
        pending: webPending,
        rejected: 0,
      },
      mobileChecks: {
        accepted: mobileAccepted,
        pending: mobilePending,
        rejected: 0,
      },
      codeInspection: {
        totalFindings: totalFindings,
        open: totalFindings, // All findings are open for now
        resolved: 0,
      },
      privacyReports: {
        accepted: privacyAccepted,
        pending: privacyPending,
        rejected: 0,
      },
    };
  }, [
    securityHeadersCheck.results,
    cookieAnalysis.results,
    mobileScan.results,
    gitScan.results,
  ]);

  const [websiteUrl, setWebsiteUrl] = useState(
    selectedProject?.targetUrl || ""
  );

  // Load privacy assessment results from database
  const loadPrivacyResults = React.useCallback(async () => {
    if (!selectedProject) return;

    setLoadingResults(true);
    try {
      // Load PIA results
      const piaResponse = await fetchWithAuth(
        "/api/privacy-detection/pia-results/"
      );
      const piaData = await piaResponse.json();

      // Load DPIA results
      const dpiaResponse = await fetchWithAuth(
        "/api/privacy-detection/dpia-results/"
      );
      const dpiaData = await dpiaResponse.json();

      // Load RoPA results
      const ropaResponse = await fetchWithAuth(
        "/api/privacy-detection/ropa-results/"
      );
      const ropaData = await ropaResponse.json();

      const privacyResults = [];

      // Add PIA results
      if (piaData.results && piaData.results.length > 0) {
        const latestPIA = piaData.results[0]; // Get most recent
        privacyResults.push({
          id: latestPIA.id,
          check: "Privacy Impact Assessment (PIA)",
          type: "Privacy",
          status:
            latestPIA.overall_risk_level === "CRITICAL"
              ? "Failed"
              : latestPIA.overall_risk_level === "HIGH"
              ? "Warning"
              : "Passed",
          findings: `Risk: ${latestPIA.overall_risk_level} (${latestPIA.risk_score}/100) | ${latestPIA.total_risks} Total Risks (${latestPIA.critical_risks} Critical, ${latestPIA.high_risks} High, ${latestPIA.medium_risks} Medium)`,
          date: new Date(latestPIA.generated_at).toLocaleDateString(),
          actions: "View PIA Report",
          piaData: latestPIA.full_report,
        });
      }

      // Add DPIA results
      if (dpiaData.results && dpiaData.results.length > 0) {
        const latestDPIA = dpiaData.results[0]; // Get most recent
        privacyResults.push({
          id: latestDPIA.id,
          check: "Data Protection Impact Assessment (DPIA)",
          type: "Privacy",
          status:
            latestDPIA.overall_risk_level === "CRITICAL"
              ? "Failed"
              : latestDPIA.overall_risk_level === "HIGH"
              ? "Warning"
              : "Passed",
          findings: `Risk: ${latestDPIA.overall_risk_level} (${
            latestDPIA.risk_score
          }/100) | Impact: ${
            latestDPIA.overall_impact_score > 60
              ? "HIGH"
              : latestDPIA.overall_impact_score > 30
              ? "MEDIUM"
              : "LOW"
          } (${latestDPIA.overall_impact_score}/100) | Compliance: ${
            latestDPIA.overall_compliance_score > 80
              ? "EXCELLENT"
              : latestDPIA.overall_compliance_score > 60
              ? "GOOD"
              : "FAIR"
          } (${latestDPIA.overall_compliance_score}/100) | ${
            latestDPIA.total_risks
          } Total Risks (${latestDPIA.critical_risks} Critical, ${
            latestDPIA.high_risks
          } High, ${latestDPIA.medium_risks} Medium)`,
          date: new Date(latestDPIA.generated_at).toLocaleDateString(),
          actions: "View DPIA Report",
          dpiaData: latestDPIA.full_report,
        });
      }

      // Add RoPA results
      if (ropaData.results && ropaData.results.length > 0) {
        const latestRoPA = ropaData.results[0]; // Get most recent
        privacyResults.push({
          id: latestRoPA.id,
          check: "Records of Processing Activities (RoPA)",
          type: "Privacy",
          status:
            latestRoPA.overall_risk_level === "CRITICAL"
              ? "Failed"
              : latestRoPA.overall_risk_level === "HIGH"
              ? "Warning"
              : "Passed",
          findings: `Risk: ${latestRoPA.overall_risk_level} (${
            latestRoPA.risk_score
          }/100) | Impact: ${
            latestRoPA.overall_impact_score > 60
              ? "HIGH"
              : latestRoPA.overall_impact_score > 30
              ? "MEDIUM"
              : "LOW"
          } (${latestRoPA.overall_impact_score}/100) | Compliance: ${
            latestRoPA.overall_compliance_score > 80
              ? "EXCELLENT"
              : latestRoPA.overall_compliance_score > 60
              ? "GOOD"
              : "FAIR"
          } (${latestRoPA.overall_compliance_score}/100) | ${
            latestRoPA.total_processing_activities
          } Processing Activities | ${latestRoPA.total_risks} Total Risks (${
            latestRoPA.critical_risks
          } Critical, ${latestRoPA.high_risks} High, ${
            latestRoPA.medium_risks
          } Medium)`,
          date: new Date(latestRoPA.generated_at).toLocaleDateString(),
          actions: "View RoPA Report",
          ropaData: latestRoPA.full_report,
        });
      }

      setResults(privacyResults);
    } catch (error) {
      console.error("Failed to load privacy results:", error);
    } finally {
      setLoadingResults(false);
    }
  }, [selectedProject, fetchWithAuth]);

  // Calculate Project Health Score based on assessment results
  const calculateProjectHealth = React.useCallback(() => {
    const scores = [];

    // Get data from results table (database data)
    const piaResult = results.find(
      (r) => r.check === "Privacy Impact Assessment (PIA)"
    );
    const dpiaResult = results.find(
      (r) => r.check === "Data Protection Impact Assessment (DPIA)"
    );
    const ropaResult = results.find(
      (r) => r.check === "Records of Processing Activities (RoPA)"
    );

    // PIA Score (30% weight) - Extract risk score from findings
    if (piaResult?.findings) {
      const riskMatch = piaResult.findings.match(
        /Risk: \w+ \((\d+(?:\.\d+)?)\/100\)/
      );
      if (riskMatch) {
        const riskScore = parseFloat(riskMatch[1]);
        const piaHealth = Math.max(0, 100 - riskScore);
        scores.push({
          score: piaHealth,
          weight: 0.3,
          source: "PIA",
        });
      }
    }

    // DPIA Compliance (25% weight) - Extract compliance score from findings
    if (dpiaResult?.findings) {
      const complianceMatch = dpiaResult.findings.match(
        /Compliance: \w+ \((\d+(?:\.\d+)?)\/100\)/
      );
      if (complianceMatch) {
        const complianceScore = parseFloat(complianceMatch[1]);
        scores.push({
          score: complianceScore,
          weight: 0.25,
          source: "DPIA",
        });
      }
    }

    // RoPA Compliance (25% weight) - Extract compliance score from findings
    if (ropaResult?.findings) {
      const complianceMatch = ropaResult.findings.match(
        /Compliance: \w+ \((\d+(?:\.\d+)?)\/100\)/
      );
      if (complianceMatch) {
        const complianceScore = parseFloat(complianceMatch[1]);
        scores.push({
          score: complianceScore,
          weight: 0.25,
          source: "RoPA",
        });
      }
    }

    // Git-Scan Security (20% weight) - Based on findings
    if (gitScan.results?.total_findings !== undefined) {
      const securityScore = Math.max(
        0,
        100 - gitScan.results.total_findings * 5
      );
      scores.push({
        score: securityScore,
        weight: 0.2,
        source: "Git-Scan",
      });
    }

    // Calculate weighted average
    if (scores.length === 0) return 0;

    const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
    const weightedScore = scores.reduce(
      (sum, item) => sum + item.score * item.weight,
      0
    );

    return Math.round(weightedScore / totalWeight);
  }, [results, gitScan.results]);

  // Calculate Scan Progress based on completed scans
  const calculateScanProgress = React.useCallback(() => {
    const totalScans = 4; // Git-Scan, Security Headers, Cookie Analysis, Mobile Analysis
    let completedScans = 0;

    // Check which scans have been completed
    if (gitScan.results) completedScans++;
    if (securityHeadersCheck.results) completedScans++;
    if (cookieAnalysis.results) completedScans++;
    if (mobileScan.results) completedScans++;

    return Math.round((completedScans / totalScans) * 100);
  }, [
    gitScan.results,
    securityHeadersCheck.results,
    cookieAnalysis.results,
    mobileScan.results,
  ]);

  // Get health level and color
  const getHealthLevel = (score) => {
    if (score >= 80)
      return {
        level: "Excellent",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    if (score >= 60)
      return { level: "Good", color: "text-blue-600", bgColor: "bg-blue-100" };
    if (score >= 40)
      return {
        level: "Fair",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      };
    return { level: "Poor", color: "text-red-600", bgColor: "bg-red-100" };
  };

  // Load privacy results when component mounts or project changes
  useEffect(() => {
    if (selectedProject) {
      loadPrivacyResults();
    }
  }, [selectedProject, loadPrivacyResults]);

  // Clear results when inputs change
  useEffect(() => {
    if (selectedRepository) {
      setGitScan({ isRunning: false, results: null, error: null });
      setRepositoryConnected(false);
    }
  }, [selectedRepository]);

  useEffect(() => {
    if (selectedBranch) {
      setGitScan({ isRunning: false, results: null, error: null });
      setRepositoryConnected(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (websiteUrl) {
      setSecurityHeadersCheck({ isRunning: false, results: null, error: null });
      setCookieAnalysis({ isRunning: false, results: null, error: null });
    }
  }, [websiteUrl]);

  const handleRunCheck = async (checkType) => {
    // Validate URL before running any check
    if (!websiteUrl.trim()) {
      alert("Please enter a website URL to analyze");
      return;
    }

    if (checkType === "cookie-analyzer") {
      await runCookieAnalyzer();
    } else if (checkType === "security-headers") {
      await runSecurityHeadersCheck();
    } else {
      console.log(`Running ${checkType} check...`);
      // Add your other check logic here
    }
  };

  const runCookieAnalyzer = async () => {
    if (!websiteUrl.trim()) {
      alert("Please enter a website URL to analyze");
      return;
    }

    setCookieAnalysis((prev) => ({ ...prev, isRunning: true, error: null }));

    try {
      // Try the privacy detection API first using fetchWithAuth (handles token refresh automatically)
      let response = await fetchWithAuth(
        "/api/privacy-detection/cookie-analyzer/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: websiteUrl }),
        }
      );

      // Fallback to auditing API if privacy detection API fails
      if (!response.ok && response.status === 404) {
        response = await fetchWithAuth("/api/auditing/cookie-analyzer/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: websiteUrl }),
        });
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication expired. Please login again.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCookieAnalysis((prev) => ({
        ...prev,
        isRunning: false,
        results: data,
      }));

      // Note: Cookie Analyzer results are not added to the Privacy Assessment Results table
      // as this table should only show Privacy Assessments (PIA, DPIA, RoPA)

      // Progress data is now calculated dynamically using useMemo
    } catch (error) {
      setCookieAnalysis((prev) => ({
        ...prev,
        isRunning: false,
        error: error.message,
      }));
      console.error("Cookie analysis failed:", error);
    }
  };

  const runSecurityHeadersCheck = async () => {
    setSecurityHeadersCheck((prev) => ({
      ...prev,
      isRunning: true,
      error: null,
    }));

    try {
      // Call security headers API using fetchWithAuth (handles token refresh automatically)
      const response = await fetchWithAuth(
        "/api/privacy-detection/security-headers/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: websiteUrl }),
        }
      );

      const data = await response.json();

      setSecurityHeadersCheck((prev) => ({
        ...prev,
        isRunning: false,
        results: data,
      }));

      // Note: Security Headers results are not added to the Privacy Assessment Results table
      // as this table should only show Privacy Assessments (PIA, DPIA, RoPA)

      // Progress data is now calculated dynamically using useMemo
    } catch (error) {
      setSecurityHeadersCheck((prev) => ({
        ...prev,
        isRunning: false,
        error: error.message,
      }));
      console.error("Security headers check failed:", error);
    }
  };

  const handleRepositoryConnect = async () => {
    if (!selectedRepository.trim() || !selectedBranch.trim()) {
      alert("Please enter both repository URL and access token");
      return;
    }

    try {
      console.log("🔍 Attempting repository connection:", {
        repository_url: selectedRepository,
        access_token: selectedBranch ? "***" : "None",
      });

      // Test repository connection
      const response = await fetchWithAuth(
        "/api/privacy-detection/test-repository-connection/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repository_url: selectedRepository,
            access_token: selectedBranch,
          }),
        }
      );

      console.log(
        "🔍 Repository connection response:",
        response.status,
        response.ok
      );

      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Repository connection success:", data);
        setRepositoryConnected(true);

        alert("Repository connected successfully!");
      } else {
        const errorData = await response.json();
        console.error("🔍 Repository connection error response:", errorData);
        throw new Error(errorData.error || "Failed to connect to repository");
      }
    } catch (error) {
      console.error("Repository connection error:", error);
      alert(
        `Failed to connect to repository: ${error.message}. Please check your URL and token.`
      );
    }
  };

  // Git-Scan Handler (uses GitLeaks for secret detection)
  const handleGitScan = async () => {
    if (!repositoryConnected) {
      alert("Please connect to repository first");
      return;
    }

    setGitScan({ isRunning: true, results: null, error: null });

    try {
      // Run GitLeaks scan only
      const gitleaksResponse = await fetchWithAuth(
        "/api/privacy-detection/gitleaks-scan/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repository_url: selectedRepository,
            access_token: selectedBranch,
          }),
        }
      );

      const gitleaksData = await gitleaksResponse.json();

      // Categorize findings by type
      const categories = {
        aws_keys: 0,
        api_keys: 0,
        tokens: 0,
        passwords: 0,
        private_keys: 0,
        generic_secrets: 0,
      };

      if (gitleaksData.findings && Array.isArray(gitleaksData.findings)) {
        gitleaksData.findings.forEach((finding) => {
          const type = (finding.type || "").toLowerCase();

          if (type.includes("aws")) {
            categories.aws_keys++;
          } else if (type.includes("api-key") || type.includes("apikey")) {
            categories.api_keys++;
          } else if (type.includes("token")) {
            categories.tokens++;
          } else if (type.includes("password") || type.includes("passwd")) {
            categories.passwords++;
          } else if (type.includes("private") || type.includes("key")) {
            categories.private_keys++;
          } else {
            categories.generic_secrets++;
          }
        });
      }

      // Set results with categories
      const results = {
        gitleaks: gitleaksData,
        totalFindings: gitleaksData.findings?.length || 0,
        categories: categories,
      };

      setGitScan({ isRunning: false, results: results, error: null });
    } catch (error) {
      setGitScan({ isRunning: false, results: null, error: error.message });
    }
  };

  // SAST-Scan File Upload Handler
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSastScan((prev) => ({
        ...prev,
        uploadedFile: file,
        results: null,
        error: null,
        isRunning: false,
      }));
    }
  };

  // SAST-Scan Handler
  const handleSastScan = async () => {
    if (!sastScan.uploadedFile) {
      alert("Please upload a file first");
      return;
    }

    setSastScan((prev) => ({ ...prev, isRunning: true, error: null }));

    try {
      const formData = new FormData();
      formData.append("file", sastScan.uploadedFile);

      const response = await fetchWithAuth(
        "/api/privacy-detection/sast-scan/",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      setSastScan((prev) => ({
        ...prev,
        isRunning: false,
        results: data,
        error: null,
      }));
    } catch (error) {
      setSastScan((prev) => ({
        ...prev,
        isRunning: false,
        error: error.message,
      }));
    }
  };

  // Mobile Analysis File Upload Handler
  const handleMobileFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setMobileScan((prev) => ({
        ...prev,
        uploadedFile: file,
        results: null,
        error: null,
        isRunning: false,
      }));
    }
  };

  // Mobile Analysis Handler
  const handleMobileScan = async () => {
    if (!mobileScan.uploadedFile) {
      alert("Please upload an APK or IPA file first");
      return;
    }

    setMobileScan((prev) => ({ ...prev, isRunning: true, error: null }));

    try {
      const formData = new FormData();
      formData.append("file", mobileScan.uploadedFile);
      formData.append("scan_type", "static"); // Always use static analysis

      const response = await fetchWithAuth(
        "/api/privacy-detection/mobile-scan/",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      setMobileScan((prev) => ({
        ...prev,
        isRunning: false,
        results: data,
        error: null,
      }));
    } catch (error) {
      setMobileScan((prev) => ({
        ...prev,
        isRunning: false,
        error: error.message,
      }));
    }
  };

  // Privacy Impact Assessment (PIA) Handler
  const handleGeneratePIA = async () => {
    // Check if at least one scan has been completed
    if (
      !gitScan.results &&
      !securityHeadersCheck.results &&
      !cookieAnalysis.results &&
      !sastScan.results &&
      !mobileScan.results
    ) {
      alert(
        "Please complete at least one scan (Git-Scan, Security Headers, Cookie Analyzer, SAST-Scan, or Mobile Analysis) before generating PIA report"
      );
      return;
    }

    setPiaReport((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      console.log("🔍 Generating PIA report...");

      // Prepare scan results for PIA analysis
      const requestData = {
        git_scan_results: gitScan.results?.gitleaks || null,
        security_headers_results: securityHeadersCheck.results || null,
        cookie_analysis_results: cookieAnalysis.results || null,
        sast_scan_results: sastScan.results || null,
        mobile_scan_results: mobileScan.results || null,
        project_info: {
          name: selectedProject?.projectName || "Privacy Detection Project",
          type: selectedProject?.type || "Unknown",
          url: websiteUrl || selectedRepository || "Not specified",
        },
      };

      console.log(
        "🔍 DEBUG: Sending PIA request with project_info:",
        requestData.project_info
      );

      console.log("🔍 PIA request data:", {
        hasGitScan: !!requestData.git_scan_results,
        hasSecurityHeaders: !!requestData.security_headers_results,
        hasCookieAnalysis: !!requestData.cookie_analysis_results,
        hasTruffleScan: !!requestData.truffle_scan_results,
        hasMobileScan: !!requestData.mobile_scan_results,
      });

      const response = await fetchWithAuth(
        "/api/privacy-detection/generate-pia/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PIA report");
      }

      const piaData = await response.json();
      console.log("🔍 PIA report generated successfully:", piaData);

      setPiaReport({
        isGenerating: false,
        report: piaData,
        error: null,
        showReport: true,
      });

      // Update results array - replace existing PIA result or add new one
      setResults((prevResults) => {
        const filteredResults = prevResults.filter(
          (r) => r.check !== "Privacy Impact Assessment (PIA)"
        );

        const piaResultEntry = {
          id: piaData.pia_result_id || Date.now(),
          check: "Privacy Impact Assessment (PIA)",
          type: "Privacy",
          status:
            piaData.overall_risk.risk_level === "CRITICAL"
              ? "Failed"
              : piaData.overall_risk.risk_level === "HIGH"
              ? "Warning"
              : "Passed",
          findings: `Risk: ${piaData.overall_risk.risk_level} (${piaData.overall_risk.risk_score}/100) | ${piaData.risk_assessment.total_risks} Total Risks (${piaData.risk_assessment.risk_distribution.critical} Critical, ${piaData.risk_assessment.risk_distribution.high} High, ${piaData.risk_assessment.risk_distribution.medium} Medium)`,
          date: new Date().toLocaleDateString(),
          actions: "View PIA Report",
          piaData: piaData, // Store full report for viewing
        };

        return [...filteredResults, piaResultEntry];
      });
    } catch (error) {
      console.error("PIA generation error:", error);
      setPiaReport((prev) => ({
        ...prev,
        isGenerating: false,
        error: error.message,
      }));
      alert(`Failed to generate PIA report: ${error.message}`);
    }
  };

  // Data Protection Impact Assessment (DPIA) Handler
  const handleGenerateDPIA = async () => {
    // Check if at least one scan has been completed
    if (
      !gitScan.results &&
      !securityHeadersCheck.results &&
      !cookieAnalysis.results &&
      !mobileScan.results &&
      !sastScan.results
    ) {
      setDpiaReport((prev) => ({
        ...prev,
        error: "Please run at least one scan before generating DPIA report",
      }));
      return;
    }

    setDpiaReport((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      console.log("🔍 Generating DPIA report...");

      // Prepare scan results for DPIA analysis
      const requestData = {
        git_scan_results: gitScan.results?.gitleaks || null,
        security_headers_results: securityHeadersCheck.results || null,
        cookie_analysis_results: cookieAnalysis.results || null,
        truffle_scan_results: sastScan.results || null,
        mobile_scan_results: mobileScan.results || null,
        project_info: {
          name: selectedProject?.projectName || "Unknown Project",
          type: selectedProject?.type || "Web Application",
          url: websiteUrl || selectedRepository || "Not specified",
        },
      };

      console.log(
        "🔍 DEBUG: Sending DPIA request with project_info:",
        requestData.project_info
      );

      const response = await fetchWithAuth(
        "/api/privacy-detection/generate-dpia/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const dpiaData = await response.json();
      console.log("🔍 DPIA report generated:", dpiaData);

      setDpiaReport((prev) => ({
        ...prev,
        isGenerating: false,
        report: dpiaData,
        showReport: true,
      }));

      // Update results array - replace existing DPIA result or add new one
      setResults((prevResults) => {
        const filteredResults = prevResults.filter(
          (r) => r.check !== "Data Protection Impact Assessment (DPIA)"
        );

        const dpiaResultEntry = {
          id: dpiaData.dpia_result_id || Date.now(),
          check: "Data Protection Impact Assessment (DPIA)",
          type: "Privacy",
          status:
            dpiaData.overall_risk.risk_level === "CRITICAL"
              ? "Failed"
              : dpiaData.overall_risk.risk_level === "HIGH"
              ? "Warning"
              : "Passed",
          findings: `Risk: ${dpiaData.overall_risk.risk_level} (${dpiaData.overall_risk.risk_score}/100) | Impact: ${dpiaData.overall_impact.impact_level} (${dpiaData.overall_impact.impact_score}/100) | Compliance: ${dpiaData.overall_compliance.compliance_level} (${dpiaData.overall_compliance.compliance_score}/100) | ${dpiaData.risk_assessment.total_risks} Total Risks (${dpiaData.risk_assessment.risk_distribution.critical} Critical, ${dpiaData.risk_assessment.risk_distribution.high} High, ${dpiaData.risk_assessment.risk_distribution.medium} Medium)`,
          date: new Date().toLocaleDateString(),
          actions: "View DPIA Report",
          dpiaData: dpiaData, // Store full report for viewing
        };

        return [...filteredResults, dpiaResultEntry];
      });
    } catch (error) {
      console.error("DPIA generation error:", error);
      setDpiaReport((prev) => ({
        ...prev,
        isGenerating: false,
        error: error.message,
      }));
      alert(`Failed to generate DPIA report: ${error.message}`);
    }
  };

  const handleGenerateRoPA = async () => {
    // Check if at least one scan has been completed
    if (
      !gitScan.results &&
      !securityHeadersCheck.results &&
      !cookieAnalysis.results &&
      !mobileScan.results &&
      !sastScan.results
    ) {
      setRopaReport((prev) => ({
        ...prev,
        error: "Please run at least one scan before generating RoPA report",
      }));
      return;
    }

    setRopaReport((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      console.log("🔍 Generating RoPA report...");

      // Prepare scan results for RoPA analysis
      const requestData = {
        git_scan_results: gitScan.results?.gitleaks || null,
        security_headers_results: securityHeadersCheck.results || null,
        cookie_analysis_results: cookieAnalysis.results || null,
        truffle_scan_results: sastScan.results || null,
        mobile_scan_results: mobileScan.results || null,
        project_info: {
          name: selectedProject?.projectName || "Unknown Project",
          type: selectedProject?.type || "Web Application",
          url: websiteUrl || selectedRepository || "Not specified",
        },
      };

      console.log(
        "🔍 DEBUG: Sending RoPA request with project_info:",
        requestData.project_info
      );

      const response = await fetchWithAuth(
        "/api/privacy-detection/generate-ropa/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ropaData = await response.json();
      console.log("🔍 RoPA report generated:", ropaData);

      setRopaReport((prev) => ({
        ...prev,
        isGenerating: false,
        report: ropaData,
        showReport: true,
      }));

      // Update results array - replace existing RoPA result or add new one
      setResults((prevResults) => {
        const filteredResults = prevResults.filter(
          (r) => r.check !== "Records of Processing Activities (RoPA)"
        );

        const ropaResultEntry = {
          id: ropaData.ropa_result_id || Date.now(),
          check: "Records of Processing Activities (RoPA)",
          type: "Privacy",
          status:
            ropaData.overall_risk.risk_level === "CRITICAL"
              ? "Failed"
              : ropaData.overall_risk.risk_level === "HIGH"
              ? "Warning"
              : "Passed",
          findings: `Risk: ${ropaData.overall_risk.risk_level} (${ropaData.overall_risk.risk_score}/100) | Impact: ${ropaData.overall_impact.impact_level} (${ropaData.overall_impact.impact_score}/100) | Compliance: ${ropaData.overall_compliance.compliance_level} (${ropaData.overall_compliance.compliance_score}/100) | ${ropaData.data_inventory.total_processing_activities} Processing Activities | ${ropaData.risk_assessment.total_risks} Total Risks (${ropaData.risk_assessment.risk_distribution.critical} Critical, ${ropaData.risk_assessment.risk_distribution.high} High, ${ropaData.risk_assessment.risk_distribution.medium} Medium)`,
          date: new Date().toLocaleDateString(),
          actions: "View RoPA Report",
          ropaData: ropaData, // Store full report for viewing
        };

        return [...filteredResults, ropaResultEntry];
      });
    } catch (error) {
      console.error("RoPA generation error:", error);
      setRopaReport((prev) => ({
        ...prev,
        isGenerating: false,
        error: error.message,
      }));
      alert(`Failed to generate RoPA report: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Passed":
        return "text-green-600 bg-green-100";
      case "Warning":
        return "text-yellow-600 bg-yellow-100";
      case "Failed":
        return "text-red-600 bg-red-100";
      case "Pending":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Filter results based on search term, type filter, and status filter
  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.check.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.findings.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "All" || result.type === filterType;
    const matchesStatus =
      statusFilter === "All" || result.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Get counts for each status based on type filter (but not status filter)
  const getStatusCounts = () => {
    // Filter by type only (not by status)
    const typeFilteredResults = results.filter((result) => {
      const matchesType = filterType === "All" || result.type === filterType;
      return matchesType;
    });

    const counts = {
      All: typeFilteredResults.length,
      Passed: typeFilteredResults.filter((r) => r.status === "Passed").length,
      Warning: typeFilteredResults.filter((r) => r.status === "Warning").length,
      Failed: typeFilteredResults.filter((r) => r.status === "Failed").length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Full Width Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 rounded-xl">
              <FaShieldAlt className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedProject
                  ? selectedProject.projectName
                  : "Analysis & Privacy Checks"}
              </h1>
              <p className="text-gray-600">
                {selectedProject
                  ? `${selectedProject.type} Project • Priority: ${selectedProject.priority} • Owner: ${selectedProject.owner}`
                  : "Comprehensive privacy and security analysis tools"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer">
              Schedule
            </button>
            <button className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer">
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Analysis Checkers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Web Analysis Checker */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FaDesktop className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Web Analysis Checker
                  </h3>
                </div>
              </div>

              {/* Common URL Input Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  placeholder="Enter website URL (e.g., https://example.com)"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:outline-none text-sm"
                />
              </div>

              <div className="space-y-4">
                {/* Security Headers Check Container */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Run Security Headers Check
                    </h4>
                    <button
                      onClick={() => handleRunCheck("security-headers")}
                      disabled={securityHeadersCheck.isRunning}
                      className={`px-4 py-2 font-semibold rounded-full shadow transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer text-sm flex items-center space-x-2 ${
                        securityHeadersCheck.isRunning
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-white text-teal-500 hover:bg-teal-500 hover:text-white"
                      }`}
                    >
                      <FaPlay className="w-3 h-3" />
                      <span>
                        {securityHeadersCheck.isRunning
                          ? "Checking..."
                          : "Run Check"}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Displays results:</span>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="flex items-center space-x-1">
                          <span className="text-green-600">✅</span>
                          <span>
                            Secure headers (
                            {securityHeadersCheck.results?.summary
                              ?.secure_count || 0}
                            )
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="text-yellow-600">⚠️</span>
                          <span>
                            Weak headers (
                            {securityHeadersCheck.results?.summary
                              ?.weak_count || 0}
                            )
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="text-red-600">❌</span>
                          <span>
                            Missing headers (
                            {securityHeadersCheck.results?.summary
                              ?.missing_count || 0}
                            )
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>Status:</span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            securityHeadersCheck.isRunning
                              ? "bg-blue-100 text-blue-800"
                              : securityHeadersCheck.results
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          <span
                            className={`mr-1 ${
                              securityHeadersCheck.isRunning
                                ? "text-blue-600"
                                : securityHeadersCheck.results
                                ? "text-green-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {securityHeadersCheck.isRunning
                              ? "🔄"
                              : securityHeadersCheck.results
                              ? "✅"
                              : "⚠️"}
                          </span>
                          {securityHeadersCheck.isRunning
                            ? "Running"
                            : securityHeadersCheck.results
                            ? "Completed"
                            : "Pending"}
                        </span>
                      </div>
                      <span>
                        Last Run:{" "}
                        {securityHeadersCheck.results
                          ? new Date().toLocaleTimeString()
                          : "—"}
                      </span>
                    </div>

                    {/* Results Display */}
                    {securityHeadersCheck.results && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-2">
                          Security Headers Results
                        </h5>
                        <div className="text-sm text-gray-600">
                          <p>Analysis completed for: {websiteUrl}</p>

                          {/* Summary Statistics */}
                          {securityHeadersCheck.results.summary && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">
                                  Security Score:
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    securityHeadersCheck.results.summary
                                      .security_score >= 80
                                      ? "bg-green-100 text-green-800"
                                      : securityHeadersCheck.results.summary
                                          .security_score >= 60
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {
                                    securityHeadersCheck.results.summary
                                      .security_score
                                  }
                                  %
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">Risk Level:</span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    securityHeadersCheck.results.summary
                                      .risk_level === "LOW"
                                      ? "bg-green-100 text-green-800"
                                      : securityHeadersCheck.results.summary
                                          .risk_level === "MEDIUM"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {
                                    securityHeadersCheck.results.summary
                                      .risk_level
                                  }
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">
                                  Secure Headers:
                                </span>
                                <span className="text-green-600 font-medium">
                                  {
                                    securityHeadersCheck.results.summary
                                      .secure_count
                                  }
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">
                                  Missing Headers:
                                </span>
                                <span className="text-red-600 font-medium">
                                  {
                                    securityHeadersCheck.results.summary
                                      .missing_count
                                  }
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Compliance Status */}
                          {securityHeadersCheck.results.summary
                            ?.compliance_status && (
                            <div className="mt-3 flex items-center space-x-2">
                              <span className="font-medium">
                                Compliance Status:
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  securityHeadersCheck.results.summary
                                    .compliance_status === "COMPLIANT"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {
                                  securityHeadersCheck.results.summary
                                    .compliance_status
                                }
                              </span>
                            </div>
                          )}

                          {/* Secure Headers */}
                          {securityHeadersCheck.results.secure_headers &&
                            securityHeadersCheck.results.secure_headers.length >
                              0 && (
                              <div className="mt-3">
                                <h6 className="font-medium text-green-800 mb-2">
                                  ✅ Secure Headers (
                                  {
                                    securityHeadersCheck.results.secure_headers
                                      .length
                                  }
                                  )
                                </h6>
                                <div className="flex flex-wrap gap-1">
                                  {securityHeadersCheck.results.secure_headers.map(
                                    (header, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                                      >
                                        {header}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Missing Headers */}
                          {securityHeadersCheck.results.missing_headers &&
                            securityHeadersCheck.results.missing_headers
                              .length > 0 && (
                              <div className="mt-3">
                                <h6 className="font-medium text-red-800 mb-2">
                                  ❌ Missing Headers (
                                  {
                                    securityHeadersCheck.results.missing_headers
                                      .length
                                  }
                                  )
                                </h6>
                                <div className="flex flex-wrap gap-1">
                                  {securityHeadersCheck.results.missing_headers.map(
                                    (header, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                                      >
                                        {header}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Weak Headers */}
                          {securityHeadersCheck.results.weak_headers &&
                            securityHeadersCheck.results.weak_headers.length >
                              0 && (
                              <div className="mt-3">
                                <h6 className="font-medium text-yellow-800 mb-2">
                                  ⚠️ Weak Headers (
                                  {
                                    securityHeadersCheck.results.weak_headers
                                      .length
                                  }
                                  )
                                </h6>
                                <div className="flex flex-wrap gap-1">
                                  {securityHeadersCheck.results.weak_headers.map(
                                    (header, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"
                                      >
                                        {header}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Recommendations */}
                          {securityHeadersCheck.results.recommendations &&
                            securityHeadersCheck.results.recommendations
                              .length > 0 && (
                              <div className="mt-3">
                                <h6 className="font-medium text-gray-800 mb-2">
                                  💡 Recommendations:
                                </h6>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                  {securityHeadersCheck.results.recommendations.map(
                                    (recommendation, index) => (
                                      <li key={index} className="text-xs">
                                        {recommendation}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {/* Detailed Headers Information */}
                          {securityHeadersCheck.results.security_headers &&
                            Object.keys(
                              securityHeadersCheck.results.security_headers
                            ).length > 0 && (
                              <div className="mt-3">
                                <h6 className="font-medium text-gray-800 mb-2">
                                  🔍 Headers Summary:
                                </h6>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {Object.entries(
                                    securityHeadersCheck.results
                                      .security_headers
                                  ).map(([headerName, headerInfo]) => (
                                    <div
                                      key={headerName}
                                      className="p-2 bg-gray-50 rounded text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">
                                          {headerName}
                                        </span>
                                        <span
                                          className={`px-2 py-1 rounded-full text-xs ${
                                            headerInfo.status === "secure"
                                              ? "bg-green-100 text-green-800"
                                              : headerInfo.status === "weak"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {headerInfo.status}
                                        </span>
                                      </div>
                                      {headerInfo.value && (
                                        <div className="mt-1 text-gray-600">
                                          <span className="font-medium">
                                            Value:
                                          </span>{" "}
                                          {headerInfo.value}
                                        </div>
                                      )}
                                      {headerInfo.shcheck_finding && (
                                        <div className="mt-1 text-gray-500 text-xs">
                                          <span className="font-medium">
                                            shcheck:
                                          </span>{" "}
                                          {headerInfo.shcheck_finding}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {securityHeadersCheck.error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <h5 className="font-medium text-red-900 mb-2">Error</h5>
                        <p className="text-sm text-red-700">
                          {securityHeadersCheck.error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cookie Analyzer Container */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Run Cookie Analyzer
                    </h4>
                    <button
                      onClick={() => handleRunCheck("cookie-analyzer")}
                      disabled={cookieAnalysis.isRunning}
                      className={`px-4 py-2 font-semibold rounded-full shadow transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer text-sm flex items-center space-x-2 ${
                        cookieAnalysis.isRunning
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-white text-teal-500 hover:bg-teal-500 hover:text-white"
                      }`}
                    >
                      <FaPlay className="w-3 h-3" />
                      <span>
                        {cookieAnalysis.isRunning
                          ? "Analyzing..."
                          : "Analyze Cookies"}
                      </span>
                    </button>
                  </div>

                  {/* Results Display */}
                  {cookieAnalysis.results && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2">
                        Analysis Results
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Cookies:</span>
                          <span className="font-medium">
                            {cookieAnalysis.results.summary.total_cookies}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Secure Cookies:</span>
                          <span className="text-green-600 font-medium">
                            {cookieAnalysis.results.summary.secure_cookies}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Non-Secure:</span>
                          <span className="text-red-600 font-medium">
                            {cookieAnalysis.results.summary.non_secure_cookies}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Level:</span>
                          <span
                            className={`font-medium ${
                              cookieAnalysis.results.summary.risk_level ===
                              "LOW"
                                ? "text-green-600"
                                : cookieAnalysis.results.summary.risk_level ===
                                  "MEDIUM"
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {cookieAnalysis.results.summary.risk_level}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>GDPR Compliant:</span>
                          <span
                            className={`font-medium ${
                              cookieAnalysis.results.gdpr_compliance.compliant
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {cookieAnalysis.results.gdpr_compliance.compliant
                              ? "Yes"
                              : "No"}
                          </span>
                        </div>
                      </div>

                      {/* Recommendations */}
                      {cookieAnalysis.results.recommendations.length > 0 && (
                        <div className="mt-3">
                          <h6 className="font-medium text-gray-900 mb-1">
                            Recommendations:
                          </h6>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {cookieAnalysis.results.recommendations.map(
                              (rec, index) => (
                                <li
                                  key={index}
                                  className="flex items-start space-x-2"
                                >
                                  <span className="text-blue-500 mt-0.5">
                                    •
                                  </span>
                                  <span>{rec}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {cookieAnalysis.error && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                      Error: {cookieAnalysis.error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Displays results:</span>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="flex items-center space-x-1">
                          <span className="text-green-600">✅</span>
                          <span>
                            Secure (
                            {cookieAnalysis.results?.summary?.secure_cookies ||
                              0}
                            )
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="text-yellow-600">⚠️</span>
                          <span>
                            Non-Secure (
                            {cookieAnalysis.results?.summary
                              ?.non_secure_cookies || 0}
                            )
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="text-red-600">❌</span>
                          <span>
                            Third-Party Risk (
                            {cookieAnalysis.results?.summary
                              ?.third_party_cookies || 0}
                            )
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>Status:</span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            cookieAnalysis.isRunning
                              ? "bg-blue-100 text-blue-800"
                              : cookieAnalysis.error
                              ? "bg-red-100 text-red-800"
                              : cookieAnalysis.results
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          <span
                            className={`mr-1 ${
                              cookieAnalysis.isRunning
                                ? "text-blue-600"
                                : cookieAnalysis.error
                                ? "text-red-600"
                                : cookieAnalysis.results
                                ? "text-green-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {cookieAnalysis.isRunning
                              ? "🔄"
                              : cookieAnalysis.error
                              ? "❌"
                              : cookieAnalysis.results
                              ? "✅"
                              : "⚠️"}
                          </span>
                          {cookieAnalysis.isRunning
                            ? "Running"
                            : cookieAnalysis.error
                            ? "Failed"
                            : cookieAnalysis.results
                            ? "Completed"
                            : "Pending"}
                        </span>
                      </div>
                      <span>
                        Last Run:{" "}
                        {cookieAnalysis.results
                          ? new Date().toLocaleTimeString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Analysis Checker */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FaMobileAlt className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Mobile Analysis Checker
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload APK/IPA File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".apk,.ipa"
                      onChange={handleMobileFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="mobile-file-input"
                    />
                    <div className="w-full px-3 py-2 border border-green-500 rounded-lg bg-white hover:bg-green-50 transition-colors cursor-pointer">
                      {mobileScan.uploadedFile ? (
                        <span className="text-sm text-gray-900 font-medium">
                          {mobileScan.uploadedFile.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Choose file
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Run Mobile Scan Section */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Run Mobile Scan
                  </span>
                  {mobileScan.uploadedFile && (
                    <button
                      onClick={handleMobileScan}
                      disabled={mobileScan.isRunning}
                      className={`px-4 py-2 font-semibold rounded-full shadow transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer text-sm flex items-center space-x-2 ${
                        mobileScan.isRunning
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-white text-teal-500 hover:bg-teal-500 hover:text-white"
                      }`}
                    >
                      <FaPlay className="w-3 h-3" />
                      <span>
                        {mobileScan.isRunning
                          ? "Running..."
                          : "Run Mobile Scan"}
                      </span>
                    </button>
                  )}
                </div>

                {/* Results Section */}
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Results:
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    {/* Data Flow Risks */}
                    <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg hover:bg-purple-100 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-600">
                        Data Flow Risks
                      </span>
                    </div>

                    {/* Insecure Storage */}
                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                      <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-600">
                        Insecure Storage
                      </span>
                    </div>

                    {/* Network/API Calls */}
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-600">
                        Network/API Calls
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status and Last Run */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Status:
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 ${
                        mobileScan.isRunning
                          ? "bg-yellow-100 text-yellow-800"
                          : mobileScan.results &&
                            mobileScan.results.status === "success"
                          ? "bg-green-100 text-green-800"
                          : mobileScan.results &&
                            mobileScan.results.status === "warning"
                          ? "bg-orange-100 text-orange-800"
                          : mobileScan.error
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      <FaExclamationTriangle className="w-3 h-3" />
                      <span>
                        {mobileScan.isRunning
                          ? "Running"
                          : mobileScan.results &&
                            mobileScan.results.status === "success"
                          ? "Completed"
                          : mobileScan.results &&
                            mobileScan.results.status === "warning"
                          ? "Warning"
                          : mobileScan.error
                          ? "Failed"
                          : "Pending"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Last Run:
                    </span>
                    <span className="text-sm text-gray-500">
                      {mobileScan.results &&
                      (mobileScan.results.status === "success" ||
                        mobileScan.results.status === "warning")
                        ? new Date().toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Detailed Results - Show for both success and warning */}
                {mobileScan.results &&
                  (mobileScan.results.status === "success" ||
                    mobileScan.results.status === "warning") && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Detailed Analysis Results
                      </h4>

                      {/* Warning Message for Mobile Analysis Issues */}
                      {mobileScan.results.status === "warning" && (
                        <div className="mb-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <span className="text-orange-600 text-lg">⚠️</span>
                            <div>
                              <h5 className="font-medium text-orange-800">
                                Analysis Warning
                              </h5>
                              <p className="text-sm text-orange-700 mt-1">
                                {mobileScan.results.message}
                              </p>
                              {mobileScan.results.debug_info && (
                                <details className="mt-2">
                                  <summary className="text-xs text-orange-600 cursor-pointer">
                                    Technical Details
                                  </summary>
                                  <div className="mt-1 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                    <p>
                                      <strong>Note:</strong>{" "}
                                      {mobileScan.results.debug_info.note}
                                    </p>
                                    <p>
                                      <strong>Report Status:</strong>{" "}
                                      {
                                        mobileScan.results.debug_info
                                          .report_status
                                      }
                                    </p>
                                    <p>
                                      <strong>Scorecard Status:</strong>{" "}
                                      {
                                        mobileScan.results.debug_info
                                          .scorecard_status
                                      }
                                    </p>
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* App Information */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-800 mb-2">
                          App Information
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Name:</span>{" "}
                            {mobileScan.results.results?.app_name || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">
                              {mobileScan.results.results?.file_info?.name
                                ?.toLowerCase()
                                .endsWith(".ipa")
                                ? "Bundle ID:"
                                : "Package:"}
                            </span>{" "}
                            {mobileScan.results.results?.package_name || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">Version:</span>{" "}
                            {mobileScan.results.results?.version_name || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">
                              {mobileScan.results.results?.file_info?.name
                                ?.toLowerCase()
                                .endsWith(".ipa")
                                ? "SDK Name:"
                                : "Target SDK:"}
                            </span>{" "}
                            {mobileScan.results.results?.target_sdk || "N/A"}
                          </div>
                        </div>
                      </div>

                      {/* Security Score */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-800 mb-2">
                          Security Assessment
                        </h5>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {mobileScan.results.results?.security_score || 0}
                              /100
                            </div>
                            <div className="text-sm text-gray-600">
                              Security Score
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {mobileScan.results.results?.total_findings || 0}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total Findings
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Findings by Severity */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-800 mb-2">
                          Findings by Severity
                        </h5>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center p-2 bg-red-100 rounded hover:bg-red-200 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                            <div className="font-bold text-red-800">
                              {mobileScan.results.results?.findings?.high
                                ?.length || 0}
                            </div>
                            <div className="text-red-600">High</div>
                          </div>
                          <div className="text-center p-2 bg-orange-100 rounded hover:bg-orange-200 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                            <div className="font-bold text-orange-800">
                              {mobileScan.results.results?.findings?.medium
                                ?.length || 0}
                            </div>
                            <div className="text-orange-600">Medium</div>
                          </div>
                          <div className="text-center p-2 bg-yellow-100 rounded hover:bg-yellow-200 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                            <div className="font-bold text-yellow-800">
                              {mobileScan.results.results?.findings?.low
                                ?.length || 0}
                            </div>
                            <div className="text-yellow-600">Low</div>
                          </div>
                          <div className="text-center p-2 bg-blue-100 rounded hover:bg-blue-200 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                            <div className="font-bold text-blue-800">
                              {mobileScan.results.results?.findings?.info
                                ?.length || 0}
                            </div>
                            <div className="text-blue-600">Info</div>
                          </div>
                        </div>
                      </div>

                      {/* Permissions */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-800 mb-2">
                          Permissions
                        </h5>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center p-2 bg-gray-100 rounded hover:bg-gray-200 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                            <div className="font-bold text-gray-800">
                              {mobileScan.results.results?.permissions?.total ||
                                0}
                            </div>
                            <div className="text-gray-600">Total</div>
                          </div>
                          <div className="text-center p-2 bg-red-100 rounded hover:bg-red-200 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                            <div className="font-bold text-red-800">
                              {mobileScan.results.results?.permissions
                                ?.dangerous || 0}
                            </div>
                            <div className="text-red-600">Dangerous</div>
                          </div>
                          <div className="text-center p-2 bg-green-100 rounded hover:bg-green-200 hover:shadow-md transition-all duration-200 transform hover:scale-105 cursor-pointer">
                            <div className="font-bold text-green-800">
                              {mobileScan.results.results?.permissions
                                ?.normal || 0}
                            </div>
                            <div className="text-green-600">Normal</div>
                          </div>
                        </div>
                      </div>

                      {/* Certificate Info */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-800 mb-2">
                          Certificate
                        </h5>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="font-medium">Signed:</span>{" "}
                            {mobileScan.results.results?.certificate_info
                              ?.signed
                              ? "Yes"
                              : "No"}
                          </div>
                          <div>
                            <span className="font-medium">
                              Vulnerabilities:
                            </span>{" "}
                            {mobileScan.results.results?.certificate_info
                              ?.vulnerabilities || 0}
                          </div>
                        </div>
                      </div>

                      {/* Original Mobile Analysis PII Data */}
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">
                          Mobile Analysis PII Data Analysis
                        </h5>
                        <div className="text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              Total PII Items Found:
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                (mobileScan.results.results?.original_pii_data
                                  ?.total_pii_found || 0) === 0
                                  ? "bg-green-100 text-green-800"
                                  : (mobileScan.results.results
                                      ?.original_pii_data?.total_pii_found ||
                                      0) < 10
                                  ? "bg-yellow-100 text-yellow-800"
                                  : (mobileScan.results.results
                                      ?.original_pii_data?.total_pii_found ||
                                      0) < 25
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {mobileScan.results.results?.original_pii_data
                                ?.total_pii_found || 0}
                            </span>
                          </div>

                          {/* PII Data Summary */}
                          {mobileScan.results.results?.original_pii_data
                            ?.summary && (
                            <div className="mt-3">
                              <h6 className="font-medium text-gray-700 mb-2">
                                PII Data Summary:
                              </h6>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                  <span>Emails:</span>
                                  <span className="font-medium">
                                    {mobileScan.results.results
                                      .original_pii_data.summary.emails_count ||
                                      0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>URLs:</span>
                                  <span className="font-medium">
                                    {mobileScan.results.results
                                      .original_pii_data.summary.urls_count ||
                                      0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Domains:</span>
                                  <span className="font-medium">
                                    {mobileScan.results.results
                                      .original_pii_data.summary
                                      .domains_count || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Secrets:</span>
                                  <span className="font-medium">
                                    {mobileScan.results.results
                                      .original_pii_data.summary
                                      .secrets_count || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Strings:</span>
                                  <span className="font-medium">
                                    {mobileScan.results.results
                                      .original_pii_data.summary
                                      .strings_count || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Trackers:</span>
                                  <span className="font-medium">
                                    {mobileScan.results.results
                                      .original_pii_data.summary
                                      .trackers_count || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Firebase URLs:</span>
                                  <span className="font-medium">
                                    {mobileScan.results.results
                                      .original_pii_data.summary
                                      .firebase_urls_count || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Libraries:</span>
                                  <span className="font-medium">
                                    {mobileScan.results.results
                                      .original_pii_data.summary
                                      .libraries_count || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sample PII Data */}
                          {mobileScan.results.results?.original_pii_data
                            ?.data && (
                            <div className="mt-3">
                              <h6 className="font-medium text-gray-700 mb-2">
                                Sample PII Data Found:
                              </h6>
                              <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
                                {/* Emails */}
                                {mobileScan.results.results.original_pii_data
                                  ?.data?.emails &&
                                  Array.isArray(
                                    mobileScan.results.results.original_pii_data
                                      .data.emails
                                  ) &&
                                  mobileScan.results.results.original_pii_data
                                    .data.emails.length > 0 && (
                                    <div className="border-l-2 border-blue-200 pl-2">
                                      <div className="font-medium text-gray-700">
                                        Emails (
                                        {
                                          mobileScan.results.results
                                            .original_pii_data.data.emails
                                            .length
                                        }
                                        ):
                                      </div>
                                      <div className="ml-2 text-gray-600">
                                        {mobileScan.results.results.original_pii_data.data.emails
                                          .slice(0, 3)
                                          .map((email, index) => (
                                            <div key={index}>
                                              •{" "}
                                              {typeof email === "string"
                                                ? email
                                                : JSON.stringify(email)}
                                            </div>
                                          ))}
                                        {mobileScan.results.results
                                          .original_pii_data.data.emails
                                          .length > 3 && (
                                          <div>
                                            ... and{" "}
                                            {mobileScan.results.results
                                              .original_pii_data.data.emails
                                              .length - 3}{" "}
                                            more
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* URLs */}
                                {mobileScan.results.results.original_pii_data
                                  ?.data?.urls &&
                                  Array.isArray(
                                    mobileScan.results.results.original_pii_data
                                      .data.urls
                                  ) &&
                                  mobileScan.results.results.original_pii_data
                                    .data.urls.length > 0 && (
                                    <div className="border-l-2 border-green-200 pl-2">
                                      <div className="font-medium text-gray-700">
                                        URLs (
                                        {
                                          mobileScan.results.results
                                            .original_pii_data.data.urls.length
                                        }
                                        ):
                                      </div>
                                      <div className="ml-2 text-gray-600">
                                        {mobileScan.results.results.original_pii_data.data.urls
                                          .slice(0, 3)
                                          .map((url, index) => (
                                            <div key={index}>
                                              •{" "}
                                              {typeof url === "string"
                                                ? url
                                                : JSON.stringify(url)}
                                            </div>
                                          ))}
                                        {mobileScan.results.results
                                          .original_pii_data.data.urls.length >
                                          3 && (
                                          <div>
                                            ... and{" "}
                                            {mobileScan.results.results
                                              .original_pii_data.data.urls
                                              .length - 3}{" "}
                                            more
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Secrets */}
                                {mobileScan.results.results.original_pii_data
                                  ?.data?.secrets &&
                                  Array.isArray(
                                    mobileScan.results.results.original_pii_data
                                      .data.secrets
                                  ) &&
                                  mobileScan.results.results.original_pii_data
                                    .data.secrets.length > 0 && (
                                    <div className="border-l-2 border-red-200 pl-2">
                                      <div className="font-medium text-gray-700">
                                        Secrets (
                                        {
                                          mobileScan.results.results
                                            .original_pii_data.data.secrets
                                            .length
                                        }
                                        ):
                                      </div>
                                      <div className="ml-2 text-gray-600">
                                        {mobileScan.results.results.original_pii_data.data.secrets
                                          .slice(0, 3)
                                          .map((secret, index) => (
                                            <div key={index}>
                                              •{" "}
                                              {typeof secret === "string"
                                                ? secret
                                                : JSON.stringify(secret)}
                                            </div>
                                          ))}
                                        {mobileScan.results.results
                                          .original_pii_data.data.secrets
                                          .length > 3 && (
                                          <div>
                                            ... and{" "}
                                            {mobileScan.results.results
                                              .original_pii_data.data.secrets
                                              .length - 3}{" "}
                                            more
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Trackers */}
                                {mobileScan.results.results.original_pii_data
                                  ?.data?.trackers &&
                                  Array.isArray(
                                    mobileScan.results.results.original_pii_data
                                      .data.trackers
                                  ) &&
                                  mobileScan.results.results.original_pii_data
                                    .data.trackers.length > 0 && (
                                    <div className="border-l-2 border-orange-200 pl-2">
                                      <div className="font-medium text-gray-700">
                                        Trackers (
                                        {
                                          mobileScan.results.results
                                            .original_pii_data.data.trackers
                                            .length
                                        }
                                        ):
                                      </div>
                                      <div className="ml-2 text-gray-600">
                                        {mobileScan.results.results.original_pii_data.data.trackers
                                          .slice(0, 3)
                                          .map((tracker, index) => (
                                            <div key={index}>
                                              •{" "}
                                              {typeof tracker === "string"
                                                ? tracker
                                                : JSON.stringify(tracker)}
                                            </div>
                                          ))}
                                        {mobileScan.results.results
                                          .original_pii_data.data.trackers
                                          .length > 3 && (
                                          <div>
                                            ... and{" "}
                                            {mobileScan.results.results
                                              .original_pii_data.data.trackers
                                              .length - 3}{" "}
                                            more
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {mobileScan.error && (
                  <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">
                    Error: {mobileScan.error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Code Inspection */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FaCode className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Code Inspection
                </h3>
                <span className="text-xs text-gray-500">
                  GitHub / GitLab integration
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Repository Connection Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FaLink className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      Repository Connection
                    </span>
                    <span className="text-xs text-gray-500">
                      Connect to Repository
                    </span>
                  </div>
                  {repositoryConnected && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 font-medium">
                        Connected
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repository URL
                    </label>
                    <input
                      type="url"
                      value={selectedRepository}
                      onChange={(e) => setSelectedRepository(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Public Access Token
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        placeholder="Enter your access token"
                        autoComplete="new-password"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:ring-teal-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <FaEyeSlash className="w-4 h-4" />
                        ) : (
                          <FaEye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleRepositoryConnect}
                    className="px-4 py-2 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer text-sm flex items-center space-x-2"
                  >
                    <FaLink className="w-4 h-4" />
                    <span>Connect</span>
                  </button>
                </div>
              </div>

              {/* Git-Scan Button - Only visible when connected */}
              {repositoryConnected && (
                <div className="mb-4">
                  <button
                    onClick={handleGitScan}
                    disabled={gitScan.isRunning}
                    className={`w-full px-4 py-2 font-semibold rounded-full shadow transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer text-sm flex items-center justify-center space-x-2 ${
                      gitScan.isRunning
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-white text-teal-500 hover:bg-teal-500 hover:text-white"
                    }`}
                  >
                    <FaPlay className="w-3 h-3" />
                    <span>
                      {gitScan.isRunning
                        ? "Running Git-Scan..."
                        : "Run Git-Scan"}
                    </span>
                  </button>

                  {/* Git-Scan Results */}
                  {gitScan.results && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Git-Scan Results
                      </h4>
                      <div className="space-y-3">
                        {/* Summary Section */}
                        <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-700">Status:</span>
                            <span
                              className={`font-semibold ${
                                gitScan.results.gitleaks.status === "completed"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {gitScan.results.gitleaks.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">
                              Total Findings:
                            </span>
                            <span className="font-semibold text-blue-600">
                            {gitScan.results.totalFindings}
                          </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-700">
                              Secrets Found:
                            </span>
                            <span className="font-semibold text-orange-600">
                              {gitScan.results.gitleaks.secrets_found || 0}
                          </span>
                        </div>
                        </div>

                        {/* Secret Types Breakdown */}
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                          <h6 className="text-xs font-semibold text-gray-700 mb-2">
                            Secret Types Breakdown:
                          </h6>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                              <span className="text-gray-600">AWS Keys:</span>
                              <span className="font-medium text-gray-900">
                                {gitScan.results.categories?.aws_keys || 0}
                          </span>
                        </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">API Keys:</span>
                              <span className="font-medium text-gray-900">
                                {gitScan.results.categories?.api_keys || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tokens:</span>
                              <span className="font-medium text-gray-900">
                                {gitScan.results.categories?.tokens || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Passwords:</span>
                              <span className="font-medium text-gray-900">
                                {gitScan.results.categories?.passwords || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Private Keys:
                              </span>
                              <span className="font-medium text-gray-900">
                                {gitScan.results.categories?.private_keys || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Generic Secrets:
                              </span>
                              <span className="font-medium text-gray-900">
                                {gitScan.results.categories?.generic_secrets ||
                                  0}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Findings */}
                        {gitScan.results.gitleaks.findings &&
                          gitScan.results.gitleaks.findings.length > 0 && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                              <h6 className="text-xs font-semibold text-gray-700 mb-2">
                                Detailed Findings:
                              </h6>
                              <div className="space-y-2">
                                {gitScan.results.gitleaks.findings
                                  .slice(0, 4)
                                  .map((finding, index) => (
                                    <div
                                      key={index}
                                      className="p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                                    >
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-gray-900">
                                          {finding.type || "Unknown Type"}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                            finding.severity === "HIGH"
                                              ? "bg-red-100 text-red-800"
                                              : finding.severity === "MEDIUM"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          {finding.severity || "UNKNOWN"}
                                        </span>
                                      </div>
                                      <div className="text-gray-600 mb-1">
                                        📁 {finding.file || "Unknown file"}
                                      </div>
                                      <div className="text-gray-600 mb-1">
                                        📍 Line: {finding.line || "N/A"}
                                      </div>
                                      <div className="text-gray-500 truncate">
                                        🔑 {finding.content || "No content"}
                                      </div>
                                    </div>
                                  ))}
                                {gitScan.results.gitleaks.findings.length >
                                  4 && (
                                  <div className="p-2 text-center text-xs text-gray-600 font-medium">
                                    ... and{" "}
                                    {gitScan.results.gitleaks.findings.length -
                                      4}{" "}
                                    more
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {gitScan.error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">
                      Error: {gitScan.error}
                    </div>
                  )}
                </div>
              )}

              {/* SAST-Scan Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <h5 className="font-medium text-gray-900 mb-3">
                  SAST-Scan (Static Application Security Testing)
                </h5>

                {/* File Upload */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:outline-none text-sm"
                  />
                </div>

                {/* SAST-Scan Button - Only visible when file is uploaded */}
                {sastScan.uploadedFile && (
                  <button
                    onClick={handleSastScan}
                    disabled={sastScan.isRunning}
                    className={`w-full px-4 py-2 font-semibold rounded-full shadow transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer text-sm flex items-center justify-center space-x-2 ${
                      sastScan.isRunning
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-white text-teal-500 hover:bg-teal-500 hover:text-white"
                    }`}
                  >
                    <FaPlay className="w-3 h-3" />
                    <span>
                      {sastScan.isRunning
                        ? "Running SAST-Scan..."
                        : "Run SAST-Scan"}
                    </span>
                  </button>
                )}

                {/* SAST-Scan Results */}
                {sastScan.results && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                    <h6 className="font-medium text-gray-900 mb-2">
                      SAST-Scan Results
                    </h6>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span
                          className={`font-semibold ${
                            sastScan.results.status === "completed"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {sastScan.results.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Findings:</span>
                        <span className="font-semibold text-blue-600">
                          {sastScan.results.total_findings || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Secrets Found:</span>
                        <span className="font-semibold text-orange-600">
                          {sastScan.results.secrets_found || 0}
                        </span>
                      </div>

                      {/* Secret Categories Breakdown */}
                      {sastScan.results.categories && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <h6 className="text-xs font-semibold text-gray-700 mb-2">
                            Secret Types Breakdown:
                          </h6>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                High Entropy:
                              </span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.high_entropy || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">API Keys:</span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.api_keys || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tokens:</span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.tokens || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Passwords:</span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.passwords || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Encryption Keys:
                              </span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.encryption_keys ||
                                  0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">AWS Keys:</span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.aws_keys || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                GitHub Tokens:
                              </span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.github_tokens || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Private Keys:
                              </span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.private_keys || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                DB Credentials:
                              </span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories
                                  .database_credentials || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Other Secrets:
                              </span>
                              <span className="font-medium text-gray-900">
                                {sastScan.results.categories.other_secrets || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display detailed findings */}
                      {sastScan.results.findings &&
                        sastScan.results.findings.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h6 className="font-medium text-gray-900 border-t pt-3">
                              Detected Secrets:
                            </h6>
                            {sastScan.results.findings
                              .slice(0, 5)
                              .map((finding, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-gray-50 rounded border-l-4 border-orange-400"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <span className="text-xs font-medium text-orange-600 uppercase">
                                        {finding.severity || "UNKNOWN"}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Finding #{index + 1}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-xs font-medium text-gray-600">
                                        File:
                                      </span>
                                      <p className="text-xs text-gray-900 font-mono break-all">
                                        {finding.file}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs font-medium text-gray-600">
                                        Line:
                                      </span>
                                      <p className="text-xs text-gray-900 font-mono">
                                        {finding.line}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs font-medium text-gray-600">
                                        Content:
                                      </span>
                                      <p className="text-xs text-gray-900 font-mono bg-white p-2 rounded break-all">
                                        {finding.content &&
                                        finding.content.length > 200
                                          ? `${finding.content.substring(
                                              0,
                                              200
                                            )}...`
                                          : finding.content}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs font-medium text-gray-600">
                                        Type:
                                      </span>
                                      <span className="text-xs text-gray-700 ml-2">
                                        {finding.type}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {sastScan.results.findings.length > 5 && (
                              <p className="text-xs text-gray-600 italic">
                                ... and {sastScan.results.findings.length - 5}{" "}
                                more
                              </p>
                            )}
                          </div>
                        )}

                      {/* Scan time */}
                      {sastScan.results.scan_time && (
                        <div className="flex justify-between text-xs text-gray-500 border-t pt-2">
                          <span>Scan Time:</span>
                          <span>
                            {new Date(
                              sastScan.results.scan_time
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {sastScan.error && (
                  <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">
                    Error: {sastScan.error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Assessments */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Privacy Assessments
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PIA Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    Privacy Impact Assessment (PIA)
                  </h4>
                  <button
                    onClick={handleGeneratePIA}
                    disabled={piaReport.isGenerating}
                    className={`px-4 py-2 font-semibold rounded-full shadow transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm ${
                      piaReport.isGenerating
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-white text-teal-400 hover:bg-teal-400 hover:text-white cursor-pointer"
                    }`}
                  >
                    {piaReport.isGenerating
                      ? "Generating..."
                      : "Start Assessment"}
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">
                      <strong>Analyzes:</strong>
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            gitScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Git-Scan Results</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            securityHeadersCheck.results
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Security Headers</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cookieAnalysis.results
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Cookie Analysis</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sastScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>SAST-Scan</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            mobileScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Mobile Analysis</span>
                      </li>
                    </ul>
                  </div>
                  {piaReport.report && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Status:</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                          ✓ Report Generated
                        </span>
                  </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        View report in Results Section below
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* DPIA Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    Data Protection Impact Assessment (DPIA)
                  </h4>
                  <button
                    onClick={handleGenerateDPIA}
                    disabled={dpiaReport.isGenerating}
                    className={`px-4 py-2 font-semibold rounded-full shadow transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm ${
                      dpiaReport.isGenerating
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-white text-blue-500 hover:bg-blue-500 hover:text-white cursor-pointer"
                    }`}
                  >
                    {dpiaReport.isGenerating
                      ? "Generating..."
                      : "Start Assessment"}
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">
                      <strong>Enhanced Analysis:</strong>
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            gitScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Git-Scan Results</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            securityHeadersCheck.results
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Security Headers</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cookieAnalysis.results
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Cookie Analysis</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sastScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>SAST-Scan</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            mobileScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Mobile Analysis</span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p className="mb-1">
                      <strong>Includes:</strong>
                    </p>
                    <ul className="space-y-1">
                      <li>
                        • Legal Impact Analysis (GDPR, DPDPA, HIPAA, CCPA)
                      </li>
                      <li>• Financial Impact Assessment</li>
                      <li>• Reputational Risk Analysis</li>
                      <li>• Compliance Mapping</li>
                      <li>• Mitigation Recommendations</li>
                    </ul>
                  </div>
                  {dpiaReport.report && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Status:</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                          ✓ Report Generated
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        View report in Results Section below
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* RoPA Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    Records of Processing Activities (RoPA)
                  </h4>
                  <button
                    onClick={handleGenerateRoPA}
                    disabled={ropaReport.isGenerating}
                    className={`px-4 py-2 font-semibold rounded-full shadow transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm ${
                      ropaReport.isGenerating
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-white text-teal-500 hover:bg-teal-500 hover:text-white cursor-pointer"
                    }`}
                  >
                    {ropaReport.isGenerating
                      ? "Generating..."
                      : "Start Assessment"}
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">
                      <strong>Comprehensive Analysis:</strong>
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            gitScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Git-Scan Results</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            securityHeadersCheck.results
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Security Headers</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cookieAnalysis.results
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Cookie Analysis</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sastScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>SAST-Scan</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            mobileScan.results ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span>Mobile Analysis</span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p className="mb-1">
                      <strong>Includes:</strong>
                    </p>
                    <ul className="space-y-1">
                      <li>• Data Inventory (Dynamic from Code)</li>
                      <li>• Risk Assessment (Dynamic)</li>
                      <li>
                        • Impact Analysis (Legal, Financial, Reputational)
                      </li>
                      <li>• Mitigation Plan (Technical & Administrative)</li>
                      <li>• Compliance Check (GDPR, DPDPA, HIPAA, CCPA)</li>
                    </ul>
                  </div>
                  {ropaReport.report && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Status:</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                          ✓ Report Generated
                        </span>
                </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        View report in Results Section below
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Privacy Assessment Results
              </h3>
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 text-sm">
                  <FaDownload className="w-4 h-4" />
                  <span>Export PDF</span>
                </button>
                <button className="px-4 py-2 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 text-sm">
                  <FaDownload className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search privacy assessments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:outline-none"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:outline-none"
              >
                <option value="All">All Assessments</option>
                <option value="Privacy">Privacy</option>
              </select>
            </div>

            {/* Results Tabs */}
            <div className="flex items-center space-x-6 mb-4 border-b border-gray-200">
              <button
                onClick={() => setStatusFilter("All")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === "All"
                    ? "text-teal-400 border-teal-400"
                    : "text-gray-500 hover:text-gray-700 border-transparent"
                }`}
              >
                All ({statusCounts.All})
              </button>
              <button
                onClick={() => setStatusFilter("Passed")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === "Passed"
                    ? "text-teal-400 border-teal-400"
                    : "text-gray-500 hover:text-gray-700 border-transparent"
                }`}
              >
                Passed ({statusCounts.Passed})
              </button>
              <button
                onClick={() => setStatusFilter("Warning")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === "Warning"
                    ? "text-teal-400 border-teal-400"
                    : "text-gray-500 hover:text-gray-700 border-transparent"
                }`}
              >
                Warnings ({statusCounts.Warning})
              </button>
              <button
                onClick={() => setStatusFilter("Failed")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === "Failed"
                    ? "text-teal-400 border-teal-400"
                    : "text-gray-500 hover:text-gray-700 border-transparent"
                }`}
              >
                Failed ({statusCounts.Failed})
              </button>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Check
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Findings
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Timestamp
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingResults ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-8 text-gray-500"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                          <span>Loading privacy assessment results...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResults.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-8 text-gray-500"
                      >
                        No privacy assessment results available. Run PIA, DPIA,
                        or RoPA assessments to see results here.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((result, index) => (
                    <tr
                      key={result.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        index % 2 === 1 ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {result.type}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {result.check}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            result.status
                          )}`}
                        >
                          {result.status === "Passed" && (
                            <FaCheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {result.status === "Warning" && (
                            <FaExclamationTriangle className="w-3 h-3 mr-1" />
                          )}
                          {result.status === "Failed" && (
                            <FaExclamationTriangle className="w-3 h-3 mr-1" />
                          )}
                          {result.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {result.findings}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                          {result.timestamp || result.date}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {result.piaData ? (
                            <button
                              onClick={() =>
                                setPiaReport({
                                  isGenerating: false,
                                  report: result.piaData,
                                  error: null,
                                  showReport: true,
                                })
                              }
                              className="px-4 py-2 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 text-sm"
                            >
                              View PIA Report
                            </button>
                          ) : result.dpiaData ? (
                            <button
                              onClick={() =>
                                setDpiaReport({
                                  isGenerating: false,
                                  report: result.dpiaData,
                                  error: null,
                                  showReport: true,
                                })
                              }
                              className="px-4 py-2 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 text-sm"
                            >
                              View DPIA Report
                            </button>
                          ) : result.ropaData ? (
                            <button
                              onClick={() =>
                                setRopaReport({
                                  isGenerating: false,
                                  report: result.ropaData,
                                  error: null,
                                  showReport: true,
                                })
                              }
                              className="px-4 py-2 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 text-sm"
                            >
                              View RoPA Report
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Progress Overview Sidebar */}
        <div className="w-80">
          {/* Progress Overview Container */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Progress Overview
            </h3>

            {/* Dual Progress Indicators */}
            <div className="flex justify-center space-x-8 mb-6">
              {/* Scan Progress */}
              <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#3B82F6"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${
                        2 * Math.PI * 56 * (1 - calculateScanProgress() / 100)
                    }`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-700">
                      {calculateScanProgress()}%
                  </span>
                </div>
              </div>
                <p className="text-sm text-gray-600">Scan Progress</p>
              </div>

              {/* Project Health */}
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={
                        getHealthLevel(calculateProjectHealth()).color ===
                        "text-green-600"
                          ? "#10B981"
                          : getHealthLevel(calculateProjectHealth()).color ===
                            "text-blue-600"
                          ? "#3B82F6"
                          : getHealthLevel(calculateProjectHealth()).color ===
                            "text-yellow-600"
                          ? "#F59E0B"
                          : "#EF4444"
                      }
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 56 * (1 - calculateProjectHealth() / 100)
                      }`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`text-2xl font-bold ${
                        getHealthLevel(calculateProjectHealth()).color ===
                        "text-green-600"
                          ? "text-green-600"
                          : getHealthLevel(calculateProjectHealth()).color ===
                            "text-blue-600"
                          ? "text-blue-600"
                          : getHealthLevel(calculateProjectHealth()).color ===
                            "text-yellow-600"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {calculateProjectHealth()}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Project Health</p>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="text-center mb-4 text-xs text-gray-500">
              <div>
                Scan Progress: {calculateScanProgress()}% - Project Health:{" "}
                {calculateProjectHealth()}%
              </div>
            </div>

            {/* Sub-sections within Progress Overview */}
            <div className="space-y-4">
              {/* Web Checks Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <h4 className="font-medium text-gray-900 mb-3">Web Checks</h4>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Security Headers
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        securityHeadersCheck.isRunning
                          ? "text-blue-600 bg-blue-100"
                          : securityHeadersCheck.results
                          ? "text-green-600 bg-green-100"
                          : "text-yellow-600 bg-yellow-100"
                      }`}
                    >
                      {securityHeadersCheck.isRunning
                        ? "Running"
                        : securityHeadersCheck.results
                        ? "Completed"
                        : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Cookie Analyzer
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        cookieAnalysis.isRunning
                          ? "text-blue-600 bg-blue-100"
                          : cookieAnalysis.results
                          ? "text-green-600 bg-green-100"
                          : "text-yellow-600 bg-yellow-100"
                      }`}
                    >
                      {cookieAnalysis.isRunning
                        ? "Running"
                        : cookieAnalysis.results
                        ? "Completed"
                        : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Summary Statistics */}
                <div className="flex items-center justify-center space-x-6 pt-3 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {progressData.webChecks.accepted}
                    </div>
                    <div className="text-xs text-gray-600">Accepted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {progressData.webChecks.pending}
                    </div>
                    <div className="text-xs text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {progressData.webChecks.rejected}
                    </div>
                    <div className="text-xs text-gray-600">Rejected</div>
                  </div>
                </div>
              </div>

              {/* Mobile Checks Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <h4 className="font-medium text-gray-900 mb-3">
                  Mobile Checks
                </h4>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Data Flow</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        mobileScan.isRunning
                          ? "text-blue-600 bg-blue-100"
                          : mobileScan.results
                          ? "text-green-600 bg-green-100"
                          : "text-yellow-600 bg-yellow-100"
                      }`}
                    >
                      {mobileScan.isRunning
                        ? "Running"
                        : mobileScan.results
                        ? "Completed"
                        : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Security Findings
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        mobileScan.isRunning
                          ? "text-blue-600 bg-blue-100"
                          : mobileScan.results
                          ? "text-green-600 bg-green-100"
                          : "text-yellow-600 bg-yellow-100"
                      }`}
                    >
                      {mobileScan.isRunning
                        ? "Running"
                        : mobileScan.results
                        ? "Completed"
                        : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Summary Statistics */}
                <div className="flex items-center justify-center space-x-6 pt-3 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {progressData.mobileChecks.accepted}
                    </div>
                    <div className="text-xs text-gray-600">Accepted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {progressData.mobileChecks.pending}
                    </div>
                    <div className="text-xs text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {progressData.mobileChecks.rejected}
                    </div>
                    <div className="text-xs text-gray-600">Rejected</div>
                  </div>
                </div>
              </div>

              {/* Code Inspection Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <h4 className="font-medium text-gray-900 mb-3">
                  Code Inspection
                </h4>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Git-Scan</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        gitScan.isRunning
                          ? "text-blue-600 bg-blue-100"
                          : gitScan.results
                          ? "text-green-600 bg-green-100"
                          : "text-yellow-600 bg-yellow-100"
                      }`}
                    >
                      {gitScan.isRunning
                        ? "Running"
                        : gitScan.results
                        ? "Completed"
                        : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Findings Statistics */}
                <div className="space-y-2 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Total Findings
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {progressData.codeInspection.totalFindings}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Open</span>
                    <span className="text-sm font-medium text-orange-600">
                      {progressData.codeInspection.open}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Resolved</span>
                    <span className="text-sm font-medium text-green-600">
                      {progressData.codeInspection.resolved}
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy Reports Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <h4 className="font-medium text-gray-900 mb-3">
                  Privacy Reports
                </h4>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">DPIA</span>
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">RoPA</span>
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                </div>

                {/* Summary Statistics */}
                <div className="flex items-center justify-center space-x-6 pt-3 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {progressData.privacyReports.accepted}
                    </div>
                    <div className="text-xs text-gray-600">Accepted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {progressData.privacyReports.pending}
                    </div>
                    <div className="text-xs text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {progressData.privacyReports.rejected}
                    </div>
                    <div className="text-xs text-gray-600">Rejected</div>
                  </div>
                </div>
              </div>

              {/* Status Legend Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <h4 className="font-medium text-gray-900 mb-3">
                  Status Legend
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FaCheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">
                      Passed / Accepted
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaExclamationTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-gray-600">
                      Queued / Pending
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaExclamationTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-gray-600">
                      Issues / Rejected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <span className="text-sm text-gray-600">Info</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PIA Report Modal */}
      {piaReport.showReport && piaReport.report && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 overflow-hidden transform transition-all duration-300 animate-scaleIn relative text-gray-800 max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Privacy Impact Assessment Report
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Generated: {new Date(piaReport.report.generated_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  setPiaReport((prev) => ({ ...prev, showReport: false }))
                }
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
                aria-label="Close Modal"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="px-10 py-8 bg-white overflow-y-auto flex-1 space-y-6">
              {/* Executive Summary */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                    📊
                  </span>
                  Executive Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <div className="text-sm text-gray-600 mb-1">
                      Overall Risk Level
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        piaReport.report.overall_risk.risk_level === "CRITICAL"
                          ? "text-red-600"
                          : piaReport.report.overall_risk.risk_level === "HIGH"
                          ? "text-orange-600"
                          : piaReport.report.overall_risk.risk_level ===
                            "MEDIUM"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {piaReport.report.overall_risk.risk_level}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Risk Score: {piaReport.report.overall_risk.risk_score}/100
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <div className="text-sm text-gray-600 mb-1">
                      Total Risks Identified
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {piaReport.report.risk_assessment.total_risks}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                      <span className="text-red-600">
                        ● {piaReport.report.high_risk_count} High
                      </span>
                      <span className="text-yellow-600">
                        ● {piaReport.report.medium_risk_count} Medium
                      </span>
                      <span className="text-blue-600">
                        ● {piaReport.report.low_risk_count} Low
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {piaReport.report.executive_summary.summary}
                  </p>
                </div>
              </div>

              {/* Data Inventory */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    📁
                  </span>
                  Data Inventory
                </h3>
                <div className="text-sm text-gray-600 mb-3">
                  {piaReport.report.data_inventory.summary}
                </div>
                {piaReport.report.data_inventory.data_points.length > 0 && (
                  <div className="space-y-2">
                    {piaReport.report.data_inventory.data_points.map(
                      (dp, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm">
                                {dp.category}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {dp.description}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                📍 {dp.location} | Source: {dp.source}
                              </div>
                            </div>
                            <span
                              className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold ${
                                dp.risk_level === "HIGH"
                                  ? "bg-red-100 text-red-800"
                                  : dp.risk_level === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {dp.risk_level}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Risk Assessment */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    ⚠️
                  </span>
                  Risk Assessment
                </h3>

                {/* High Risks */}
                {(piaReport.report.risk_assessment.critical_risks.length > 0 ||
                  piaReport.report.risk_assessment.high_risks.length > 0) && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-red-600 mb-2 text-sm">
                      Critical & High Priority Risks
                    </h4>
                    <div className="space-y-2">
                      {[
                        ...piaReport.report.risk_assessment.critical_risks,
                        ...piaReport.report.risk_assessment.high_risks,
                      ]
                        .slice(0, 5)
                        .map((risk, index) => (
                          <div
                            key={index}
                            className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {risk.type}
                                </div>
                                <div className="text-xs text-gray-700 mt-1">
                                  {risk.description}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  📍 {risk.location}
                                </div>
                                <div className="text-xs text-red-700 mt-2 bg-white p-2 rounded border border-red-100">
                                  <strong>Impact:</strong> {risk.impact}
                                </div>
                              </div>
                              <span className="ml-3 px-2 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                                {risk.severity}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Medium Risks */}
                {piaReport.report.risk_assessment.medium_risks.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-2 text-sm">
                      Medium Priority Risks (
                      {piaReport.report.risk_assessment.medium_risks.length})
                    </h4>
                    <div className="text-xs text-gray-600">
                      {piaReport.report.risk_assessment.medium_risks.length}{" "}
                      medium-priority risks identified. View full report for
                      details.
                    </div>
                  </div>
                )}
              </div>

              {/* Mitigation Plan */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    🛡️
                  </span>
                  Mitigation Plan
                  <span className="ml-3 px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold">
                    {piaReport.report.recommendations_count} Recommendations
                  </span>
                </h3>
                <div className="space-y-3">
                  {piaReport.report.mitigation_plan.recommendations
                    .slice(0, 5)
                    .map((rec, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md ${
                          rec.priority === "CRITICAL"
                            ? "bg-red-50 border-red-500 hover:bg-red-100"
                            : rec.priority === "HIGH"
                            ? "bg-orange-50 border-orange-500 hover:bg-orange-100"
                            : "bg-yellow-50 border-yellow-500 hover:bg-yellow-100"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  rec.priority === "CRITICAL"
                                    ? "bg-red-600 text-white"
                                    : rec.priority === "HIGH"
                                    ? "bg-orange-600 text-white"
                                    : "bg-yellow-600 text-white"
                                }`}
                              >
                                {rec.priority}
                              </span>
                              <span className="font-semibold text-gray-900 text-sm">
                                {rec.category}
                              </span>
                            </div>
                            <div className="text-sm text-gray-900 mt-2 font-medium">
                              Issue: {rec.issue}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              📍 {rec.location}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            ✅ Recommended Action:
                          </div>
                          <div className="text-xs text-gray-700">
                            {rec.action}
                          </div>
                        </div>
                      </div>
                    ))}
                  {piaReport.report.mitigation_plan.recommendations.length >
                    5 && (
                    <div className="text-center text-sm text-gray-600 py-2">
                      ... and{" "}
                      {piaReport.report.mitigation_plan.recommendations.length -
                        5}{" "}
                      more recommendations
                    </div>
                  )}
                </div>
              </div>

              {/* Compliance Status */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    📋
                  </span>
                  Regulatory Compliance Status
                  <span
                    className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold ${
                      piaReport.report.compliance_check.overall_compliance ===
                      "COMPLIANT"
                        ? "bg-green-100 text-green-800"
                        : piaReport.report.compliance_check
                            .overall_compliance === "PARTIAL"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {piaReport.report.compliance_check.overall_compliance}
                  </span>
                </h3>
                <div className="space-y-3">
                  {piaReport.report.compliance_check.regulations.map(
                    (reg, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {reg.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {reg.jurisdiction}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              reg.compliance_status === "COMPLIANT"
                                ? "bg-green-100 text-green-800"
                                : reg.compliance_status === "PARTIAL"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {reg.compliance_status}
                          </span>
                        </div>
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                          <strong>Penalties:</strong> {reg.penalties}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

            </div>

            {/* Fixed Footer */}
            <div className="bg-gray-50 flex items-center justify-end px-10 py-4 space-x-3 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() =>
                  setPiaReport((prev) => ({ ...prev, showReport: false }))
                }
                className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
              >
                Close
              </button>
              <button
                className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2"
                onClick={() => alert("PDF export coming soon!")}
              >
                <FaDownload className="w-4 h-4" />
                <span>Export as PDF</span>
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
        </div>
      )}

      {/* DPIA Report Modal */}
      {dpiaReport.showReport && dpiaReport.report && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl mx-4 overflow-hidden transform transition-all duration-300 animate-scaleIn relative text-gray-800 max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Data Protection Impact Assessment Report
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Generated: {new Date(dpiaReport.report.metadata?.generated_at || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  setDpiaReport((prev) => ({ ...prev, showReport: false }))
                }
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
                aria-label="Close Modal"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="px-10 py-8 bg-white overflow-y-auto flex-1 space-y-6">
              {/* Executive Summary */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                    📊
                  </span>
                  Executive Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Overall Risk
                    </h4>
                    <div
                      className={`text-2xl font-bold ${
                        dpiaReport.report.overall_risk?.risk_level ===
                        "CRITICAL"
                          ? "text-red-600"
                          : dpiaReport.report.overall_risk?.risk_level ===
                            "HIGH"
                          ? "text-orange-600"
                          : dpiaReport.report.overall_risk?.risk_level ===
                            "MEDIUM"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {dpiaReport.report.overall_risk?.risk_level || "Unknown"}
                    </div>
                    <p className="text-sm text-gray-600">
                      Score: {dpiaReport.report.overall_risk?.risk_score || 0}
                      /100
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Impact Level
                    </h4>
                    <div
                      className={`text-2xl font-bold ${
                        dpiaReport.report.overall_impact?.impact_level ===
                        "CRITICAL"
                          ? "text-red-600"
                          : dpiaReport.report.overall_impact?.impact_level ===
                            "HIGH"
                          ? "text-orange-600"
                          : dpiaReport.report.overall_impact?.impact_level ===
                            "MEDIUM"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {dpiaReport.report.overall_impact?.impact_level ||
                        "Unknown"}
                    </div>
                    <p className="text-sm text-gray-600">
                      Score:{" "}
                      {dpiaReport.report.overall_impact?.impact_score || 0}/100
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Compliance Status
                    </h4>
                    <div
                      className={`text-2xl font-bold ${
                        dpiaReport.report.overall_compliance
                          ?.compliance_level === "POOR"
                          ? "text-red-600"
                          : dpiaReport.report.overall_compliance
                              ?.compliance_level === "FAIR"
                          ? "text-yellow-600"
                          : dpiaReport.report.overall_compliance
                              ?.compliance_level === "GOOD"
                          ? "text-blue-600"
                          : "text-green-600"
                      }`}
                    >
                      {dpiaReport.report.overall_compliance?.compliance_level ||
                        "Unknown"}
                    </div>
                    <p className="text-sm text-gray-600">
                      Score:{" "}
                      {dpiaReport.report.overall_compliance?.compliance_score ||
                        0}
                      /100
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Inventory */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    📁
                  </span>
                  Data Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      PII Categories Found
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(
                        dpiaReport.report.data_inventory?.pii_categories || {}
                      ).map(([category, count]) => (
                        <div
                          key={category}
                          className="flex justify-between items-center bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                        >
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {category.replace("_", " ")}
                          </span>
                          <span className="text-sm text-gray-600">
                            {count} items
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Third-Party Integrations
                    </h4>
                    <div className="space-y-2">
                      {dpiaReport.report.data_inventory?.third_party_integrations?.map(
                        (integration, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            <div className="font-medium text-sm text-gray-700">
                              {integration.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {integration.type}
                            </div>
                          </div>
                        )
                      ) || (
                        <p className="text-sm text-gray-500">
                          No third-party integrations found
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    ⚠️
                  </span>
                  Risk Assessment
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-red-50 rounded-lg p-4 text-center hover:bg-red-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <div className="text-2xl font-bold text-red-600">
                      {dpiaReport.report.risk_assessment?.risk_distribution
                        ?.critical || 0}
                    </div>
                    <div className="text-sm text-red-700">Critical</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center hover:bg-orange-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <div className="text-2xl font-bold text-orange-600">
                      {dpiaReport.report.risk_assessment?.risk_distribution
                        ?.high || 0}
                    </div>
                    <div className="text-sm text-orange-700">High</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center hover:bg-yellow-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <div className="text-2xl font-bold text-yellow-600">
                      {dpiaReport.report.risk_assessment?.risk_distribution
                        ?.medium || 0}
                    </div>
                    <div className="text-sm text-yellow-700">Medium</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center hover:bg-green-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <div className="text-2xl font-bold text-green-600">
                      {dpiaReport.report.risk_assessment?.risk_distribution
                        ?.low || 0}
                    </div>
                    <div className="text-sm text-green-700">Low</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {dpiaReport.report.risk_assessment?.risks
                    ?.slice(0, 5)
                    .map((risk, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {risk.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              risk.severity === "Critical"
                                ? "bg-red-100 text-red-800"
                                : risk.severity === "High"
                                ? "bg-orange-100 text-orange-800"
                                : risk.severity === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {risk.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {risk.description}
                        </p>
                        <p className="text-xs text-blue-600 font-medium">
                          {risk.recommendation}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Impact Analysis */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    🛡️
                  </span>
                  Impact Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 rounded-lg p-4 hover:bg-red-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-red-800 mb-3">
                      Legal Impact
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>GDPR Fines:</span>
                        <span className="font-medium">
                          {dpiaReport.report.impact_analysis?.legal_impact
                            ?.gdpr_fines?.potential_fine || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>DPDPA Penalties:</span>
                        <span className="font-medium">
                          {dpiaReport.report.impact_analysis?.legal_impact
                            ?.dpdpa_penalties?.potential_penalty || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 hover:bg-orange-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-orange-800 mb-3">
                      Financial Impact
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Investigation:</span>
                        <span className="font-medium">
                          {dpiaReport.report.impact_analysis?.financial_impact
                            ?.investigation_costs?.legal_fees || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue Loss:</span>
                        <span className="font-medium">
                          {dpiaReport.report.impact_analysis?.financial_impact
                            ?.business_disruption?.revenue_loss || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 hover:bg-yellow-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-yellow-800 mb-3">
                      Reputational Impact
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Trust Loss:</span>
                        <span className="font-medium">
                          {dpiaReport.report.impact_analysis
                            ?.reputational_impact?.trust_loss
                            ?.customer_confidence || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recovery Time:</span>
                        <span className="font-medium">
                          {dpiaReport.report.impact_analysis
                            ?.reputational_impact?.recovery_time
                            ?.trust_rebuilding || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Check */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    ✅
                  </span>
                  Compliance Check
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      name: "GDPR",
                      data: dpiaReport.report.compliance_check?.gdpr_compliance,
                    },
                    {
                      name: "DPDPA",
                      data: dpiaReport.report.compliance_check
                        ?.dpdpa_compliance,
                    },
                    {
                      name: "HIPAA",
                      data: dpiaReport.report.compliance_check
                        ?.hipaa_compliance,
                    },
                    {
                      name: "CCPA",
                      data: dpiaReport.report.compliance_check?.ccpa_compliance,
                    },
                  ].map((regulation) => (
                    <div
                      key={regulation.name}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      <h4 className="font-semibold text-gray-800 mb-2">
                        {regulation.name}
                      </h4>
                      <div
                        className={`text-lg font-bold mb-2 ${
                          (regulation.data?.score || 0) >= 80
                            ? "text-green-600"
                            : (regulation.data?.score || 0) >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {regulation.data?.score || 0}/100
                      </div>
                      <div className="text-xs text-gray-600">
                        {regulation.data?.violations?.length > 0
                          ? `${regulation.data.violations.length} violations`
                          : "No violations"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mitigation Plan */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    🛠️
                  </span>
                  Mitigation Plan
                </h3>
                <div className="space-y-4">
                  {dpiaReport.report.mitigation_plan?.recommendations
                    ?.slice(0, 5)
                    .map((recommendation, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {recommendation.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              recommendation.priority === "High"
                                ? "bg-red-100 text-red-800"
                                : recommendation.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {recommendation.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {recommendation.description}
                        </p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Timeline: {recommendation.timeline}</span>
                          <span>Effort: {recommendation.effort}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

            </div>

            {/* Fixed Footer */}
            <div className="bg-gray-50 flex items-center justify-end px-10 py-4 space-x-3 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() =>
                  setDpiaReport((prev) => ({ ...prev, showReport: false }))
                }
                className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
              >
                Close
              </button>
              <button
                className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2"
                onClick={() => alert("PDF export coming soon!")}
              >
                <FaDownload className="w-4 h-4" />
                <span>Export as PDF</span>
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
        </div>
      )}

      {/* RoPA Report Modal */}
      {ropaReport.showReport && ropaReport.report && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl mx-4 overflow-hidden transform transition-all duration-300 animate-scaleIn relative text-gray-800 max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between px-10 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Records of Processing Activities (RoPA) Report
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Generated: {new Date(ropaReport.report.metadata?.generated_at || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  setRopaReport((prev) => ({ ...prev, showReport: false }))
                }
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
                aria-label="Close Modal"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="px-10 py-8 bg-white overflow-y-auto flex-1 space-y-6">
              {/* Executive Summary */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                    📊
                  </span>
                  Executive Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Overall Risk
                    </h4>
                    <div
                      className={`text-2xl font-bold ${
                        ropaReport.report.overall_risk?.risk_level ===
                        "CRITICAL"
                          ? "text-red-600"
                          : ropaReport.report.overall_risk?.risk_level ===
                            "HIGH"
                          ? "text-orange-600"
                          : ropaReport.report.overall_risk?.risk_level ===
                            "MEDIUM"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {ropaReport.report.overall_risk?.risk_level || "Unknown"}
                    </div>
                    <p className="text-sm text-gray-600">
                      Score: {ropaReport.report.overall_risk?.risk_score || 0}
                      /100
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Processing Activities
                    </h4>
                    <div className="text-2xl font-bold text-teal-600">
                      {ropaReport.report.data_inventory
                        ?.total_processing_activities || 0}
                    </div>
                    <p className="text-sm text-gray-600">Total Activities</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Impact Level
                    </h4>
                    <div
                      className={`text-2xl font-bold ${
                        ropaReport.report.overall_impact?.impact_level ===
                        "CRITICAL"
                          ? "text-red-600"
                          : ropaReport.report.overall_impact?.impact_level ===
                            "HIGH"
                          ? "text-orange-600"
                          : ropaReport.report.overall_impact?.impact_level ===
                            "MEDIUM"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {ropaReport.report.overall_impact?.impact_level ||
                        "Unknown"}
                    </div>
                    <p className="text-sm text-gray-600">
                      Score:{" "}
                      {ropaReport.report.overall_impact?.impact_score || 0}/100
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Compliance
                    </h4>
                    <div
                      className={`text-2xl font-bold ${
                        ropaReport.report.overall_compliance
                          ?.compliance_level === "EXCELLENT"
                          ? "text-green-600"
                          : ropaReport.report.overall_compliance
                              ?.compliance_level === "GOOD"
                          ? "text-blue-600"
                          : ropaReport.report.overall_compliance
                              ?.compliance_level === "FAIR"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {ropaReport.report.overall_compliance?.compliance_level ||
                        "Unknown"}
                    </div>
                    <p className="text-sm text-gray-600">
                      Score:{" "}
                      {ropaReport.report.overall_compliance?.compliance_score ||
                        0}
                      /100
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Inventory */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    📁
                  </span>
                  Data Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Processing Activities
                    </h4>
                    <div className="space-y-2">
                      {ropaReport.report.data_inventory?.processing_activities?.map(
                        (activity, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            <div className="font-medium text-sm text-gray-800">
                              {activity.pii_category}
                            </div>
                            <div className="text-xs text-gray-600">
                              Purpose: {activity.processing_purpose}
                            </div>
                            <div className="text-xs text-gray-500">
                              Source: {activity.source}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      PII Categories Found
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(
                        ropaReport.report.data_inventory
                          ?.pii_categories_found || {}
                      ).map(([category, count]) => (
                        <div
                          key={category}
                          className="flex justify-between items-center bg-gray-50 rounded-lg p-3"
                        >
                          <span className="text-sm font-medium text-gray-800 capitalize">
                            {category.replace("_", " ")}
                          </span>
                          <span className="text-sm text-teal-600 font-semibold">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    ⚠️
                  </span>
                  Risk Assessment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Risk Distribution
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(
                        ropaReport.report.risk_assessment?.risk_distribution ||
                          {}
                      ).map(([level, count]) => (
                        <div
                          key={level}
                          className="flex justify-between items-center hover:bg-gray-50 p-2 rounded transition-all duration-200"
                        >
                          <span className="text-sm font-medium text-gray-800 capitalize">
                            {level} Risks
                          </span>
                          <span
                            className={`text-sm font-semibold px-2 py-1 rounded ${
                              level === "critical"
                                ? "bg-red-100 text-red-800"
                                : level === "high"
                                ? "bg-orange-100 text-orange-800"
                                : level === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      All Risks
                    </h4>
                    <div className="space-y-2">
                      {ropaReport.report.risk_assessment?.risks?.map(
                        (risk, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium text-gray-800">
                                {risk.title}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  risk.severity === "Critical"
                                    ? "bg-red-100 text-red-800"
                                    : risk.severity === "High"
                                    ? "bg-orange-100 text-orange-800"
                                    : risk.severity === "Medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {risk.severity}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {risk.description}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Analysis */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    🛡️
                  </span>
                  Impact Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200 hover:bg-red-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-red-800 mb-2">
                      Legal Impact
                    </h4>
                    <div className="text-2xl font-bold text-red-600 mb-2">
                      {ropaReport.report.impact_analysis?.legal_impact?.score ||
                        0}
                      /100
                    </div>
                    <div className="text-sm text-red-700">
                      <p className="font-medium">GDPR Fines:</p>
                      <p>
                        {ropaReport.report.impact_analysis?.legal_impact
                          ?.gdpr_fines?.potential_fine || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 hover:bg-orange-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-orange-800 mb-2">
                      Financial Impact
                    </h4>
                    <div className="text-2xl font-bold text-orange-600 mb-2">
                      {ropaReport.report.impact_analysis?.financial_impact
                        ?.score || 0}
                      /100
                    </div>
                    <div className="text-sm text-orange-700">
                      <p className="font-medium">Investigation Costs:</p>
                      <p>
                        {ropaReport.report.impact_analysis?.financial_impact
                          ?.investigation_costs?.forensic_analysis || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 hover:bg-yellow-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      Reputational Impact
                    </h4>
                    <div className="text-2xl font-bold text-yellow-600 mb-2">
                      {ropaReport.report.impact_analysis?.reputational_impact
                        ?.score || 0}
                      /100
                    </div>
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Trust Loss:</p>
                      <p>
                        {ropaReport.report.impact_analysis?.reputational_impact
                          ?.trust_loss?.customer_confidence || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Check */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    ✅
                  </span>
                  Compliance Check
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 hover:bg-blue-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-blue-800 mb-2">GDPR</h4>
                    <div className="text-xl font-bold text-blue-600 mb-2">
                      {ropaReport.report.compliance_check?.gdpr_compliance
                        ?.score || 0}
                      /100
                    </div>
                    <div className="text-xs text-blue-700">
                      {ropaReport.report.compliance_check?.gdpr_compliance
                        ?.violations?.length || 0}{" "}
                      violations
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 hover:bg-green-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-green-800 mb-2">DPDPA</h4>
                    <div className="text-xl font-bold text-green-600 mb-2">
                      {ropaReport.report.compliance_check?.dpdpa_compliance
                        ?.score || 0}
                      /100
                    </div>
                    <div className="text-xs text-green-700">
                      {ropaReport.report.compliance_check?.dpdpa_compliance
                        ?.violations?.length || 0}{" "}
                      violations
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 hover:bg-purple-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-purple-800 mb-2">
                      HIPAA
                    </h4>
                    <div className="text-xl font-bold text-purple-600 mb-2">
                      {ropaReport.report.compliance_check?.hipaa_compliance
                        ?.score || 0}
                      /100
                    </div>
                    <div className="text-xs text-purple-700">
                      {ropaReport.report.compliance_check?.hipaa_compliance
                        ?.violations?.length || 0}{" "}
                      violations
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 hover:bg-orange-100 transition-all duration-200 transform hover:scale-[1.02]">
                    <h4 className="font-semibold text-orange-800 mb-2">CCPA</h4>
                    <div className="text-xl font-bold text-orange-600 mb-2">
                      {ropaReport.report.compliance_check?.ccpa_compliance
                        ?.score || 0}
                      /100
                    </div>
                    <div className="text-xs text-orange-700">
                      {ropaReport.report.compliance_check?.ccpa_compliance
                        ?.violations?.length || 0}{" "}
                      violations
                    </div>
                  </div>
                </div>
              </div>

              {/* Mitigation Plan */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center mr-2 text-sm">
                    🛠️
                  </span>
                  Mitigation Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Technical Controls
                    </h4>
                    <div className="space-y-2">
                      {ropaReport.report.mitigation_plan?.technical_controls?.map(
                        (control, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            <div className="font-medium text-sm text-gray-800 mb-1">
                              {control.category}
                            </div>
                            <div className="text-xs text-gray-600">
                              {control.measures.length} measures
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Administrative Controls
                    </h4>
                    <div className="space-y-2">
                      {ropaReport.report.mitigation_plan?.administrative_controls?.map(
                        (control, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            <div className="font-medium text-sm text-gray-800 mb-1">
                              {control.category}
                            </div>
                            <div className="text-xs text-gray-600">
                              {control.measures.length} measures
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="bg-gray-50 flex items-center justify-end px-10 py-4 space-x-3 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() =>
                  setRopaReport((prev) => ({ ...prev, showReport: false }))
                }
                className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
              >
                Close
              </button>
              <button
                className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2"
                onClick={() => alert("PDF export coming soon!")}
              >
                <FaDownload className="w-4 h-4" />
                <span>Export as PDF</span>
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
        </div>
      )}
    </div>
  );
}
