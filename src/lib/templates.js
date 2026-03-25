// Shared template phase/section data used by seeding, execution, and AI features.
// The Templates page has its own display-level data (icons, colors, descriptions)
// but uses these phases for the actual structure.

export const TEMPLATE_PHASES = {
  dmaic: [
    {
      name: 'Define',
      sections: [
        'Project Charter', 'Problem Statement', 'Goal Statement', 'SIPOC Diagram',
        'Voice of Customer (VOC)', 'Project Scope', 'Business Case',
        'Team & Stakeholders', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Measure',
      sections: [
        'Data Collection Plan', 'Process Map (Detailed)',
        'Measurement System Analysis (MSA/Gage R&R)',
        'Baseline Performance (Cpk, Sigma Level)',
        'Process Capability Study', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Analyze',
      sections: [
        'Fishbone / Ishikawa Diagram', '5-Why Analysis', 'Hypothesis Testing',
        'Root Cause Validation', 'Pareto Analysis', 'Regression / ANOVA', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Improve',
      sections: [
        'Solution Generation (Brainstorming)', 'Solution Selection Matrix',
        'Failure Mode & Effects Analysis (FMEA)', 'Pilot Plan & Results',
        'Cost-Benefit Analysis', 'Implementation Plan', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Control',
      sections: [
        'Control Plan', 'Statistical Process Control (SPC) Setup',
        'Standard Operating Procedures (SOPs)', 'Training Plan',
        'Response Plan', 'Handover to Process Owner',
        'Project Closure & Lessons Learned',
      ],
    },
  ],

  dmadv: [
    {
      name: 'Define',
      sections: ['Project Charter', 'CTQ Requirements', 'Customer Segmentation', 'Business Case', 'Team Charter'],
    },
    {
      name: 'Measure',
      sections: ['Customer Requirements (VOC)', 'CTQ Translation Tree', 'Competitive Benchmarking', 'QFD / House of Quality'],
    },
    {
      name: 'Analyze',
      sections: ['Gap Analysis', 'Design Concepts', 'Concept Selection (Pugh Matrix)', 'Risk Assessment'],
    },
    {
      name: 'Design',
      sections: ['Detailed Design', 'Simulation & Modeling', 'Prototype Plan', 'FMEA for New Design', 'Pilot Plan'],
    },
    {
      name: 'Verify',
      sections: ['Pilot Results', 'Capability Verification', 'Production Readiness', 'Handover & Close'],
    },
  ],

  kaizen: [
    {
      name: 'Pre-Event (Week -2)',
      sections: ['Scope Definition', 'Team Selection', 'Data Collection (Pre-work)', 'Current State Documentation', 'Logistics Planning'],
    },
    {
      name: 'Day 1: Understand',
      sections: ['Event Kick-off', 'Current State Process Walk (Gemba)', 'Waste Identification', 'Current State VSM', 'Root Cause Analysis'],
    },
    {
      name: 'Day 2-3: Improve',
      sections: ['Future State Design', 'Solution Implementation', 'Standard Work Development', '5S Implementation', 'Visual Management'],
    },
    {
      name: 'Day 4-5: Sustain',
      sections: ['Pilot Validation', 'Training Delivery', 'Before/After Metrics', 'Action Item List (30/60/90 day)', 'Event Report-out'],
    },
    {
      name: 'Post-Event (30-Day)',
      sections: ['30-Day Follow-up Audit', 'Results Verification', 'Sustain Plan', 'Lessons Learned'],
    },
  ],

  lean: [
    {
      name: 'Current State',
      sections: ['Value Stream Selection', 'Current State VSM', 'Lead Time & Process Time Analysis', 'Value-Added vs Non-Value-Added Analysis', 'Waste Identification (8 Wastes)'],
    },
    {
      name: 'Future State',
      sections: ['Future State VSM Design', 'Takt Time Calculation', 'Pull System Design', 'Supermarket / Kanban Design', 'Improvement Opportunities'],
    },
    {
      name: 'Implementation',
      sections: ['Kaizen Burst Actions', 'Pilot Implementation', 'Lead Time Measurement', 'Flow Metrics (Cycle Time, WIP)', 'Visual Management'],
    },
    {
      name: 'Sustain',
      sections: ['Standard Work Documentation', 'KPI Dashboard', 'Audit Schedule', 'Management Review Cadence', 'Lessons Learned'],
    },
  ],

  general: [
    {
      name: 'Initiate',
      sections: ['Project Charter', 'Stakeholder Identification', 'Scope Definition', 'Initial Risk Assessment'],
    },
    {
      name: 'Plan',
      sections: ['Project Plan', 'Resource Plan', 'Risk Management Plan', 'Communication Plan'],
    },
    {
      name: 'Execute',
      sections: ['Task Execution', 'Status Reporting', 'Issue Management', 'Change Management'],
    },
    {
      name: 'Close',
      sections: ['Final Deliverable Review', 'Lessons Learned', 'Project Closure Report', 'Handover Documentation'],
    },
  ],
}

/**
 * Returns the phases array for a given project type.
 * Checks localStorage for company-level template overrides first.
 */
export function getTemplatePhasesForType(projectType, companyId) {
  const type = projectType?.toLowerCase()
  if (companyId) {
    const overrideKey = `template_override_${type}_${companyId}`
    const override = localStorage.getItem(overrideKey)
    if (override) {
      try { return JSON.parse(override) } catch {}
    }
  }
  return TEMPLATE_PHASES[type] || TEMPLATE_PHASES.general
}

/**
 * Returns just the phase names for a project type (used in Execution page layout).
 */
export function getPhaseNamesForType(projectType, companyId) {
  return getTemplatePhasesForType(projectType, companyId).map(p => p.name)
}
