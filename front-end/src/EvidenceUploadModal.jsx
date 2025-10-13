import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaChevronDown, FaCheck } from "react-icons/fa";

export default function EvidenceUploadModal({
  isOpen,
  onClose,
  onUpload,
  availableControls = [],
  control = null,
  subcontrol = null,
}) {
  // State for the form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    file: null,
    mappedControls: [],
  });

  // State for UI elements
  const [dragActive, setDragActive] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Auto-map controls based on current control and subcontrol
  const getAutoMappedControls = () => {
    const autoMapped = [];

    // Add the current control if available
    if (control) {
      console.log("EvidenceUploadModal - Adding control:", control);
      console.log("EvidenceUploadModal - Control ID:", control.id);
      autoMapped.push(control);
    }

    // NOTE: We don't add subcontrols to the clauses field because:
    // 1. Evidence.clauses expects Clause objects, not SubClause objects
    // 2. Subcontrols are already associated with their parent control
    // 3. The subcontrol information is stored in Evidence.sub_clause field separately
    if (subcontrol) {
      console.log(
        "EvidenceUploadModal - Subcontrol detected but not added to clauses:",
        subcontrol
      );
      console.log(
        "EvidenceUploadModal - Subcontrol will be handled via sub_clause field"
      );
    }

    console.log("EvidenceUploadModal - Auto-mapped controls:", autoMapped);
    return autoMapped;
  };

  // Effect to close the dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-map controls when modal opens or control/subcontrol changes
  useEffect(() => {
    if (isOpen) {
      const autoMapped = getAutoMappedControls();
      setFormData((prev) => ({
        ...prev,
        mappedControls: autoMapped,
      }));
    }
  }, [isOpen, control, subcontrol]);

  // Generic handler for text inputs and textareas
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggles the selection of a control in the dropdown
  const toggleControlSelection = (control) => {
    setFormData((prev) => {
      const isSelected = prev.mappedControls.some((c) => c.id === control.id);
      if (isSelected) {
        return {
          ...prev,
          mappedControls: prev.mappedControls.filter(
            (c) => c.id !== control.id
          ),
        };
      } else {
        return { ...prev, mappedControls: [...prev.mappedControls, control] };
      }
    });
  };

  const isControlSelected = (controlId) =>
    formData.mappedControls.some((c) => c.id === controlId);

  // Handlers for file selection and drag-and-drop
  const handleFileSelect = (file) => setFormData((prev) => ({ ...prev, file }));

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Removes a selected control from the list below the dropdown
  const removeControl = (controlId) => {
    setFormData((prev) => ({
      ...prev,
      mappedControls: prev.mappedControls.filter(
        (control) => control.id !== controlId
      ),
    }));
  };

  // Main submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Evidence name is required.");
      return;
    }
    onUpload(formData);
    handleClose();
  };

  // Resets the form and closes the modal
  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      content: "",
      file: null,
      mappedControls: [],
    });
    setIsDropdownOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    // Main modal overlay
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Form now wraps the entire modal content for proper submission */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Updated Header Styling */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            Create Evidence
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="p-6 overflow-y-auto flex-grow min-h-0">
          {/* Evidence Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence Name *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Provide name for the evidence..."
              // Updated input focus styling
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 focus:shadow-xl text-sm"
              required
            />
          </div>

          {/* Description and Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add description"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 focus:shadow-xl text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Add content"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 focus:shadow-xl text-sm resize-none"
              />
            </div>
          </div>

          {/* Auto-Mapped Controls */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto-Mapped Controls
            </label>
            <div className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-md">
              {formData.mappedControls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.mappedControls.map((control) => (
                    <div
                      key={control.id}
                      className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-2 rounded-full"
                    >
                      <span className="font-semibold mr-1">
                        {control.clause_number}
                      </span>
                      <span className="max-w-32 truncate">{control.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500 text-sm">
                  No controls automatically mapped
                </span>
              )}
            </div>

            {/* Show subcontrol information separately */}
            {subcontrol && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Related Subcontrol:
                </div>
                <div className="inline-flex items-center bg-green-100 text-green-800 text-xs px-3 py-2 rounded-full">
                  <span className="font-semibold mr-1">
                    {subcontrol.sub_clause_number}
                  </span>
                  <span className="max-w-32 truncate">{subcontrol.title}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Evidence is automatically mapped to the current control
              {subcontrol &&
                " and will be associated with the specific subcontrol"}
            </p>
          </div>

          {/* Evidence File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors  ${
                dragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {formData.file ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">
                    Selected: {formData.file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, file: null }))
                    }
                    className="text-red-500 hover:text-red-700 text-sm underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-gray-500">
                    Drag & Drop your evidence file here or{" "}
                    <label
                      htmlFor="file-upload"
                      className="text-blue-600 hover:text-blue-700 cursor-pointer underline font-medium"
                    >
                      browse
                    </label>
                  </div>
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileInput}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                  />
                  <div className="text-xs text-gray-400">
                    Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG,
                    PNG, TXT
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
              <span className="font-medium">Note:</span> Only 1 evidence file
              can be attached to each Evidence object.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 p-6 flex-shrink-0">
          <div className="text-sm text-gray-400">Powered by CyberUltron</div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 text-red-400 shadow hover:bg-red-400 hover:text-white rounded-full font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim()}
              className="px-5 py-2 rounded-full disabled:opacity-50 bg-white text-teal-400 font-semibold shadow hover:bg-teal-400 hover:text-white focus:outline-none transition-colors disabled:cursor-not-allowed"
            >
              Create Evidence
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
