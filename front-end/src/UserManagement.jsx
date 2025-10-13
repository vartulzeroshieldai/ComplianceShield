// src/UserManagement.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaKey,
  FaTimes,
  FaFilter,
  FaUserShield,
  FaUserTimes,
  FaUserCog,
  FaUserSlash,
  FaChevronDown,
} from "react-icons/fa";

export default function UserManagement() {
  console.log("🔍 UserManagement component starting to render...");
  
  const { user, fetchWithAuth } = useAuth();
  console.log("🔍 UserManagement - Auth context:", { user: !!user, fetchWithAuth: !!fetchWithAuth });
  
  // Safety check for authentication
  if (!user || !fetchWithAuth) {
    console.log("🔍 UserManagement - Authentication check failed");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded shadow-lg max-w-md">
          <h3 className="font-bold mb-2">Authentication Required</h3>
          <p className="text-sm">Please log in to access User Management.</p>
        </div>
      </div>
    );
  }
  
  console.log("🔍 UserManagement - Authentication check passed, proceeding with component...");
  
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]); // Kept for modal dropdown
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const isCreatingTasksRef = useRef(false);
  const [processedUsers, setProcessedUsers] = useState(new Set());
  const [formUser, setFormUser] = useState({
    id: null,
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "",
    organization: "",
    status: "active",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [componentError, setComponentError] = useState(null);
  const isAdmin = user && user.role === "Admin";

  useEffect(() => {
    console.log("🔍 UserManagement - useEffect triggered");
    
    if (!fetchWithAuth) {
      console.error("🔍 UserManagement - fetchWithAuth is not available");
      setError("Authentication not available");
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      console.log("🔍 UserManagement - fetchData function called");
      setIsLoading(true);
      setError(null);

      try {
        console.log("🔍 UserManagement - Starting to fetch data...");
        
        const [usersResponse, rolesResponse, orgsResponse] = await Promise.all([
          fetchWithAuth("/api/accounts/users/"),
          fetchWithAuth("/api/accounts/roles/"),
          fetchWithAuth("/api/accounts/organizations/"),
        ]);

        console.log("🔍 UserManagement - API responses:", {
          users: usersResponse.status,
          roles: rolesResponse.status,
          orgs: orgsResponse.status
        });

        if (!usersResponse.ok) {
          const errorText = await usersResponse.text();
          throw new Error(`Failed to fetch users: ${usersResponse.status} - ${errorText}`);
        }
        if (!rolesResponse.ok) {
          const errorText = await rolesResponse.text();
          throw new Error(`Failed to fetch roles: ${rolesResponse.status} - ${errorText}`);
        }
        if (!orgsResponse.ok) {
          const errorText = await orgsResponse.text();
          throw new Error(`Failed to fetch organizations: ${orgsResponse.status} - ${errorText}`);
        }

        const usersData = await usersResponse.json();
        const rolesData = await rolesResponse.json();
        const orgsData = await orgsResponse.json();

        console.log("🔍 UserManagement - Data fetched successfully:", {
          users: usersData.length,
          roles: rolesData.length,
          orgs: orgsData.length
        });

        // Validate and sanitize user data
        console.log("🔍 UserManagement - Validating data structure...");
        const validatedUsers = usersData.map((user, index) => {
          if (!user.id) {
            console.error(`User at index ${index} missing ID:`, user);
            user.id = `temp_${index}`;
          }
          if (!user.status) {
            console.warn(`User ${user.id} missing status, setting default:`, user);
            user.status = 'unknown';
          }
          if (!user.first_name) {
            user.first_name = '';
          }
          if (!user.last_name) {
            user.last_name = '';
          }
          if (!user.email) {
            user.email = 'no-email@example.com';
          }
          if (!user.username) {
            user.username = `user_${user.id}`;
          }
          return user;
        });
        
        setUsers(validatedUsers);
        setRoles(rolesData);
        setOrganizations(orgsData);
      } catch (err) {
        console.error("🔍 UserManagement - Error fetching data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [fetchWithAuth]);

  // Create approval tasks for existing pending users (auto-triggered)
  const createApprovalTasksForPendingUsers = useCallback(async () => {
    // Prevent multiple simultaneous executions
    if (isCreatingTasksRef.current) {
      console.log("Task creation already in progress, skipping...");
      return;
    }

    isCreatingTasksRef.current = true;

    try {
      // First, check existing tasks to avoid duplicates
      const existingTasksResponse = await fetchWithAuth("/api/auditing/todos/");
      let existingTasks = [];
      if (existingTasksResponse.ok) {
        existingTasks = await existingTasksResponse.json();
      }

      const pendingUsers = users.filter((u) => u.status === "pending_approval");
      let tasksCreated = 0;

      for (const user of pendingUsers) {
        // Check if we've already processed this user in this session
        if (processedUsers.has(user.id)) {
          console.log(
            `User ${user.username} already processed in this session, skipping...`
          );
          continue;
        }

        // Check if task already exists for this user
        const existingTask = existingTasks.find(
          (task) =>
            task.category === "user_approval" &&
            task.details?.userId === user.id &&
            (task.status === "Pending" ||
              task.status === "Approved" ||
              task.status === "Rejected")
        );

        if (existingTask) {
          console.log(
            `Approval task already exists for user: ${user.username} (Status: ${existingTask.status})`
          );
          // Mark as processed even if task exists
          setProcessedUsers((prev) => new Set([...prev, user.id]));
          continue;
        }

        const roleName = user.role?.name || "No Role";
        const orgName = user.organization?.name || "No Organization";

        const taskData = {
          title: `User Role/Organization Assignment Approval`,
          type: "User Management",
          description: `Approve role assignment (${roleName}) and organization (${orgName}) for user ${user.first_name} ${user.last_name}`,
          priority: "High",
          status: "Pending",
          category: "user_approval",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 7 days from now in YYYY-MM-DD format
          details: {
            userId: user.id,
            userName: `${user.first_name} ${user.last_name}`,
            userEmail: user.email,
            newRole: roleName,
            newOrganization: orgName,
            department: "User Management",
          },
        };

        // Create the task via API
        const response = await fetchWithAuth("/api/auditing/todos/", {
          method: "POST",
          body: JSON.stringify(taskData),
        });

        if (response.ok) {
          console.log(`Approval task created for user: ${user.username}`);
          tasksCreated++;
          // Mark user as processed
          setProcessedUsers((prev) => new Set([...prev, user.id]));
        } else {
          console.error(`Failed to create task for user: ${user.username}`);
        }
      }

      if (tasksCreated > 0) {
        console.log(
          `Auto-created ${tasksCreated} approval tasks for pending users`
        );
      }
    } catch (error) {
      console.error(
        "Failed to create approval tasks for pending users:",
        error
      );
    } finally {
      isCreatingTasksRef.current = false;
    }
  }, [users, fetchWithAuth, processedUsers]);

  // Auto-create approval tasks for pending users when data is loaded
  useEffect(() => {
    if (users.length > 0 && isAdmin) {
      const pendingUsers = users.filter((u) => u.status === "pending_approval");
      if (pendingUsers.length > 0) {
        // Check if tasks already exist to avoid duplicates
        createApprovalTasksForPendingUsers();
      }
    }
  }, [users, isAdmin, createApprovalTasksForPendingUsers]);

  // Reset processed users when component unmounts or when users change significantly
  useEffect(() => {
    return () => {
      // Cleanup: reset processed users when component unmounts
      setProcessedUsers(new Set());
    };
  }, []);

  // Clean up processed users when their status changes (no longer pending approval)
  useEffect(() => {
    setProcessedUsers((prev) => {
      const newProcessedUsers = new Set();
      prev.forEach((userId) => {
        const user = users.find((u) => u.id === userId);
        if (user && user.status === "pending_approval") {
          newProcessedUsers.add(userId);
        }
      });
      return newProcessedUsers;
    });
  }, [users]);

  // The rest of the component logic remains the same
  // ... (filteredUsers, pagination, handlers, etc.)
  const filteredUsers = users.filter((u) => {
    const searchString =
      `${u.first_name} ${u.last_name} ${u.email} ${u.username}`.toLowerCase();
    const matchesSearch = searchString.includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    const matchesRole =
      roleFilter === "all" || (u.role && u.role.id.toString() === roleFilter);

    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, roleFilter]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(currentUsers.map((u) => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectOne = (e, id) => {
    const updated = new Set(selectedIds);
    if (e.target.checked) updated.add(id);
    else updated.delete(id);
    setSelectedIds(updated);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormUser({
      id: null,
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      role: "",
      organization: "",
      status: "pending_approval",
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user.id);
    setFormUser({
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role ? user.role.id : "",
      // Use the organization ID for the form field
      organization: user.organization ? user.organization.id : "",
      status: user.status,
    });
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    const url = editingUser
      ? `/api/accounts/users/${editingUser}/`
      : "/api/accounts/users/";

    const method = editingUser ? "PATCH" : "POST";
    const payload = { ...formUser };

    // For new users, ensure they start with pending approval status
    if (!editingUser) {
      if (!payload.password) {
        alert("Password is required for new users.");
        return;
      }
      payload.status = "pending_approval";
    }

    try {
      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      // If this is a role/organization assignment for an existing user, create approval task
      if (editingUser && (payload.role || payload.organization)) {
        await createUserApprovalTask(editingUser, payload);
      }

      // Re-fetch all users to get the latest data
      const usersResponse = await fetchWithAuth("/api/accounts/users/");
      const usersData = await usersResponse.json();
      setUsers(usersData);
      setShowModal(false);
    } catch (err) {
      alert(`Error saving user: ${err.message}`);
    }
  };

  // Create approval task in Compliance To-Do Tracker
  const createUserApprovalTask = async (userId, userData) => {
    try {
      const user = users.find((u) => u.id === userId);
      const roleName =
        roles.find((r) => r.id.toString() === userData.role)?.name ||
        user.role?.name;
      const orgName =
        organizations.find((o) => o.id.toString() === userData.organization)
          ?.name || user.organization?.name;

      const taskData = {
        title: `User Role/Organization Assignment Approval`,
        type: "User Management",
        description: `Approve role assignment (${roleName}) and organization (${orgName}) for user ${user.first_name} ${user.last_name}`,
        priority: "High",
        status: "Pending",
        category: "user_approval",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 7 days from now in YYYY-MM-DD format
        details: {
          userId: userId,
          userName: `${user.first_name} ${user.last_name}`,
          userEmail: user.email,
          newRole: roleName,
          newOrganization: orgName,
          department: "User Management",
        },
      };

      // Create the task via API
      const response = await fetchWithAuth("/api/auditing/todos/", {
        method: "POST",
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        console.log("User approval task created successfully");
      }
    } catch (error) {
      console.error("Failed to create user approval task:", error);
    }
  };

  const handleDelete = async (user) => {
    // Prevent deletion of pending approval users
    if (user.status === "pending_approval") {
      alert(
        "Cannot delete users with pending approval status. Please approve or reject them first."
      );
      return;
    }

    if (window.confirm(`Delete user ${user.username}?`)) {
      try {
        const response = await fetchWithAuth(
          `/api/accounts/users/${user.id}/`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) throw new Error("Failed to delete user.");
        setUsers(users.filter((u) => u.id !== user.id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleBulkDelete = async () => {
    // Check if any selected users have pending approval status
    const selectedUsers = users.filter((u) => selectedIds.has(u.id));
    const pendingUsers = selectedUsers.filter(
      (u) => u.status === "pending_approval"
    );

    if (pendingUsers.length > 0) {
      alert(
        `Cannot delete ${pendingUsers.length} user(s) with pending approval status. Please approve or reject them first.`
      );
      return;
    }

    if (
      selectedIds.size > 0 &&
      window.confirm(`Delete ${selectedIds.size} selected user(s)?`)
    ) {
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetchWithAuth(`/api/accounts/users/${id}/`, {
          method: "DELETE",
        })
      );
      try {
        await Promise.all(deletePromises);
        setUsers(users.filter((u) => !selectedIds.has(u.id)));
        setSelectedIds(new Set());
      } catch (err) {
        alert("An error occurred during bulk delete.");
      }
    }
  };
  const getUserInitials = (firstName, lastName) => {
    return (firstName?.charAt(0) || "") + (lastName?.charAt(0) || "");
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-gray-500",
    ];
    
    // Handle empty or null names
    if (!name || name.length === 0) {
      return colors[0]; // Default to first color
    }
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  console.log("🔍 UserManagement - Render state:", { isLoading, error: !!error, componentError: !!componentError });
  
  if (isLoading) {
    console.log("🔍 UserManagement - Rendering loading state");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading User Management...</p>
        </div>
      </div>
    );
  }
    
  if (error) {
    console.log("🔍 UserManagement - Rendering error state:", error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded shadow-lg max-w-md">
          <h3 className="font-bold mb-2">Error Loading User Management</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (componentError) {
    console.log("🔍 UserManagement - Rendering component error state:", componentError);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded shadow-lg max-w-md">
          <h3 className="font-bold mb-2">Component Error</h3>
          <p className="text-sm">{componentError}</p>
          <button 
            onClick={() => setComponentError(null)} 
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  console.log("🔍 UserManagement - Rendering main component");
  return (
    <div className="w-full h-full bg-gradient-to-br from-teal-50 via-white to-indigo-50 min-h-screen">
      {/* Header and Filters remain the same */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            User Management
          </h1>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <>
                <button
                  onClick={openCreateModal}
                  className="flex items-center space-x-2 px-6 py-3 bg-white rounded-full text-teal-400 text-base font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  <FaPlus size={12} />
                  <span>Add User</span>
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-white text-red-400 rounded-full hover:bg-red-400 hover:text-white shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span>Delete Selected</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-500" size={14} />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2">
              <FaUserShield className="text-gray-400" size={14} />
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none border border-gray-300 rounded-lg px-4 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 shadow-sm bg-white cursor-pointer min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="active">🟢 Active</option>
                  <option value="pending_approval">🟡 Pending Approval</option>
                  <option value="disabled">🔴 Disabled</option>
                </select>
                <FaChevronDown
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={12}
                />
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2">
              <FaUserCog className="text-gray-400" size={14} />
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none border border-gray-300 rounded-lg px-4 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 shadow-sm bg-white cursor-pointer min-w-[140px]"
                >
                  <option value="all">All Roles</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id.toString()}>
                      {role.name === "Admin"
                        ? "👑"
                        : role.name === "Contributor"
                        ? "👤"
                        : "🔍"}{" "}
                      {role.name}
                    </option>
                  ))}
                </select>
                <FaChevronDown
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={12}
                />
              </div>
            </div>
          </div>
          <div className="flex-1 max-w-md ml-auto">
            <div className="relative">
              <FaSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm bg-white"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-6 mt-6 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                {isAdmin && (
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        currentUsers.length > 0 &&
                        selectedIds.size === currentUsers.length &&
                        currentUsers.every((u) => selectedIds.has(u.id))
                      }
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0 transition-colors duration-200 transform hover:scale-110"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Login
                </th>
                {isAdmin && (
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentUsers.map((userRow, index) => {
                // Safety check for userRow
                if (!userRow) {
                  console.error(`UserRow at index ${index} is null/undefined`);
                  return null;
                }
                return (
                <tr
                  key={userRow.id}
                  className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200 group"
                >
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(userRow.id)}
                        onChange={(e) => toggleSelectOne(e, userRow.id)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0 transition-all duration-200 transform hover:scale-110"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className={`flex-shrink-0 h-10 w-10 rounded-full ${getAvatarColor(
                          (userRow.first_name || '') + (userRow.last_name || '')
                        )} flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200 transform group-hover:scale-105`}
                      >
                        <span className="text-sm font-semibold text-white">
                          {getUserInitials(
                            userRow.first_name,
                            userRow.last_name
                          )}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-teal-600 transition-colors duration-200">
                          {userRow.first_name} {userRow.last_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {userRow.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                        userRow.role?.name === "Admin"
                          ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 "
                          : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300"
                      }`}
                    >
                      {userRow.role?.name === "Admin"
                        ? "👑"
                        : userRow.role?.name === "Contributor"
                        ? "👤"
                        : "🔍"}{" "}
                      {userRow.role ? userRow.role.name : "No Role"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-3 h-3 bg-gray-400 rounded-full mr-3 shadow-sm"></div>
                      {/* --- THE FIX IS HERE: Access the nested name property --- */}
                      {userRow.organization ? userRow.organization.name : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border ${
                        userRow.status === "active"
                          ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300"
                          : userRow.status === "pending_approval"
                          ? "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300"
                          : "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          userRow.status === "active"
                            ? "bg-green-500 shadow-sm"
                            : userRow.status === "pending_approval"
                            ? "bg-yellow-500 shadow-sm animate-pulse"
                            : "bg-red-500 shadow-sm"
                        }`}
                      ></div>
                      {userRow.status === "pending_approval"
                        ? "Pending Approval"
                        : (userRow.status || 'unknown').charAt(0).toUpperCase() +
                          (userRow.status || 'unknown').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {userRow.last_login ? (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(userRow.last_login).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(userRow.last_login).toLocaleTimeString()}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <FaUserSlash className="text-blue-500 mr-2" size={14} />
                        <span className="text-blue-600 text-xs font-medium">
                          Never Logged In
                        </span>
                      </div>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(userRow)}
                          disabled={userRow.status === "pending_approval"}
                          className={`p-2 rounded-lg transition-all duration-200 transform shadow-sm hover:shadow-md ${
                            userRow.status === "pending_approval"
                              ? "text-gray-400 cursor-not-allowed opacity-50"
                              : "text-blue-600 hover:text-blue-800 hover:bg-blue-50 hover:scale-110 active:scale-95"
                          }`}
                          title={
                            userRow.status === "pending_approval"
                              ? "Cannot edit pending approval users"
                              : "Edit User"
                          }
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(userRow)}
                          disabled={userRow.status === "pending_approval"}
                          className={`p-2 rounded-lg transition-all duration-200 transform shadow-sm hover:shadow-md ${
                            userRow.status === "pending_approval"
                              ? "text-gray-400 cursor-not-allowed opacity-50"
                              : "text-red-600 hover:text-red-800 hover:bg-red-50 hover:scale-110 active:scale-95"
                          }`}
                          title={
                            userRow.status === "pending_approval"
                              ? "Cannot delete pending approval users"
                              : "Delete User"
                          }
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-16 bg-gradient-to-b from-gray-50 to-white">
            <div className="text-gray-500 text-xl font-medium mb-2">
              No users found
            </div>
            <p className="text-gray-400 text-sm">
              {search || statusFilter !== "all" || roleFilter !== "all"
                ? "Try adjusting your filters or search terms"
                : "Get started by adding your first user"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination and Modal JSX... */}
      {filteredUsers.length > 0 && (
        <div className="bg-white px-6 py-4 mx-6 mt-2 border-t border-gray-200 rounded-b-xl shadow-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="font-medium">
              Showing {indexOfFirstUser + 1} to{" "}
              {Math.min(indexOfLastUser, filteredUsers.length)} of{" "}
              {filteredUsers.length} users
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-white"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      currentPage === pageNumber
                        ? "bg-teal-400 text-white shadow-md"
                        : "border border-gray-300 hover:bg-gray-50 hover:shadow-md transform hover:scale-105 active:scale-95"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all duration-300 animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingUser ? "Edit User" : "Create User"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 transform hover:scale-110 active:scale-95"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-96 overflow-y-auto">
              <input
                type="text"
                value={formUser.first_name}
                onChange={(e) =>
                  setFormUser({ ...formUser, first_name: e.target.value })
                }
                placeholder="First Name"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
              />
              <input
                type="text"
                value={formUser.last_name}
                onChange={(e) =>
                  setFormUser({ ...formUser, last_name: e.target.value })
                }
                placeholder="Last Name"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
              />
              <input
                type="email"
                value={formUser.email}
                onChange={(e) =>
                  setFormUser({ ...formUser, email: e.target.value })
                }
                placeholder="Email"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
              />
              <input
                type="text"
                value={formUser.username}
                onChange={(e) =>
                  setFormUser({ ...formUser, username: e.target.value })
                }
                placeholder="Username"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
              />
              {!editingUser && (
                <input
                  type="password"
                  onChange={(e) =>
                    setFormUser({ ...formUser, password: e.target.value })
                  }
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              )}
              <div className="relative">
                <select
                  value={formUser.role}
                  onChange={(e) =>
                    setFormUser({ ...formUser, role: e.target.value })
                  }
                  className="appearance-none w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name === "Admin"
                        ? "👑"
                        : role.name === "Contributor"
                        ? "👤"
                        : "🔍"}{" "}
                      {role.name}
                    </option>
                  ))}
                </select>
                <FaChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={14}
                />
              </div>
              <div className="relative">
                <select
                  value={formUser.organization}
                  onChange={(e) =>
                    setFormUser({ ...formUser, organization: e.target.value })
                  }
                  className="appearance-none w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <FaChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={14}
                />
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-6 py-3 bg-white text-teal-400 font-semibold rounded-full shadow hover:bg-teal-400 hover:text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {editingUser ? "Update User" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for animations */}
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
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
