import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Badge component - using inline spans
import {
  CheckCircle,
  Users,
  Brain,
  TrendingUp,
  HelpCircle,
} from "lucide-react";
import { usePopper } from "react-popper";

const InfoTooltip = ({ title, info }) => {
  const [show, setShow] = useState(false);
  const iconRef = useRef(null);
  const [popperElement, setPopperElement] = useState(null);
  const { styles, attributes } = usePopper(iconRef.current, popperElement, {
    placement: "bottom",
    modifiers: [
      { name: "offset", options: { offset: [0, 8] } },
      { name: "preventOverflow", options: { boundary: "viewport" } },
      { name: "flip", options: { fallbackPlacements: ["top"] } },
    ],
  });

  // Tooltip content to be rendered in portal
  const tooltipContent = show ? (
    <div
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
      className="z-[9999] w-72 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-xl p-3 shadow-xl border border-gray-700/50"
    >
      <div className="font-medium text-gray-100 mb-1">{title}</div>
      <div className="text-gray-300 leading-relaxed">{info}</div>
      {/* Pointy part (arrow) */}
      <div
        className="absolute w-2 h-2 bg-gray-900/95 border-l border-t border-gray-700/50"
        style={{
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          top: "-5px",
        }}
      ></div>
    </div>
  ) : null;

  return (
    <div className="flex items-center gap-2 relative z-50">
      <span className="text-gray-700 font-medium text-sm">{title}</span>
      <div
        ref={iconRef}
        className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center cursor-help transition-colors duration-200 relative"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
      >
        <HelpCircle
          size={12}
          className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
        />
      </div>
      {typeof window !== "undefined" &&
        createPortal(tooltipContent, document.body)}
    </div>
  );
};

const AssignmentResultModal = ({ isOpen, onClose, assignmentResult }) => {
  if (!assignmentResult) return null;

  const { task, assignment, alternatives = [], reasoning } = assignmentResult;

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return "High Confidence";
    if (confidence >= 0.6) return "Medium Confidence";
    return "Low Confidence";
  };

  const formatPercentage = (value) => Math.round(value * 100);

  const criteriaInfo = {
    skill_match:
      "Measures how well the developer's skills align with the task requirements based on semantic similarity",
    workload_availability:
      "Evaluates the developer's current workload capacity compared to their maximum capacity",
    experience_fit:
      "Assesses how the developer's experience level matches the task's priority and complexity",
    priority_alignment:
      "Determines how well the developer handles tasks of this priority level based on past performance",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            Task Assignment Complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Task Details</h3>
            <p className="text-gray-700 font-medium">{task?.title}</p>
            {task?.description && (
              <p className="text-gray-600 text-sm mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                {task?.priority} priority
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                {task?.estimatedHours}h estimated
              </span>
            </div>
          </div>

          {/* Assignment Result */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users size={16} />
                Assigned Developer
              </h3>
              <span
                className={`px-2 py-1 rounded text-xs ${getConfidenceColor(assignment.confidence)}`}
              >
                {getConfidenceLabel(assignment.confidence)} (
                {formatPercentage(assignment.confidence)}%)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {assignment.userName?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {assignment.userName}
                </p>
                <div className="flex flex-col gap-1">
                  <p className="text-gray-600 text-sm capitalize">
                    {assignment.userRole || "developer"}
                  </p>
                  {assignment.userSkills &&
                    assignment.userSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {assignment.userSkills
                          .slice(0, 3)
                          .map((skill, index) => (
                            <span
                              key={index}
                              className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        {assignment.userSkills.length > 3 && (
                          <span className="text-gray-400 text-xs">
                            +{assignment.userSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Reasoning Breakdown */}
          {reasoning && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-100 p-4 rounded-2xl shadow-sm">
              <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-3 text-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Brain size={16} className="text-white" />
                </div>
                Assignment Reasoning
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50">
                    <div className="flex justify-between items-center">
                      <InfoTooltip
                        title="Skill Match"
                        info={criteriaInfo.skill_match}
                      />
                      <span className="font-semibold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                        {formatPercentage(reasoning.skill_match)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50">
                    <div className="flex justify-between items-center">
                      <InfoTooltip
                        title="Workload Availability"
                        info={criteriaInfo.workload_availability}
                      />
                      <span className="font-semibold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
                        {formatPercentage(reasoning.workload_availability)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50">
                    <div className="flex justify-between items-center">
                      <InfoTooltip
                        title="Experience Fit"
                        info={criteriaInfo.experience_fit}
                      />
                      <span className="font-semibold text-lg bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent tracking-tight">
                        {formatPercentage(reasoning.experience_fit)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50">
                    <div className="flex justify-between items-center">
                      <InfoTooltip
                        title="Priority Alignment"
                        info={criteriaInfo.priority_alignment}
                      />
                      <span className="font-semibold text-lg bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                        {formatPercentage(reasoning.priority_alignment)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alternative Candidates */}
          {alternatives.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp size={16} />
                Alternative Candidates
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {alternatives.slice(0, 3).map((candidate, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center p-3 bg-white rounded border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-xs font-medium">
                          {candidate.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        #{index + 2}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-700 font-medium text-sm block mb-1">
                        {candidate.name}
                      </span>
                      <span className="text-gray-500 text-xs capitalize block mb-2">
                        {candidate.role || "developer"}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {formatPercentage(candidate.confidence_score)}%
                      </span>
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 justify-center">
                          {candidate.skills
                            .slice(0, 2)
                            .map((skill, skillIndex) => (
                              <span
                                key={skillIndex}
                                className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          {candidate.skills.length > 2 && (
                            <span className="text-gray-400 text-xs">
                              +{candidate.skills.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentResultModal;
