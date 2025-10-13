// ComplianceToDoTracker.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  FaUserCheck,
  FaShieldAlt,
  FaCertificate,
  FaClipboardCheck,
  FaKey,
  FaUsers,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChevronDown,
  FaEye,
  FaEdit,
  FaTrash,
  FaBell,
  FaCalendarAlt,
  FaFilter,
  FaSearch,
  FaDownload,
  FaTasks,
} from "react-icons/fa";

const ComplianceToDoTracker = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterIndex, setActiveFilterIndex] = useState(0);
  const [todoItems, setTodoItems] = useState([]);

  // Check if user has admin role - only admins can access to-do tracker
  const isAdmin = user && user.role === "Admin";

  useEffect(() => {
    // Only fetch data if user is admin
    if (!isAdmin) return;
    const fetchTodos = async () => {
      try {
        console.log(
          "🔍 ComplianceToDoTracker - Fetching both Todos and ActionItems from API..."
        );

        const authHeaders = {
          Authorization: `Bearer ${
            localStorage.getItem("authTokens")
              ? JSON.parse(localStorage.getItem("authTokens")).access
              : ""
          }`,
        };

        // Fetch both Todos and ActionItems in parallel
        const [todosResponse, actionItemsResponse] = await Promise.all([
          fetch("/api/auditing/todos/", { headers: authHeaders }),
          fetch("/api/auditing/action-items/", { headers: authHeaders }),
        ]);

        console.log(
          "🔍 ComplianceToDoTracker - Todos response status:",
          todosResponse.status
        );
        console.log(
          "🔍 ComplianceToDoTracker - ActionItems response status:",
          actionItemsResponse.status
        );

        let allItems = [];

        // Process Todos data
        if (todosResponse.ok) {
          const todosData = await todosResponse.json();
          console.log(
            "🔍 ComplianceToDoTracker - Received todos:",
            todosData.length,
            "items"
          );

          const transformedTodos = todosData.map((item) => ({
            id: `todo_${item.id}`, // Prefix to avoid ID conflicts
            title: item.title,
            type: item.type || "Todo Task",
            description: item.description,
            priority: item.priority,
            status: item.status,
            assignee: item.assignee ? item.assignee.username : "Admin",
            dueDate: item.due_date
              ? new Date(item.due_date).toLocaleDateString()
              : "No due date",
            category: item.category || "general",
            requester: item.requester ? item.requester.username : "System",
            details: item.details || {},
            actions: [
              "user_approval",
              "auditor_assignment",
              "evidence_approval",
              "risk_approval",
            ].includes(item.category)
              ? ["Approve", "Reject"]
              : ["View Details"],
            source: "todo", // Mark as Todo source
          }));

          allItems = [...allItems, ...transformedTodos];
        } else {
          console.error(
            "🔍 ComplianceToDoTracker - Failed to fetch todos:",
            todosResponse.status,
            todosResponse.statusText
          );
        }

        // Process ActionItems data
        if (actionItemsResponse.ok) {
          const actionItemsData = await actionItemsResponse.json();
          console.log(
            "🔍 ComplianceToDoTracker - Received action items:",
            actionItemsData.length,
            "items"
          );

          const transformedActionItems = actionItemsData.map((item) => ({
            id: `action_${item.id}`, // Prefix to avoid ID conflicts
            title: item.title,
            type: item.type || "Action Required",
            description: item.description,
            priority: item.priority,
            status: item.status,
            assignee: item.assignee ? item.assignee.username : "Admin",
            dueDate: item.due_date
              ? new Date(item.due_date).toLocaleDateString()
              : "No due date",
            category: item.category,
            requester: item.requester ? item.requester.username : "System",
            details: item.details || {},
            actions: [
              "user_approval",
              "auditor_assignment",
              "evidence_approval",
              "risk_approval",
            ].includes(item.category)
              ? ["Approve", "Reject"]
              : ["View Details"],
            source: "actionitem", // Mark as ActionItem source
          }));

          allItems = [...allItems, ...transformedActionItems];
        } else {
          console.error(
            "🔍 ComplianceToDoTracker - Failed to fetch action items:",
            actionItemsResponse.status,
            actionItemsResponse.statusText
          );
        }

        console.log(
          "🔍 ComplianceToDoTracker - Combined data:",
          allItems.length,
          "total items"
        );
        console.log("🔍 ComplianceToDoTracker - All items:", allItems);

        setTodoItems(allItems);

        console.log("🔍 ComplianceToDoTracker - todoItems updated!");
      } catch (error) {
        console.error(
          "🔍 ComplianceToDoTracker - Failed to fetch data:",
          error
        );
      }
    };

    fetchTodos();
  }, [isAdmin]);

  // If user is not admin, show access denied message
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaExclamationTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access the Compliance To-Do Tracker.
            </p>
            <p className="text-sm text-gray-500">
              This feature is only available to administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Available auditors for assignment
  const auditors = [
    { id: 1, name: "Dr. Emily Carter", specialization: "ISO 27001" },
    { id: 2, name: "Michael Thompson", specialization: "SOC 2" },
    { id: 3, name: "Sarah Williams", specialization: "GDPR" },
    { id: 4, name: "David Chen", specialization: "NIST" },
  ];

  // Status configurations
  const statusConfig = {
    Pending: {
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      icon: FaClock,
      iconColor: "text-yellow-500",
    },
    Approved: {
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      icon: FaCheckCircle,
      iconColor: "text-green-500",
    },
    Required: {
      bgColor: "bg-orange-100",
      textColor: "text-orange-800",
      icon: FaExclamationCircle,
      iconColor: "text-orange-500",
    },
    Rejected: {
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      icon: FaTimesCircle,
      iconColor: "text-red-500",
    },
  };

  // Priority configurations
  const priorityConfig = {
    High: {
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
    },
    Medium: {
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-200",
    },
    Low: {
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
    },
  };

  // Category icons
  const categoryIcons = {
    user_approval: FaUserCheck,
    risk_approval: FaShieldAlt,
    auditor_assignment: FaCertificate,
    evidence_approval: FaClipboardCheck,
    policy_approval: FaKey,
  };

  // Filter options
  const filters = [
    { id: "all", label: "All Tasks", count: todoItems.length },
    {
      id: "pending",
      label: "Pending",
      count: todoItems.filter((item) => item.status === "Pending").length,
    },
    {
      id: "approved",
      label: "Approved",
      count: todoItems.filter((item) => item.status === "Approved").length,
    },
    {
      id: "rejected",
      label: "Rejected",
      count: todoItems.filter((item) => item.status === "Rejected").length,
    },
  ];

  // Progress data
  const progressData = {
    approved: todoItems.filter((item) => item.status === "Approved").length,
    pending: todoItems.filter((item) => item.status === "Pending").length,
    rejected: todoItems.filter((item) => item.status === "Rejected").length,
    total: todoItems.length,
  };

  const approvedPercentage = Math.round(
    (progressData.approved / progressData.total) * 100
  );
  const pendingPercentage = Math.round(
    (progressData.pending / progressData.total) * 100
  );
  const rejectedPercentage = Math.round(
    (progressData.rejected / progressData.total) * 100
  );

  // Handle filter change with index tracking
  const handleFilterChange = (filterId) => {
    setFilter(filterId);
    const index = filters.findIndex((f) => f.id === filterId);
    setActiveFilterIndex(index);
  };

  // Filter items based on current filter and search
  const filteredItems = todoItems
    .filter((item) => {
      const matchesFilter =
        filter === "all" || item.status.toLowerCase() === filter;
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.assignee &&
          item.assignee.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by ID in descending order (newest first) as a fallback
      // Once migration is applied, we can use created_at
      return b.id - a.id;
    });

  const handleAction = async (itemId, action) => {
    console.log(`Action: ${action} on item ${itemId}`);

    // Find the task item
    const task = todoItems.find((item) => item.id === itemId);

    if (!task) {
      console.error(`Task not found for ID: ${itemId}`);
      return;
    }

    // Handle based on source and category
    if (task.source === "actionitem") {
      // Handle ActionItem-based tasks
      if (task.category === "evidence_approval") {
        await handleEvidenceApproval(itemId, action, task);
      } else if (task.category === "user_approval") {
        await handleActionItemUserApproval(itemId, action, task);
      } else if (task.category === "auditor_assignment") {
        await handleActionItemAuditorApproval(itemId, action, task);
      } else if (task.category === "risk_approval") {
        await handleActionItemRiskApproval(itemId, action, task);
      } else {
        console.log(
          `Handling ${action} for ActionItem task ${itemId} with category ${task.category}`
        );
      }
    } else if (task.source === "todo") {
      // Handle Todo-based tasks
      if (task.category === "user_approval") {
        await handleUserApproval(itemId, action, task);
      } else if (task.category === "auditor_assignment") {
        await handleAuditorApproval(itemId, action, task);
      } else if (task.category === "risk_approval") {
        await handleRiskApproval(itemId, action, task);
      } else {
        console.log(`Handling ${action} for Todo task ${itemId}`);
      }
    } else {
      // Handle other task actions
      console.log(`Handling ${action} for task ${itemId}`);
    }
  };

  // Handle user approval/rejection
  const handleUserApproval = async (itemId, action, task) => {
    try {
      const userId = task.details.userId;
      const newStatus = action === "Approve" ? "active" : "pending_approval";

      // Update ActionItem status via API
      const response = await fetch(`/api/auditing/action-items/${itemId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("authTokens")
              ? JSON.parse(localStorage.getItem("authTokens")).access
              : ""
          }`,
        },
        body: JSON.stringify({
          status: action === "Approve" ? "Approved" : "Rejected",
        }),
      });

      if (response.ok) {
        // Update the task status in state
        setTodoItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: action === "Approve" ? "Approved" : "Rejected",
                }
              : item
          )
        );

        console.log(`User ${userId} ${action.toLowerCase()}d successfully`);

        // Show success message
        alert(
          `User ${action.toLowerCase()}d successfully! Status updated to ${newStatus}.`
        );
      } else {
        throw new Error("Failed to update user status");
      }
    } catch (error) {
      console.error("Error handling user approval:", error);
      alert(`Error ${action.toLowerCase()}ing user: ${error.message}`);
    }
  };

  // Handle auditor assignment approval/rejection
  const handleAuditorApproval = async (itemId, action, task) => {
    try {
      const auditorId = task.details.auditorId;
      const projectId = task.details.projectId;

      // Update todo status via API
      const response = await fetch(`/api/auditing/todos/${itemId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("authTokens")
              ? JSON.parse(localStorage.getItem("authTokens")).access
              : ""
          }`,
        },
        body: JSON.stringify({
          status: action === "Approve" ? "Approved" : "Rejected",
        }),
      });

      if (response.ok) {
        // If rejected, remove the auditor from the project
        if (action === "Reject") {
          try {
            const removeResponse = await fetch(
              `/api/projects/${projectId}/remove_auditor/`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${
                    localStorage.getItem("authTokens")
                      ? JSON.parse(localStorage.getItem("authTokens")).access
                      : ""
                  }`,
                },
                body: JSON.stringify({
                  auditor_id: auditorId,
                }),
              }
            );

            if (removeResponse.ok) {
              console.log("Auditor removed from project after rejection");
            } else {
              console.warn(
                "Failed to remove auditor from project after rejection"
              );
            }
          } catch (removeError) {
            console.error("Error removing auditor from project:", removeError);
          }
        }

        // Update the task status in state
        setTodoItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: action === "Approve" ? "Approved" : "Rejected",
                }
              : item
          )
        );

        console.log(`Auditor assignment ${action.toLowerCase()}d successfully`);

        // Show success message
        alert(
          `Auditor assignment ${action.toLowerCase()}d successfully! ${
            action === "Approve"
              ? "Auditor has been approved for the project."
              : "Auditor assignment has been rejected and auditor removed from project."
          }`
        );
      } else {
        throw new Error("Failed to update auditor assignment status");
      }
    } catch (error) {
      console.error("Error handling auditor approval:", error);
      alert(
        `Error ${action.toLowerCase()}ing auditor assignment: ${error.message}`
      );
    }
  };

  // Handle risk approval/rejection
  const handleRiskApproval = async (itemId, action, task) => {
    try {
      const riskId = task.details.riskId;

      // Update todo status via API
      const response = await fetch(`/api/auditing/todos/${itemId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("authTokens")
              ? JSON.parse(localStorage.getItem("authTokens")).access
              : ""
          }`,
        },
        body: JSON.stringify({
          status: action === "Approve" ? "Approved" : "Rejected",
        }),
      });

      if (response.ok) {
        // If rejected, we could potentially update the risk status or delete it
        // For now, we'll just update the task status
        if (action === "Reject") {
          try {
            // Optionally update risk status to rejected
            const riskResponse = await fetch(`/api/auditing/risks/${riskId}/`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${
                  localStorage.getItem("authTokens")
                    ? JSON.parse(localStorage.getItem("authTokens")).access
                    : ""
                }`,
              },
              body: JSON.stringify({
                status: "rejected",
              }),
            });

            if (riskResponse.ok) {
              console.log("Risk status updated to rejected");
            } else {
              console.warn("Failed to update risk status after rejection");
            }
          } catch (riskError) {
            console.error("Error updating risk status:", riskError);
          }
        }

        // Update the task status in state
        setTodoItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: action === "Approve" ? "Approved" : "Rejected",
                }
              : item
          )
        );

        console.log(`Risk assessment ${action.toLowerCase()}d successfully`);

        // Show success message
        alert(
          `Risk assessment ${action.toLowerCase()}d successfully! ${
            action === "Approve"
              ? "Risk has been approved and is now active."
              : "Risk assessment has been rejected."
          }`
        );
      } else {
        throw new Error("Failed to update risk approval status");
      }
    } catch (error) {
      console.error("Error handling risk approval:", error);
      alert(
        `Error ${action.toLowerCase()}ing risk assessment: ${error.message}`
      );
    }
  };

  // Handle evidence approval/rejection
  const handleEvidenceApproval = async (itemId, action, task) => {
    try {
      const evidenceId = task.details.evidence_id;
      const projectId = task.details.project_id;

      // Update evidence approval status via API
      const response = await fetch(
        `/api/projects/${projectId}/evidence/${evidenceId}/approve_evidence/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("authTokens")
                ? JSON.parse(localStorage.getItem("authTokens")).access
                : ""
            }`,
          },
          body: JSON.stringify({
            action: action.toLowerCase(),
            notes: `Evidence ${action.toLowerCase()}d via To-Do Tracker`,
          }),
        }
      );

      if (response.ok) {
        // Extract the actual ActionItem ID (remove the "action_" prefix)
        const actualActionItemId = itemId.replace("action_", "");

        // Update the ActionItem status
        const actionItemResponse = await fetch(
          `/api/auditing/action-items/${actualActionItemId}/`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${
                localStorage.getItem("authTokens")
                  ? JSON.parse(localStorage.getItem("authTokens")).access
                  : ""
              }`,
            },
            body: JSON.stringify({
              status: action === "Approve" ? "Approved" : "Rejected",
            }),
          }
        );

        if (actionItemResponse.ok) {
          // Update the task status in state
          setTodoItems((prevItems) =>
            prevItems.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: action === "Approve" ? "Approved" : "Rejected",
                  }
                : item
            )
          );

          console.log(
            `Evidence ${evidenceId} ${action.toLowerCase()}d successfully`
          );

          // Show success message
          alert(
            `Evidence ${action.toLowerCase()}d successfully! Evidence ID: ${evidenceId}`
          );
        }
      } else {
        throw new Error("Failed to update evidence approval status");
      }
    } catch (error) {
      console.error("Error handling evidence approval:", error);
      alert(`Error ${action.toLowerCase()}ing evidence: ${error.message}`);
    }
  };

  // Handle ActionItem user approval
  const handleActionItemUserApproval = async (itemId, action, task) => {
    try {
      // Extract the actual ActionItem ID (remove the "action_" prefix)
      const actualActionItemId = itemId.replace("action_", "");

      // Update the ActionItem status
      const response = await fetch(
        `/api/auditing/action-items/${actualActionItemId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("authTokens")
                ? JSON.parse(localStorage.getItem("authTokens")).access
                : ""
            }`,
          },
          body: JSON.stringify({
            status: action === "Approve" ? "Approved" : "Rejected",
          }),
        }
      );

      if (response.ok) {
        // Update the task status in state
        setTodoItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: action === "Approve" ? "Approved" : "Rejected",
                }
              : item
          )
        );
        console.log(`User approval ${action.toLowerCase()}d successfully`);
      } else {
        throw new Error("Failed to update user approval status");
      }
    } catch (error) {
      console.error("Error handling user approval:", error);
      alert(`Error ${action.toLowerCase()}ing user: ${error.message}`);
    }
  };

  // Handle ActionItem auditor approval
  const handleActionItemAuditorApproval = async (itemId, action, task) => {
    try {
      // Extract the actual ActionItem ID (remove the "action_" prefix)
      const actualActionItemId = itemId.replace("action_", "");

      // Update the ActionItem status
      const response = await fetch(
        `/api/auditing/action-items/${actualActionItemId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("authTokens")
                ? JSON.parse(localStorage.getItem("authTokens")).access
                : ""
            }`,
          },
          body: JSON.stringify({
            status: action === "Approve" ? "Approved" : "Rejected",
          }),
        }
      );

      if (response.ok) {
        // Update the task status in state
        setTodoItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: action === "Approve" ? "Approved" : "Rejected",
                }
              : item
          )
        );
        console.log(`Auditor assignment ${action.toLowerCase()}d successfully`);
      } else {
        throw new Error("Failed to update auditor assignment status");
      }
    } catch (error) {
      console.error("Error handling auditor approval:", error);
      alert(
        `Error ${action.toLowerCase()}ing auditor assignment: ${error.message}`
      );
    }
  };

  // Handle ActionItem risk approval
  const handleActionItemRiskApproval = async (itemId, action, task) => {
    try {
      // Extract the actual ActionItem ID (remove the "action_" prefix)
      const actualActionItemId = itemId.replace("action_", "");

      // Update the ActionItem status
      const response = await fetch(
        `/api/auditing/action-items/${actualActionItemId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("authTokens")
                ? JSON.parse(localStorage.getItem("authTokens")).access
                : ""
            }`,
          },
          body: JSON.stringify({
            status: action === "Approve" ? "Approved" : "Rejected",
          }),
        }
      );

      if (response.ok) {
        // Update the task status in state
        setTodoItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: action === "Approve" ? "Approved" : "Rejected",
                }
              : item
          )
        );
        console.log(`Risk approval ${action.toLowerCase()}d successfully`);
      } else {
        throw new Error("Failed to update risk approval status");
      }
    } catch (error) {
      console.error("Error handling risk approval:", error);
      alert(`Error ${action.toLowerCase()}ing risk: ${error.message}`);
    }
  };

  const handleAuditorAssign = (itemId, auditorId) => {
    console.log(`Assigning auditor ${auditorId} to item ${itemId}`);
    // Implement auditor assignment logic here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Compliance To-Do Tracker
              </h1>
              <p className="text-gray-600">
                Review, validate, and approve compliance actions across all
                controls, users, risks, controls, evidence, and auditors.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-6 py-3 bg-white text-teal-500 rounded-full shadow hover:bg-teal-500 hover:text-white font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer hover:shadow-xl hover:-translate-y-1">
                <FaDownload className="w-4 h-4" />
                <span>Export Report</span>
              </button>
              <button className="flex items-center space-x-2 px-6 py-3 bg-white text-gray-500 rounded-full shadow hover:bg-gray-500 hover:text-white font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer hover:shadow-xl hover:-translate-y-1">
                <FaBell className="w-4 h-4" />
                <span>Notifications</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="col-span-8 space-y-6">
            {/* Filters and Search */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1" style={{ width: "80%" }}>
                  <FaSearch className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="relative p-1">
                  <div
                    className="absolute top-1 left-1 bg-teal-100 rounded-lg transition-all duration-500 ease-out shadow-sm"
                    style={{
                      width: `${100 / filters.length}%`,
                      height: "calc(100% - 8px)",
                      transform: `translateX(${activeFilterIndex * 100}%)`,
                    }}
                  />
                  <div className="relative flex">
                    {filters.map((filterOption) => (
                      <button
                        key={filterOption.id}
                        onClick={() => handleFilterChange(filterOption.id)}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-500 ease-out relative z-10 ${
                          filter === filterOption.id
                            ? "text-teal-700"
                            : "text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        {filterOption.label} ({filterOption.count})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Todo Items */}
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const statusConf =
                  statusConfig[item.status] || statusConfig.Pending; // Fallback to Pending if status not found
                const priorityConf =
                  priorityConfig[item.priority] || priorityConfig.Medium; // Fallback to Medium if priority not found
                const CategoryIcon = categoryIcons[item.category] || FaTasks; // Fallback to FaTasks if category not found
                const StatusIcon = statusConf.icon;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl border-l-4 ${priorityConf.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200`}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          <div
                            className={`p-3 ${priorityConf.bgColor} rounded-lg`}
                          >
                            <CategoryIcon
                              className={`w-6 h-6 ${priorityConf.textColor}`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {item.title}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs font-medium ${priorityConf.bgColor} ${priorityConf.textColor} rounded-full`}
                              >
                                {item.priority}
                              </span>
                              {/* Source indicator badge */}
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  item.source === "todo"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                {item.source === "todo" ? "Todo" : "ActionItem"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {item.type}
                            </p>
                            <p className="text-gray-700">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${statusConf.bgColor} ${statusConf.textColor}`}
                          >
                            <StatusIcon
                              className={`w-4 h-4 mr-1 ${statusConf.iconColor}`}
                            />
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-500">Assignee:</span>
                          <span className="ml-2 font-medium">
                            {item.assignee}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Due Date:</span>
                          <span className="ml-2 font-medium">
                            {item.dueDate}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Requester:</span>
                          <span className="ml-2 font-medium">
                            {item.requester}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Category:</span>
                          <span className="ml-2 font-medium capitalize">
                            {item.category.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {item.category === "user_approval" ? (
                            // Special display for user approval tasks
                            <>
                              <div>
                                <span className="text-gray-500">
                                  User Name:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.userName}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  User Email:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.userEmail}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">New Role:</span>
                                <span className="ml-2 font-medium">
                                  {item.details.newRole}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Organization:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.newOrganization}
                                </span>
                              </div>
                            </>
                          ) : item.category === "auditor_assignment" ? (
                            // Special display for auditor assignment tasks
                            <>
                              <div>
                                <span className="text-gray-500">
                                  Auditor Name:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.auditorName}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Auditor Email:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.auditorEmail}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Project:</span>
                                <span className="ml-2 font-medium">
                                  {item.details.projectName}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Framework:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.projectFramework}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Organization:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.auditorOrganization}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Department:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.department}
                                </span>
                              </div>
                            </>
                          ) : item.category === "risk_approval" ? (
                            // Special display for risk approval tasks
                            <>
                              <div>
                                <span className="text-gray-500">
                                  Risk Title:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.riskTitle}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Risk Category:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.riskCategory}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Risk Rating:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.riskRating}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Impact:</span>
                                <span className="ml-2 font-medium">
                                  {item.details.impact}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Likelihood:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.likelihood}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Project:</span>
                                <span className="ml-2 font-medium">
                                  {item.details.projectName}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Department:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.department}
                                </span>
                              </div>
                            </>
                          ) : item.category === "evidence_approval" ? (
                            // Special display for evidence approval tasks
                            <>
                              <div>
                                <span className="text-gray-500">
                                  Evidence Name:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.evidence_name}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Project:</span>
                                <span className="ml-2 font-medium">
                                  {item.details.project_name}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Creator:</span>
                                <span className="ml-2 font-medium">
                                  {item.details.creator_name}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  File Name:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.file_name || "No file"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  File Size:
                                </span>
                                <span className="ml-2 font-medium">
                                  {item.details.file_size
                                    ? `${(
                                        item.details.file_size / 1024
                                      ).toFixed(1)} KB`
                                    : "Unknown"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Created:</span>
                                <span className="ml-2 font-medium">
                                  {item.details.created_at
                                    ? new Date(
                                        item.details.created_at
                                      ).toLocaleDateString()
                                    : "Unknown"}
                                </span>
                              </div>
                              {item.details.file_name && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <button
                                    onClick={() => {
                                      // Use file_url if available, otherwise fall back to API endpoint
                                      const fileUrl = item.details.file_url;
                                      if (fileUrl) {
                                        window.open(fileUrl, "_blank");
                                      } else {
                                        const projectId =
                                          item.details.project_id;
                                        const evidenceId =
                                          item.details.evidence_id;
                                        window.open(
                                          `/api/projects/${projectId}/evidence/${evidenceId}/`,
                                          "_blank"
                                        );
                                      }
                                    }}
                                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                  >
                                    <FaEye className="w-3 h-3 mr-1" />
                                    Preview Evidence
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            // Default display for other tasks
                            Object.entries(item.details).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-gray-500 capitalize">
                                  {key.replace(/([A-Z])/g, " $1")}:
                                </span>
                                <span className="ml-2 font-medium">
                                  {value}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {item.category === "auditor_assignment_legacy" ? (
                            // Legacy auditor assignment dropdown (for existing tasks)
                            <div className="relative">
                              <select
                                onChange={(e) =>
                                  handleAuditorAssign(item.id, e.target.value)
                                }
                                className="appearance-none bg-white text-teal-500 px-4 py-2 pr-8 rounded-full shadow hover:bg-teal-500 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold border border-teal-200"
                              >
                                <option value="">Assign Auditor</option>
                                {auditors.map((auditor) => (
                                  <option key={auditor.id} value={auditor.id}>
                                    {auditor.name} - {auditor.specialization}
                                  </option>
                                ))}
                              </select>
                              <FaChevronDown className="absolute right-2 top-3 w-3 h-3 text-white pointer-events-none" />
                            </div>
                          ) : (
                            item.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleAction(item.id, action)}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold ${
                                  action === "Approve" || action === "Approved"
                                    ? "bg-white text-green-500 shadow hover:bg-green-500 hover:text-white"
                                    : action === "Reject"
                                    ? "bg-white text-red-500 shadow hover:bg-red-500 hover:text-white"
                                    : action === "Preview Evidence"
                                    ? "bg-white text-blue-500 shadow hover:bg-blue-500 hover:text-white"
                                    : "bg-white text-gray-500 shadow hover:bg-gray-500 hover:text-white border border-gray-300"
                                }`}
                              >
                                {action}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar - Progress Overview */}
          <div className="col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Progress Overview
              </h3>

              {/* Circular Progress Chart */}
              <div className="text-center mb-6">
                <div className="relative inline-flex items-center justify-center w-40 h-40 mx-auto">
                  <svg
                    className="w-40 h-40 transform -rotate-90"
                    viewBox="0 0 120 120"
                  >
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />

                    {/* Approved segment (Green) */}
                    <circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${approvedPercentage * 2.83} ${283}`}
                      strokeDashoffset="0"
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Pending segment (Yellow) */}
                    <circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${pendingPercentage * 2.83} ${283}`}
                      strokeDashoffset={`-${approvedPercentage * 2.83}`}
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Rejected segment (Red) */}
                    <circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${rejectedPercentage * 2.83} ${283}`}
                      strokeDashoffset={`-${
                        (approvedPercentage + pendingPercentage) * 2.83
                      }`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">
                      {approvedPercentage}%
                    </span>
                    <span className="text-xs text-gray-500">Completed</span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Approved
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {progressData.approved}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Pending
                    </span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {progressData.pending}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Rejected
                    </span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {progressData.rejected}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Total Tasks
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {progressData.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Color Scheme Explanation */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-200 shadow-sm p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:from-green-100 hover:to-teal-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-teal-800">
                  STATUS CONNECTION
                </h3>
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-teal-600">i</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Pending Status */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-teal-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-md cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-teal-800">
                      Pending Tasks
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-teal-700">→</span>
                    <span className="text-sm font-medium text-teal-800">
                      Awaiting Review
                    </span>
                  </div>
                </div>

                {/* Approved Status */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-teal-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-md cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-teal-800">
                      Approved Tasks
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-teal-700">→</span>
                    <span className="text-sm font-medium text-teal-800">
                      Completed
                    </span>
                  </div>
                </div>

                {/* Rejected Status */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-teal-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-md cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-teal-800">
                      Rejected Tasks
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-teal-700">→</span>
                    <span className="text-sm font-medium text-teal-800">
                      Action Required
                    </span>
                  </div>
                </div>
              </div>

              {/* System Actions Explanation */}
              <div className="mt-6 pt-4 border-t border-green-200">
                <h4 className="text-sm font-semibold text-teal-800 mb-3">
                  System Actions
                </h4>
                <div className="space-y-2 text-xs text-teal-700">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>
                      Approved: Updates related entities & logs audit trail
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-red-600 font-bold">✗</span>
                    <span>Rejected: Reverts changes & removes assignments</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-600 font-bold">⏳</span>
                    <span>
                      Pending: Maintains current state until action taken
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Level System */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 shadow-sm p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:from-red-100 hover:to-orange-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-red-800">
                  PRIORITY LEVELS
                </h3>
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-red-600">!</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* High Priority */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-red-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-md cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-red-800">
                      High Priority
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-red-700">→</span>
                    <span className="text-sm font-medium text-red-800">
                      Urgent Action
                    </span>
                  </div>
                </div>

                {/* Medium Priority */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-yellow-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-md cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-red-800">
                      Medium Priority
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-red-700">→</span>
                    <span className="text-sm font-medium text-red-800">
                      Standard Review
                    </span>
                  </div>
                </div>

                {/* Low Priority */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-green-100 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-md cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-red-800">
                      Low Priority
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-red-700">→</span>
                    <span className="text-sm font-medium text-red-800">
                      Routine Task
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority Guidelines */}
              <div className="mt-6 pt-4 border-t border-red-200">
                <h4 className="text-sm font-semibold text-red-800 mb-3">
                  Priority Guidelines
                </h4>
                <div className="space-y-2 text-xs text-red-700">
                  <div className="flex items-start space-x-2">
                    <span className="text-red-600 font-bold">🔴</span>
                    <span>
                      High: Critical security, compliance violations, urgent
                      approvals
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-600 font-bold">🟡</span>
                    <span>
                      Medium: Standard reviews, routine assessments, normal
                      workflows
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">🟢</span>
                    <span>
                      Low: Documentation updates, minor changes, background
                      tasks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceToDoTracker;
