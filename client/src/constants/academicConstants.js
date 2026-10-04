/**
 * academicConstants.js
 * Centralized definition of academic programs, program durations,
 * and valid branch mappings for CampusNode.
 */

export const PROGRAM_OPTIONS = ["BTECH", "MTECH", "MSC", "MBA", "PHD", "OTHER"];

export const PROGRAM_LABELS = {
  BTECH: "B.Tech",
  MTECH: "M.Tech",
  MSC: "M.Sc",
  MBA: "MBA",
  PHD: "Ph.D",
  OTHER: "Other",
};

export const PROGRAM_BRANCH_MAP = {
  BTECH: {
    label: "B.Tech (4 Years)",
    maxDurationYears: 4,
    branches: [
      { code: "AI", label: "Artificial Intelligence (AI)" },
      { code: "BT", label: "Biotechnology (BT)" },
      { code: "CH", label: "Chemical Engineering (CH)" },
      { code: "CE", label: "Civil Engineering (CE)" },
      { code: "CSE", label: "Computer Science & Engineering (CSE)" },
      { code: "DSE", label: "Data Science & Engineering (DSE)" },
      { code: "EE", label: "Electrical Engineering (EE)" },
      { code: "ECE", label: "Electronics & Communication Engineering (ECE)" },
      { code: "VLSI", label: "Electronics & VLSI Engineering (VLSI)" },
      { code: "IPE", label: "Industrial & Production Engineering (IPE)" },
      { code: "IT", label: "Information Technology (IT)" },
      { code: "ICE", label: "Instrumentation & Control Engineering (ICE)" },
      { code: "MNC", label: "Mathematics & Computing (MNC)" },
      { code: "ME", label: "Mechanical Engineering (ME)" },
      { code: "TT", label: "Textile Technology (TT)" },
    ],
  },
  MTECH: {
    label: "M.Tech (2 Years)",
    maxDurationYears: 2,
    branches: [
      { code: "CSE", label: "Computer Science & Engineering" },
      { code: "IT", label: "Information Technology" },
      { code: "MNC", label: "Mathematics & Computing" },
      { code: "VLSI", label: "VLSI Design" },
      { code: "AI", label: "Artificial Intelligence" },
      { code: "ECE", label: "Electronics & Communication Engineering" },
      { code: "EE", label: "Electrical Engineering" },
      { code: "ICE", label: "Instrumentation & Control Engineering" },
      { code: "ME", label: "Mechanical Engineering" },
      { code: "CE", label: "Civil Engineering" },
      { code: "CH", label: "Chemical Engineering" },
      { code: "IPE", label: "Industrial & Production Engineering" },
      { code: "BT", label: "Biotechnology" },
      { code: "TT", label: "Textile Technology" },
      { code: "RE", label: "Renewable Energy" },
    ],
  },
  MSC: {
    label: "M.Sc (2 Years)",
    maxDurationYears: 2,
    branches: [
      { code: "PH", label: "Physics" },
      { code: "CY", label: "Chemistry" },
      { code: "MA", label: "Mathematics" },
    ],
  },
  MBA: {
    label: "MBA (2 Years)",
    maxDurationYears: 2,
    branches: [
      { code: "MB", label: "Management Studies" },
    ],
  },
  PHD: {
    label: "Ph.D (5 Years)",
    maxDurationYears: 5,
    branches: [
      { code: "CSE", label: "Computer Science & Engineering" },
      { code: "IT", label: "Information Technology" },
      { code: "ECE", label: "Electronics & Communication Engineering" },
      { code: "EE", label: "Electrical Engineering" },
      { code: "ICE", label: "Instrumentation & Control Engineering" },
      { code: "ME", label: "Mechanical Engineering" },
      { code: "CE", label: "Civil Engineering" },
      { code: "CH", label: "Chemical Engineering" },
      { code: "IPE", label: "Industrial & Production Engineering" },
      { code: "BT", label: "Biotechnology" },
      { code: "TT", label: "Textile Technology" },
      { code: "PH", label: "Physics" },
      { code: "CY", label: "Chemistry" },
      { code: "MA", label: "Mathematics" },
      { code: "HUM", label: "Humanities & Management" },
    ],
  },
  OTHER: {
    label: "Other Category (Max 5 Years)",
    maxDurationYears: 5,
    branches: [
      { code: "GENERAL", label: "General / Other" },
    ],
  },
};

/**
 * Returns array of branch codes allowed for a given program.
 */
export function getBranchesForProgram(program) {
  if (!program || !PROGRAM_BRANCH_MAP[program]) {
    return [];
  }
  return PROGRAM_BRANCH_MAP[program].branches;
}

/**
 * Validates whether a branch code is allowed for a given program.
 */
export function isValidBranchForProgram(program, branchCode) {
  if (!program || !branchCode) return false;
  const branches = getBranchesForProgram(program);
  const upper = String(branchCode).toUpperCase();
  return branches.some((b) => {
    const code = (typeof b === "string" ? b : b.code).toUpperCase();
    return code === upper;
  });
}

/**
 * Returns maximum allowed program duration in years (e.g. 4 for BTech, 5 for PhD/Other, 2 for MTech/MSc/MBA).
 */
export function getMaxDurationForProgram(program) {
  if (!program || !PROGRAM_BRANCH_MAP[program]) return 5;
  return PROGRAM_BRANCH_MAP[program].maxDurationYears;
}

/**
 * Unique list of all distinct branch codes across all programs (short uppercase names only).
 */
export const ALL_BRANCH_CODES = Array.from(
  new Set(
    Object.values(PROGRAM_BRANCH_MAP).flatMap((p) =>
      p.branches.map((b) => (typeof b === "string" ? b : b.code).toUpperCase())
    )
  )
).sort();

export const BRANCH_FULL_NAMES = {
  AI: "Artificial Intelligence",
  BT: "Biotechnology",
  CH: "Chemical Engineering",
  CE: "Civil Engineering",
  CSE: "Computer Science & Engineering",
  DSE: "Data Science & Engineering",
  EE: "Electrical Engineering",
  ECE: "Electronics & Communication Engineering",
  VLSI: "Electronics & VLSI Engineering",
  IPE: "Industrial & Production Engineering",
  IT: "Information Technology",
  ICE: "Instrumentation & Control Engineering",
  MNC: "Mathematics & Computing",
  ME: "Mechanical Engineering",
  TT: "Textile Technology",
  RE: "Renewable Energy",
  PH: "Physics",
  CY: "Chemistry",
  MA: "Mathematics",
  MB: "Management Studies",
  HUM: "Humanities & Management",
  GENERAL: "General / Other",
};

export function getBranchFullName(code) {
  if (!code) return "";
  const upper = String(code).toUpperCase();
  return BRANCH_FULL_NAMES[upper] || code;
}
