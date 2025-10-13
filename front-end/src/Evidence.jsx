// src/components/Projects/Evidence.jsx

import React, { useState, useEffect, useMemo } from "react";
import {
  FaSearch,
  FaEye,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
} from "react-icons/fa";
import EvidenceDetailedView from "./EvidenceDetailedView";

export default function Evidence({
  project,
  evidenceData = [],
  controlsData = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [evidenceSubcontrolMapping, setEvidenceSubcontrolMapping] = useState(
    new Map()
  );

  // Debug logging (only log when data changes)
  useEffect(() => {
    console.log("Evidence.jsx - Props updated:", {
      project: project?.id,
      evidenceDataLength: evidenceData.length,
      controlsDataLength: controlsData.length,
    });
  }, [project?.id, evidenceData.length, controlsData.length]);

  // Load evidence mapping from localStorage when component mounts
  useEffect(() => {
    if (project?.id && controlsData.length > 0) {
      // Load mapping for each control
      const allMappings = new Map();
      controlsData.forEach((control) => {
        try {
          const mappingKey = `evidenceMapping_${project.id}_${control.id}`;
          const stored = localStorage.getItem(mappingKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            const loadedMap = new Map(parsed);
            // Merge all mappings
            loadedMap.forEach((value, key) => {
              allMappings.set(key, value);
            });
          }
        } catch (error) {
          console.warn(
            `Failed to load evidence mapping for control ${control.id}:`,
            error
          );
        }
      });

      if (allMappings.size > 0) {
        setEvidenceSubcontrolMapping(allMappings);
        console.log(
          "Evidence.jsx - Loaded evidence mapping from localStorage:",
          {
            mappingSize: allMappings.size,
            mappings: Array.from(allMappings.entries()),
          }
        );
      }
    }
  }, [project?.id, controlsData]);

  // Debug when evidenceData changes
  useEffect(() => {
    console.log(
      "Evidence.jsx - evidenceData changed, length:",
      evidenceData.length
    );

    // Debug evidence subcontrol mapping
    if (evidenceData.length > 0) {
      console.log(
        "Evidence.jsx - Evidence subcontrol mapping debug:",
        evidenceData.map((ev) => ({
          id: ev.id,
          title: ev.evidence_name,
          sub_clause: ev.sub_clause,
          sub_clause_type: typeof ev.sub_clause,
          clauses: ev.clauses,
          // Show full evidence object for debugging
          fullEvidence: ev,
        }))
      );
    }
  }, [evidenceData]); // Watch the entire array for changes

  // Handle opening detailed view
  const handleViewDetails = (evidence) => {
    setSelectedEvidence(evidence);
    setShowDetailModal(true);
  };

  // Process evidence data for display (depends on evidenceSubcontrolMapping)
  const processedEvidenceData = useMemo(() => {
    return evidenceData.map((item) => {
      // console.log("Evidence.jsx - Processing evidence item:", item); // Commented out to reduce console spam

      // Find the full control objects from the controlsData using the IDs from the evidence item
      const mappedControlObjects = controlsData.filter((control) =>
        (item.clauses || []).includes(control.id)
      );

      // Create mapped controls display with subcontrol information
      const mappedControlsDisplay = mappedControlObjects.map((control) => {
        // Check if this evidence was created for a specific subcontrol
        // Handle different possible data structures for sub_clause
        const specificSubcontrol = item.sub_clause;
        let hasSpecificSubcontrol = false;
        let specificSubcontrolNumber = null;

        if (specificSubcontrol) {
          // If sub_clause is a number (direct subcontrol ID)
          if (typeof specificSubcontrol === "number") {
            // Check if this control has subcontrols
            if (control.sub_clauses && control.sub_clauses.length > 0) {
              hasSpecificSubcontrol = true;
              // Find the subcontrol number from the control's sub_clauses
              const subcontrol = control.sub_clauses?.find(
                (sub) => sub.id === specificSubcontrol
              );
              specificSubcontrolNumber =
                subcontrol?.sub_clause_number || `Sub-${specificSubcontrol}`;

              // Debug logging for hierarchical display
              console.log(
                `Evidence.jsx - Found subcontrol mapping (number format):`,
                {
                  evidenceId: item.id,
                  evidenceTitle: item.evidence_name,
                  controlId: control.id,
                  controlNumber: control.clause_number,
                  subcontrolId: specificSubcontrol,
                  subcontrolNumber: specificSubcontrolNumber,
                  hasSpecificSubcontrol: true,
                  subcontrolFound: !!subcontrol,
                  subcontrolData: subcontrol,
                }
              );
            } else {
              // Control has no subcontrols - this is control-level evidence
              hasSpecificSubcontrol = false;
              console.log(
                `Evidence.jsx - Control-level evidence (no subcontrols):`,
                {
                  evidenceId: item.id,
                  evidenceTitle: item.evidence_name,
                  controlId: control.id,
                  controlNumber: control.clause_number,
                  sub_clause: specificSubcontrol,
                  hasSpecificSubcontrol: false,
                  reason: "Control has no subcontrols",
                }
              );
            }
          }
          // If sub_clause is an object with clause and sub_clause_number
          else if (
            specificSubcontrol.clause &&
            control.id === specificSubcontrol.clause
          ) {
            hasSpecificSubcontrol = true;
            specificSubcontrolNumber = specificSubcontrol.sub_clause_number;

            // Debug logging for hierarchical display
            console.log(
              `Evidence.jsx - Found subcontrol mapping (object format):`,
              {
                evidenceId: item.id,
                evidenceTitle: item.evidence_name,
                controlId: control.id,
                controlNumber: control.clause_number,
                subcontrolId: specificSubcontrol.clause,
                subcontrolNumber: specificSubcontrolNumber,
                hasSpecificSubcontrol: true,
              }
            );
          }
          // If sub_clause is an object with just sub_clause_number
          else if (specificSubcontrol.sub_clause_number) {
            hasSpecificSubcontrol = true;
            specificSubcontrolNumber = specificSubcontrol.sub_clause_number;

            // Debug logging for hierarchical display
            console.log(
              `Evidence.jsx - Found subcontrol mapping (sub_clause_number format):`,
              {
                evidenceId: item.id,
                evidenceTitle: item.evidence_name,
                controlId: control.id,
                controlNumber: control.clause_number,
                subcontrolNumber: specificSubcontrolNumber,
                hasSpecificSubcontrol: true,
              }
            );
          }
        } else {
          // If sub_clause is undefined, try to use localStorage mapping
          if (evidenceSubcontrolMapping.has(item.id)) {
            const mappedSubcontrolId = evidenceSubcontrolMapping.get(item.id);

            // Check if this control has subcontrols
            if (control.sub_clauses && control.sub_clauses.length > 0) {
              // Find the subcontrol in the current control's sub_clauses
              const subcontrol = control.sub_clauses?.find(
                (sub) => sub.id === mappedSubcontrolId
              );

              if (subcontrol) {
                hasSpecificSubcontrol = true;
                specificSubcontrolNumber = subcontrol.sub_clause_number;

                // Debug logging for localStorage mapping
                console.log(
                  `Evidence.jsx - Found subcontrol mapping (localStorage):`,
                  {
                    evidenceId: item.id,
                    evidenceTitle: item.evidence_name,
                    controlId: control.id,
                    controlNumber: control.clause_number,
                    subcontrolId: mappedSubcontrolId,
                    subcontrolNumber: specificSubcontrolNumber,
                    hasSpecificSubcontrol: true,
                    source: "localStorage",
                  }
                );
              }
            } else {
              // Control has no subcontrols - this is control-level evidence
              hasSpecificSubcontrol = false;
              console.log(
                `Evidence.jsx - Control-level evidence (localStorage, no subcontrols):`,
                {
                  evidenceId: item.id,
                  evidenceTitle: item.evidence_name,
                  controlId: control.id,
                  controlNumber: control.clause_number,
                  mappedSubcontrolId: mappedSubcontrolId,
                  hasSpecificSubcontrol: false,
                  source: "localStorage",
                  reason: "Control has no subcontrols",
                }
              );
            }
          }
        }

        // Debug logging when no subcontrol mapping is found (reduced verbosity)
        if (
          !hasSpecificSubcontrol &&
          control.sub_clauses &&
          control.sub_clauses.length > 0
        ) {
          console.log(
            `Evidence.jsx - No subcontrol mapping found for evidence ${item.id} and control ${control.id} (${control.clause_number})`
          );
        }

        return {
          clause_number: control.clause_number,
          title: control.title,
          hasSpecificSubcontrol: hasSpecificSubcontrol,
          specificSubcontrolNumber: specificSubcontrolNumber,
        };
      });

      return {
        id: item.id,
        title: item.evidence_name,
        files: item.file ? "Available" : "Missing",
        statusIcon: item.file ? (
          <FaCheckCircle className="text-green-600" />
        ) : (
          <FaTimesCircle className="text-red-600" />
        ),
        statusColor: item.file
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800",
        // Enhanced mapped controls with subcontrol information
        mappedControls: mappedControlsDisplay,
        // Count total subcontrols across all mapped controls
        // If control has no subcontrols, count as 1 (control-level)
        subcontrols: mappedControlObjects.reduce((acc, control) => {
          const subcontrolCount = control.sub_clauses?.length || 0;
          return acc + (subcontrolCount > 0 ? subcontrolCount : 1);
        }, 0),
        // Include all the detailed information for the detailed view
        evidence_name: item.evidence_name,
        description: item.description,
        evidence_content: item.evidence_content,
        file: item.file,
        // Include approval status information
        approval_status: item.approval_status || "pending",
        approved_by_name: item.approved_by_name,
        approved_at: item.approved_at,
        approval_notes: item.approval_notes,
        file_name: item.file_name,
        file_size: item.file_size,
        file_url: item.file_url,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_by: item.created_by,
        creator_name: item.creator_name,
        // Include subcontrol information
        sub_clause: item.sub_clause,
        sub_clause_number: item.sub_clause_number,
      };
    });
  }, [evidenceData, controlsData, evidenceSubcontrolMapping]);

  const filtered = processedEvidenceData.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Project Evidence ({filtered.length})
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-3 pr-10 py-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
          />
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-5 w-12">View</th>
              <th className="px-6 py-5">Evidence Title</th>
              <th className="px-6 py-5">Files</th>
              <th className="px-6 py-5">Mapped Controls</th>
              <th className="px-6 py-5 text-right">Subcontrols</th>
              <th className="px-6 py-5">Approval Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => (
              <tr
                key={e.id}
                className={`${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-gray-100`}
              >
                <td className="flex items-center space-x-2 px-6 py-5">
                  <button
                    onClick={() => handleViewDetails(e)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="View Details"
                  >
                    <FaEye className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                  </button>
                </td>
                <td className="px-6 py-5 text-sm text-gray-900">{e.title}</td>
                <td className="px-6 py-5">
                  <span
                    className={`inline-flex items-center space-x-2 px-2 py-1 text-xs font-medium rounded ${e.statusColor}`}
                  >
                    {e.statusIcon}
                    <span>{e.files}</span>
                  </span>
                </td>
                <td className="px-6 py-5 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {e.mappedControls.length > 0 ? (
                      e.mappedControls.map((control, index) => (
                        <div key={index} className="flex flex-col gap-1">
                          {/* Show control and subcontrol in a hierarchical way */}
                          <div className="flex items-center gap-1">
                            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                              {control.clause_number}
                            </span>
                            {control.hasSpecificSubcontrol && (
                              <>
                                <span className="text-xs text-gray-400">→</span>
                                <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                  {control.specificSubcontrolNumber}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No Controls</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-gray-900 text-right">
                  {e.subcontrols}
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                      e.approval_status === "approved"
                        ? "bg-green-100 text-green-800"
                        : e.approval_status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {e.approval_status === "approved"
                      ? "Approved"
                      : e.approval_status === "rejected"
                      ? "Rejected"
                      : "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No evidence found for this project.
          </div>
        )}
      </div>

      <EvidenceDetailedView
        evidence={selectedEvidence}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEvidence(null);
        }}
        project={project}
      />
    </div>
  );
}
