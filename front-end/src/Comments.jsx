import React, { useState, useEffect } from "react";
import {
  FaComment,
  FaAt,
  FaClock,
  FaEllipsisV,
  FaShieldAlt,
  FaHeart,
  FaShare,
  FaBookmark,
  FaSearch,
  FaReply,
  FaCommentDots,
  FaClipboard,
  FaPaperPlane,
  FaHashtag,
  FaTimes,
} from "react-icons/fa";
import CommentCreatePanel from "./CommentCreatePanel";

export default function Comments({
  project,
  availableControls = [],
  comments = [],
  loading = false,
  error = null,
  onLoadComments,
  onToggleLike,
  onAddReply,
  teamMembers = [],
  onAddComment,
  control = null, // Add control prop for control-specific comments
  prefilledData = null, // Add prefilled data prop for pre-filled comment data
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all"); // all, mentions, controls
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, mostLiked
  const [replyingTo, setReplyingTo] = useState(null); // Track which comment we're replying to
  const [replyText, setReplyText] = useState(""); // Reply text input
  const [filter, setFilter] = useState("all"); // For status-based filtering (All, Accepted, Pending Review, Requires Action)

  // Load comments from API when component mounts or project changes
  useEffect(() => {
    console.log(
      "🔍 DEBUG: Comments useEffect triggered - project:",
      project?.id,
      "onLoadComments:",
      !!onLoadComments
    );
    console.log("🔍 DEBUG: Comments props:", {
      project,
      comments,
      loading,
      error,
    });
    if (project?.id && onLoadComments) {
      console.log("🔍 DEBUG: Calling onLoadComments for project:", project.id);
      onLoadComments();
    } else {
      console.log(
        "🔍 DEBUG: Not calling onLoadComments - missing project or function"
      );
    }
  }, [project?.id, onLoadComments]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const parseCommentContent = (content) => {
    // Updated regex to match clause numbers like "A.5.1", "C.4", etc.
    const regex = /(\s+|@[A-Za-z\s]+|#[A-Z]\.\d+(?:\.\d+)*)/g;
    return content
      .split(regex)
      .filter(Boolean)
      .map((part, index) => {
        if (part.startsWith("@")) {
          const mentionName = part.slice(1);
          return (
            <span
              key={index}
              className="inline-flex items-center bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md text-sm font-medium hover:bg-teal-200 transition-colors cursor-pointer"
            >
              <FaAt className="w-3 h-3 mr-1" />
              {mentionName}
            </span>
          );
        } else if (part.startsWith("#")) {
          const clauseNumber = part.slice(1);
          const control = availableControls.find(
            (c) => (c.clause_number || c.id) === clauseNumber
          );
          return (
            <span
              key={index}
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium hover:opacity-80 transition-colors cursor-pointer ${
                control?.status === "implemented"
                  ? "bg-green-100 text-green-800"
                  : control?.status === "in-progress"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <FaShieldAlt className="w-3 h-3 mr-1" />
              {clauseNumber}
            </span>
          );
        }
        return part;
      });
  };

  const toggleLike = (commentId, isReply = false, parentId = null) => {
    if (onToggleLike) {
      onToggleLike(commentId, isReply, parentId);
    }
  };

  const handleReply = (commentId) => {
    setReplyingTo(commentId);
  };

  const handleReplySubmit = () => {
    if (replyText.trim() && onAddReply) {
      onAddReply(replyingTo, replyText);
      setReplyText("");
      setReplyingTo(null);
    }
  };

  const handleReplyCancel = () => {
    setReplyText("");
    setReplyingTo(null);
  };

  // Enhanced comment handling for project-specific comments
  const handleAddComment = async ({ content, mentions, controlTags }) => {
    if (!content.trim()) return;

    try {
      // Use the provided onAddComment function if available, otherwise use default logic
      if (onAddComment) {
        await onAddComment({ content, mentions, controlTags });
      } else {
        // Fallback to default comment creation logic for project-specific comments
        console.log("Creating project-specific comment:", {
          content,
          mentions,
          controlTags,
          project: project?.id,
        });

        // If we have a control context, create a comment for that specific control
        if (control && project) {
          console.log(
            "🔍 DEBUG: Creating comment for control:",
            control.id,
            "project:",
            project.id
          );
          console.log("🔍 DEBUG: Comment content:", content);
          console.log(
            "🔍 DEBUG: Auth token:",
            localStorage.getItem("authTokens") ? "Present" : "Missing"
          );

          // Save props data as text instead of processing them
          let fullContent = content;
          if (mentions && mentions.length > 0) {
            fullContent += `\n\nMentions: ${JSON.stringify(mentions)}`;
          }
          if (controlTags && controlTags.length > 0) {
            fullContent += `\n\nControl Tags: ${JSON.stringify(controlTags)}`;
          }

          const requestBody = {
            message: fullContent,
            control: control.id,
            project: project.id,
          };
          console.log("🔍 DEBUG: Request body:", requestBody);

          const response = await fetch(
            `/api/auditing/projects/${project.id}/controls/${control.id}/comments/`,
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
              body: JSON.stringify(requestBody),
            }
          );

          console.log("🔍 DEBUG: Response status:", response.status);
          console.log(
            "🔍 DEBUG: Response headers:",
            Object.fromEntries(response.headers.entries())
          );

          if (response.ok) {
            const responseData = await response.json();
            console.log(
              "🔍 DEBUG: Comment created successfully:",
              responseData
            );
            // Refresh comments if onLoadComments is available
            if (onLoadComments) {
              onLoadComments();
            }
          } else {
            const errorData = await response.text();
            console.error(
              "🔍 DEBUG: Failed to create comment. Status:",
              response.status
            );
            console.error("🔍 DEBUG: Error response:", errorData);
            throw new Error(
              `Failed to create comment: ${response.status} - ${errorData}`
            );
          }
        } else {
          console.log(
            "🔍 DEBUG: No control or project context available for comment creation"
          );
          console.log("🔍 DEBUG: Control:", control);
          console.log("🔍 DEBUG: Project:", project);
        }
      }
    } catch (err) {
      console.error("Failed to create comment:", err);
      alert(`Error creating comment: ${err.message}`);
    }
  };

  // Enhanced filtering with status-based filtering
  console.log("🔍 DEBUG: Comments component - comments data:", comments);
  console.log(
    "🔍 DEBUG: Comments component - comments length:",
    comments.length
  );
  console.log("🔍 DEBUG: Comments component - filter:", filter);
  console.log("🔍 DEBUG: Comments component - searchTerm:", searchTerm);

  const filteredAndSortedComments = comments
    .filter((comment) => {
      console.log("🔍 DEBUG: Filtering comment:", comment);
      console.log("🔍 DEBUG: Comment fields:", {
        id: comment.id,
        message: comment.message,
        author_name: comment.author_name,
        status: comment.status,
        filter: filter,
      });

      // Status-based filtering (from ControlDetailPanel Comments tab)
      if (filter === "accepted") return comment.status === "Accepted";
      if (filter === "pending") return comment.status === "Pending Review";
      if (filter === "requires") return comment.status === "Requires Action";

      // Search term filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesContent = comment.message
          .toLowerCase()
          .includes(searchLower);
        const matchesAuthor = comment.author_name
          .toLowerCase()
          .includes(searchLower);
        const matchesReplies = (comment.replies || []).some(
          (reply) =>
            reply.message.toLowerCase().includes(searchLower) ||
            reply.author_name.toLowerCase().includes(searchLower)
        );
        return matchesContent || matchesAuthor || matchesReplies;
      }

      // Legacy filtering (mentions, controls)
      if (filterBy === "mentions") {
        return (
          (comment.mentions || []).length > 0 ||
          (comment.replies || []).some(
            (reply) => (reply.mentions || []).length > 0
          )
        );
      }
      if (filterBy === "controls") {
        return (
          (comment.controlTags || []).length > 0 ||
          (comment.replies || []).some(
            (reply) => (reply.controlTags || []).length > 0
          )
        );
      }
      console.log("🔍 DEBUG: Comment passed filter:", comment.id);
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === "mostLiked") {
        return (b.likes || 0) - (a.likes || 0);
      }
      return new Date(b.created_at) - new Date(a.created_at); // newest first
    });

  console.log(
    "🔍 DEBUG: Comments component - filteredAndSortedComments:",
    filteredAndSortedComments
  );
  console.log(
    "🔍 DEBUG: Comments component - filteredAndSortedComments length:",
    filteredAndSortedComments.length
  );

  const totalCommentsCount = comments.reduce(
    (total, comment) => total + 1 + (comment.replies || []).length,
    0
  );

  // Status-based filters (from ControlDetailPanel Comments tab)
  const statusFilters = [
    { id: "all", label: "All", count: comments.length },
    {
      id: "accepted",
      label: "Accepted",
      count: comments.filter((c) => c.status === "Accepted").length,
    },
    {
      id: "pending",
      label: "Pending Review",
      count: comments.filter((c) => c.status === "Pending Review").length,
    },
    {
      id: "requires",
      label: "Requires Action",
      count: comments.filter((c) => c.status === "Requires Action").length,
    },
  ];

  const activeStatusIndex = statusFilters.findIndex((f) => f.id === filter);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <FaComment className="text-teal-600 text-lg" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Discussion</h2>
            <p className="text-sm text-gray-500">
              {totalCommentsCount}{" "}
              {totalCommentsCount === 1 ? "comment" : "comments"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search comments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="mentions">With Mentions</option>
            <option value="controls">With Controls</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostLiked">Most Liked</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-2 text-gray-500">Loading comments...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={onLoadComments}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Comment Create Panel - Enhanced from ControlDetailPanel */}
        {teamMembers.length > 0 && availableControls.length > 0 && (
          <CommentCreatePanel
            teamMembers={teamMembers}
            availableControls={availableControls}
            onSubmit={handleAddComment}
            replyingToAuthor={null}
            onCancelReply={() => {}}
            prefilledData={prefilledData}
          />
        )}

        {/* Status-based Filter Bar - Enhanced from ControlDetailPanel */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="relative p-1">
            <div
              className="absolute top-1 left-1 bg-teal-100 rounded-lg transition-all duration-500 ease-out shadow-sm"
              style={{
                width: `${100 / statusFilters.length}%`,
                height: "calc(100% - 8px)",
                transform: `translateX(${activeStatusIndex * 100}%)`,
              }}
            />
            <div className="relative flex">
              {statusFilters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-500 ease-out relative z-10 ${
                    filter === f.id
                      ? "text-teal-700"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>
        </div>
        {!loading &&
          filteredAndSortedComments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-semibold text-sm">
                      {comment.author_name
                        ? comment.author_name.substring(0, 2).toUpperCase()
                        : "U"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-800">
                        {comment.author_name || "Unknown User"}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        User
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <FaClock className="mr-1" />
                      {formatTimestamp(comment.created_at)}
                    </div>
                  </div>
                </div>

                {/* Status Badge and Actions - Enhanced from ControlDetailPanel */}
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-teal-100 text-teal-800">
                    {comment.status || "Active"}
                  </span>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                    <FaBookmark className="text-sm" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                    <FaShare className="text-sm" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                    <FaEllipsisV className="text-sm" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-gray-700 leading-relaxed text-base">
                  {parseCommentContent(comment.message)}
                </div>

                {/* Action Buttons - Enhanced from ControlDetailPanel */}
                <div className="flex space-x-4 mt-4">
                  {(comment.actions || []).includes("Attach Evidence") && (
                    <button className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all duration-300 ease-out">
                      <FaClipboard className="w-4 h-4" />
                      <span>Attach Evidence</span>
                    </button>
                  )}
                  {(comment.actions || []).includes("Mark Resolved") && (
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 ease-out">
                      Mark Resolved
                    </button>
                  )}
                  {(comment.actions || []).includes("Reply") && (
                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 ease-out">
                      <FaReply className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => toggleLike(comment.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      comment.isLiked
                        ? "text-red-600 bg-red-50 hover:bg-red-100"
                        : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                    }`}
                  >
                    <FaHeart
                      className={`text-sm ${
                        comment.isLiked ? "fill-current" : ""
                      }`}
                    />
                    <span className="font-medium">{comment.likes || 0}</span>
                  </button>
                  <button
                    onClick={() => handleReply(comment.id)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <FaReply className="text-sm" />
                    <span className="font-medium">Reply</span>
                  </button>
                </div>

                {(comment.replies || []).length > 0 && (
                  <span className="text-sm text-gray-500 font-medium">
                    {(comment.replies || []).length}{" "}
                    {(comment.replies || []).length === 1 ? "reply" : "replies"}
                  </span>
                )}
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      U
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full p-3 border border-teal-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        rows="3"
                      />
                      <div className="flex items-center justify-end space-x-3 mt-3">
                        <button
                          onClick={handleReplyCancel}
                          className="px-4 py-2 bg-white text-red-400 rounded-full shadow hover:bg-red-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleReplySubmit}
                          disabled={!replyText.trim()}
                          className="px-4 py-2 bg-white text-teal-400 rounded-full shadow hover:bg-teal-400 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(comment.replies || []).length > 0 && (
                <div className="mt-6 space-y-4 border-l-2 border-teal-100 pl-6 ml-5">
                  {(comment.replies || []).map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {reply.author_name
                              ? reply.author_name.substring(0, 2).toUpperCase()
                              : "U"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm text-gray-800">
                              {reply.author_name || "Unknown User"}
                            </span>
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                              User
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <FaClock className="mr-1" />
                            {formatTimestamp(reply.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {parseCommentContent(reply.message)}
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleLike(reply.id, true, comment.id)}
                          className={`flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors ${
                            reply.isLiked
                              ? "text-red-600 bg-red-100"
                              : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                          }`}
                        >
                          <FaHeart
                            className={reply.isLiked ? "fill-current" : ""}
                          />
                          <span>{reply.likes || 0}</span>
                        </button>
                        <button
                          onClick={() => handleReply(comment.id)}
                          className="flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <FaReply className="text-xs" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      {filteredAndSortedComments.length === 0 && (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <div className="text-center">
            <FaCommentDots className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm || filter !== "all"
                ? "No comments found"
                : "No Comments"}
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm || filter !== "all"
                ? "Try adjusting your search terms or filters to find what you're looking for."
                : "Be the first to start the discussion."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
