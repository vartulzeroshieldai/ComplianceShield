import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FaAt,
  FaPaperPlane,
  FaShieldAlt,
  FaHashtag,
  FaTimes, // Added for the cancel button
  FaReply,
} from "react-icons/fa";

export default function CommentCreatePanel({
  teamMembers,
  availableControls,
  onSubmit,
  replyingToAuthor,
  onCancelReply,
  prefilledData = null,
}) {
  const [newComment, setNewComment] = useState("");
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [showControlsList, setShowControlsList] = useState(false);

  const textareaRef = useRef(null);
  const mentionDropdownRef = useRef(null);
  const controlDropdownRef = useRef(null);

  // Handle prefilled data
  useEffect(() => {
    if (prefilledData && prefilledData.hashtags) {
      setNewComment(prefilledData.hashtags + " ");
      // Focus the textarea after setting the prefilled text
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Move cursor to end of text
        const length = prefilledData.hashtags.length + 1;
        textareaRef.current.setSelectionRange(length, length);
      }
    }
  }, [prefilledData]);

  const getDropdownPosition = useCallback((textarea, triggerIndex) => {
    if (!textarea) return { top: 0, left: 0 };

    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseInt(style.lineHeight) || 20;
    const fontSize = parseInt(style.fontSize) || 14;

    // Calculate approximate character position
    const text = textarea.value.substring(0, triggerIndex);
    const lines = text.split("\n");
    const currentLine = lines.length - 1;
    const charsInCurrentLine = lines[currentLine].length;

    // Approximate character width
    const charWidth = fontSize * 0.6;

    const top = rect.top + currentLine * lineHeight + lineHeight + 5;
    const left = rect.left + charsInCurrentLine * charWidth;

    return { top, left };
  }, []);

  const handleTextChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setNewComment(value);

    const textBeforeCursor = value.slice(0, cursorPos);

    // Check for @ mention
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    const hashMatch = textBeforeCursor.match(/#([\w-]*)$/); // Allow hyphens in control IDs

    if (atMatch) {
      const atIndex = textBeforeCursor.lastIndexOf("@");
      setShowMentionsList(true);
      setShowControlsList(false);

      setTimeout(() => {
        const position = getDropdownPosition(e.target, atIndex);
        if (mentionDropdownRef.current) {
          mentionDropdownRef.current.style.top = `${position.top}px`;
          mentionDropdownRef.current.style.left = `${position.left}px`;
        }
      }, 0);
    } else if (hashMatch) {
      const hashIndex = textBeforeCursor.lastIndexOf("#");
      setShowControlsList(true);
      setShowMentionsList(false);

      setTimeout(() => {
        const position = getDropdownPosition(e.target, hashIndex);
        if (controlDropdownRef.current) {
          controlDropdownRef.current.style.top = `${position.top}px`;
          controlDropdownRef.current.style.left = `${position.left}px`;
        }
      }, 0);
    } else {
      setShowMentionsList(false);
      setShowControlsList(false);
    }
  };

  const insertMention = (member) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Get the current cursor position from the textarea
    const currentCursorPos = textarea.selectionStart;
    const textBefore = newComment.slice(0, currentCursorPos);
    const textAfter = newComment.slice(currentCursorPos);
    const atIndex = textBefore.lastIndexOf("@");

    const newText =
      textBefore.slice(0, atIndex) + `@${member.name} ` + textAfter;
    setNewComment(newText);
    setShowMentionsList(false);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = atIndex + member.name.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertControlTag = (control) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Get the current cursor position from the textarea
    const currentCursorPos = textarea.selectionStart;
    const textBefore = newComment.slice(0, currentCursorPos);
    const textAfter = newComment.slice(currentCursorPos);
    const hashIndex = textBefore.lastIndexOf("#");

    const newText =
      textBefore.slice(0, hashIndex) +
      `#${control.clause_number || control.id} ` +
      textAfter;
    setNewComment(newText);
    setShowControlsList(false);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos =
        hashIndex + (control.clause_number || control.id).length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    // Extract mentions and control tags
    const mentionMatches = [...newComment.matchAll(/@([\w\s]+?)(?=\s|@|#|$)/g)];
    // Updated regex to match clause numbers like "A.5.1", "C.4", etc.
    const controlMatches = newComment.match(/#([A-Z]\.\d+(?:\.\d+)*)/g) || [];

    const mentions = mentionMatches
      .map((match) => match[1].trim())
      .filter((name) => teamMembers.some((member) => member.name === name));

    const controlTags = controlMatches
      .map((tag) => tag.slice(1))
      .filter((clauseNumber) =>
        availableControls.some(
          (ctrl) => (ctrl.clause_number || ctrl.id) === clauseNumber
        )
      );

    onSubmit({
      content: newComment,
      mentions,
      controlTags,
    });

    setNewComment("");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(event.target)
      ) {
        setShowMentionsList(false);
      }
      if (
        controlDropdownRef.current &&
        !controlDropdownRef.current.contains(event.target)
      ) {
        setShowControlsList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mb-8">
      <div className="bg-teal-50 rounded-xl p-6 border border-teal-200">
        {replyingToAuthor && (
          <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-teal-200">
            <FaReply className="text-teal-600" />
            <span className="text-sm font-medium text-teal-800">
              Replying to {replyingToAuthor}
            </span>
            <button
              onClick={onCancelReply}
              className="ml-auto text-teal-500 hover:text-teal-700 p-1 rounded-full hover:bg-teal-100"
            >
              <FaTimes />
            </button>
          </div>
        )}
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-semibold text-sm">CU</span>
          </div>
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleTextChange}
                placeholder="Share your thoughts... Use @ to mention team and # to reference controls"
                className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 shadow-sm"
                rows="4"
              />

              {showMentionsList && (
                <div
                  ref={mentionDropdownRef}
                  className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto min-w-64"
                >
                  <div className="p-2 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Mention Team Member
                    </p>
                  </div>
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="px-4 py-3 hover:bg-teal-50 cursor-pointer flex items-center space-x-3 transition-colors"
                      onClick={() => insertMention(member)}
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {member.avatar}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800 truncate">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.role} • {member.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showControlsList && (
                <div
                  ref={controlDropdownRef}
                  className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto min-w-72"
                >
                  <div className="p-2 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Reference Control
                    </p>
                  </div>
                  {availableControls.map((control) => (
                    <div
                      key={control.id}
                      className="px-4 py-3 hover:bg-green-50 cursor-pointer flex items-center space-x-3 transition-colors"
                      onClick={() => insertControlTag(control)}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          control.status === "implemented"
                            ? "bg-green-500"
                            : control.status === "in-progress"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                        }`}
                      >
                        <FaShieldAlt className="text-white text-xs" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800">
                          {control.clause_number || control.id}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {control.title || control.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {control.framework_name || control.category}
                        </div>
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          control.status === "implemented"
                            ? "bg-green-100 text-green-800"
                            : control.status === "in-progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {control.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <FaAt className="text-teal-500" />
                  <span>Mention users</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaHashtag className="text-teal-500" />
                  <span>Tag controls</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSubmit}
                  disabled={!newComment.trim()}
                  className="flex items-center space-x-2 px-6 py-3 bg-white text-teal-400 rounded-full shadow hover:bg-teal-400 hover:text-white font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <FaPaperPlane className="text-sm" />
                  <span>{replyingToAuthor ? "Reply" : "Post Comment"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
